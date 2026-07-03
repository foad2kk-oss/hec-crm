import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { runFullDiscoverySweep } from "@/lib/ai/discovery-agent";
import { AiNotConfiguredError, AiQuotaExceededError } from "@/lib/ai/clients";

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[؀-ۿ\s]*شركة|مصنع|مؤسسة/g, "")
    .replace(/\b(co|company|inc|llc|ltd|factory|co\.)\b/g, "")
    .replace(/[^a-z0-9؀-ۿ]/g, "")
    .trim();
}

/**
 * Triggered manually from the Discovery Feed UI ("Run discovery now"), or on a schedule
 * via a Supabase Edge Function / pg_cron hitting this route with the CRON_SECRET header.
 * Requires OPENAI_API_KEY (web_search tool) to be configured.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  const supabase = createServiceRoleClient();

  if (!isCron) {
    // manual trigger from the UI still requires a logged-in session
    const { createClient } = await import("@/lib/supabase/server");
    const sessionClient = createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sweep = await runFullDiscoverySweep();
    const { data: existing } = await supabase
      .from("discovered_leads")
      .select("company")
      .order("created_at", { ascending: false })
      .limit(500);
    const { data: existingClients } = await supabase.from("clients").select("company_name");

    const knownNames = new Set([
      ...(existing ?? []).map((r: { company: string }) => normalizeName(r.company)),
      ...(existingClients ?? []).map((r: { company_name: string }) => normalizeName(r.company_name)),
    ]);

    let inserted = 0;
    for (const { query, leads } of sweep) {
      for (const lead of leads) {
        const key = normalizeName(lead.company);
        if (!key || knownNames.has(key)) continue;
        knownNames.add(key);

        await supabase.from("discovered_leads").insert({
          company: lead.company,
          project: lead.project,
          location: lead.location,
          source_link: lead.source_link,
          estimated_project_size: lead.estimated_project_size,
          industry: lead.industry,
          investment_value: lead.investment_value,
          confidence_score: lead.confidence_score,
          ai_summary: lead.ai_summary,
          suggested_action: lead.suggested_action,
          search_query: query,
          raw_result: lead,
        });
        inserted++;
      }
    }

    return NextResponse.json({ ok: true, queriesRun: sweep.length, leadsInserted: inserted });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    if (err instanceof AiQuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error(err);
    return NextResponse.json({ error: "Discovery sweep failed" }, { status: 500 });
  }
}
