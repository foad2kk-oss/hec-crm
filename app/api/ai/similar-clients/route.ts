import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeJson, AiNotConfiguredError, AiQuotaExceededError } from "@/lib/ai/clients";
import type { Client } from "@/types/database";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await request.json();
  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const c = client as Client;
  const { data: candidates } = await supabase
    .from("clients")
    .select("id, company_name, industry, city, factory_type, estimated_budget, current_stage")
    .neq("id", clientId)
    .or([c.industry && `industry.eq.${c.industry}`, c.city && `city.eq.${c.city}`].filter(Boolean).join(","))
    .limit(15);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ similar: [] });
  }

  try {
    const result = await completeJson<{ similar: { id: string; company_name: string; reason: string }[] }>({
      system:
        "You rank which of these candidate clients are most similar to the target client and explain why in one short Arabic sentence each. Respond with strict JSON: { similar: [{id, company_name, reason}] }. Return at most 5, most similar first.",
      prompt: `Target client:\n${JSON.stringify(
        { industry: c.industry, city: c.city, factory_type: c.factory_type, estimated_budget: c.estimated_budget },
        null,
        2
      )}\n\nCandidates:\n${JSON.stringify(candidates, null, 2)}`,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiNotConfiguredError || err instanceof AiQuotaExceededError) {
      // graceful fallback: return raw candidates without AI ranking/reasons
      return NextResponse.json({
        similar: candidates.slice(0, 5).map((cand) => ({ id: cand.id, company_name: cand.company_name, reason: "" })),
      });
    }
    console.error(err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
