import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendGmail } from "@/lib/google/gmail";

/**
 * Daily morning briefing (Module 11): for every engineer, gathers today's meetings,
 * due/overdue follow-ups, and recently-found hot leads assigned to them — creates an
 * in-app notification for each, and emails a summary if they've connected Gmail.
 * Triggered by a Supabase Edge Function on a schedule (see supabase/functions/daily-briefing).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const { data: profiles } = await supabase.from("profiles").select("*");
  let emailsSent = 0;
  let notificationsCreated = 0;

  for (const profile of profiles ?? []) {
    const { data: meetings } = await supabase
      .from("meetings")
      .select("title, starts_at, client:clients(company_name)")
      .eq("assigned_engineer_id", profile.id)
      .gte("starts_at", startOfDay.toISOString())
      .lt("starts_at", endOfDay.toISOString());

    const { data: followups } = await supabase
      .from("clients")
      .select("company_name, next_followup")
      .eq("assigned_engineer_id", profile.id)
      .lte("next_followup", endOfDay.toISOString());

    const { data: hotLeads } = await supabase
      .from("clients")
      .select("company_name")
      .eq("assigned_engineer_id", profile.id)
      .eq("priority", "hot")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const items = [
      ...(meetings ?? []).map((m) => `📅 ${m.title} (${new Date(m.starts_at).toLocaleTimeString()})`),
      ...(followups ?? []).map((f) => `🔔 متابعة: ${f.company_name}`),
      ...(hotLeads ?? []).map((h) => `🔥 عميل ساخن جديد: ${h.company_name}`),
    ];

    if (items.length === 0) continue;

    await supabase.from("notifications").insert({
      user_id: profile.id,
      type: "system",
      title: "ملخص الصباح",
      body: items.join(" · "),
      link: "/dashboard",
    });
    notificationsCreated++;

    if (profile.google_connected) {
      const html = `<h3>صباح الخير، ${profile.full_name}</h3><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
      const sent = await sendGmail(profile.id, profile.email, "ملخص الصباح — HEC CRM", html).catch(() => false);
      if (sent) emailsSent++;
    }
  }

  return NextResponse.json({ ok: true, notificationsCreated, emailsSent });
}
