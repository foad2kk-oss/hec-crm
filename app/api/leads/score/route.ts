import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreClient } from "@/lib/ai/scoring";
import { AiNotConfiguredError, AiQuotaExceededError } from "@/lib/ai/clients";

export async function POST(request: Request) {
  const { clientId } = await request.json();
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client, error: fetchError } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (fetchError || !client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  try {
    const result = await scoreClient(client);

    await supabase.from("lead_scores").insert({
      client_id: clientId,
      score: result.score,
      priority: result.priority,
      factors: result.factors,
      recommended_action: result.recommended_action,
      model: process.env.AI_PROVIDER === "anthropic" ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL,
    });

    await supabase
      .from("clients")
      .update({
        lead_score: result.score,
        priority: result.priority,
        probability: Math.min(100, Math.round((result.score / 100) * 100)),
      })
      .eq("id", clientId);

    await supabase.from("activity_log").insert({
      entity_type: "client",
      entity_id: clientId,
      action: "scored",
      actor_id: user.id,
      meta: { score: result.score, priority: result.priority },
    });

    if (result.priority === "hot" && client.priority !== "hot" && client.assigned_engineer_id) {
      await supabase.from("notifications").insert({
        user_id: client.assigned_engineer_id,
        type: "hot_lead",
        title: "عميل ساخن جديد 🔥",
        body: `${client.company_name} — ${result.recommended_action}`,
        link: `/clients/${clientId}`,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    if (err instanceof AiQuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error(err);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
