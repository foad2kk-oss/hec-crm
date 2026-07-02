import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeJson, AiNotConfiguredError } from "@/lib/ai/clients";

export interface AiSearchFilters {
  industry: string | null;
  city: string | null;
  factory_type: string | null;
  min_budget: number | null;
  min_area: number | null;
  stage: string | null;
  lead_source: string | null;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await request.json();
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  let filters: AiSearchFilters;
  try {
    filters = await completeJson<AiSearchFilters>({
      system:
        "You translate natural-language searches (Arabic or English) over an industrial-leads CRM into a structured filter object. Respond with strict JSON: { industry, city, factory_type, min_budget, min_area, stage, lead_source } — use null for any field not mentioned. `stage` must be one of: new_lead, qualified, contacted, meeting_scheduled, proposal_requested, proposal_sent, negotiation, won, lost, delayed (or null).",
      prompt: `Query: "${query}"`,
      maxTokens: 300,
    });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 501 });
    console.error(err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }

  let q = supabase.from("clients").select("*");
  if (filters.industry) q = q.ilike("industry", `%${filters.industry}%`);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.factory_type) q = q.ilike("factory_type", `%${filters.factory_type}%`);
  if (filters.min_budget) q = q.gte("estimated_budget", filters.min_budget);
  if (filters.min_area) q = q.gte("estimated_area", filters.min_area);
  if (filters.stage) q = q.eq("current_stage", filters.stage);
  if (filters.lead_source) q = q.ilike("lead_source", `%${filters.lead_source}%`);

  const { data, error } = await q.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ filters, results: data });
}
