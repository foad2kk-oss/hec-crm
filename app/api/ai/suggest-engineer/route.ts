import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeJson, AiNotConfiguredError, AiQuotaExceededError } from "@/lib/ai/clients";
import { assistantPrompts } from "@/lib/ai/prompts";
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

  const { data: engineers } = await supabase.from("profiles").select("id, full_name, department");

  try {
    const built = assistantPrompts.suggestEngineer(client as Client, engineers ?? []);
    const result = await completeJson<{ engineer_id: string; reason: string }>(built);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 501 });
    if (err instanceof AiQuotaExceededError) return NextResponse.json({ error: err.message }, { status: 429 });
    console.error(err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
