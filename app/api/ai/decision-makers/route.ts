import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeJson, AiNotConfiguredError } from "@/lib/ai/clients";
import { assistantPrompts } from "@/lib/ai/prompts";
import { searchDecisionMakersOnline } from "@/lib/ai/decision-makers";
import type { Client } from "@/types/database";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, clientId } = (await request.json()) as { text?: string; clientId?: string };

  try {
    // Mode 1: automatic web search for a saved client (no manual paste needed)
    if (clientId) {
      const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
      if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
      const decision_makers = await searchDecisionMakersOnline(client as Client);
      return NextResponse.json({ decision_makers });
    }

    // Mode 2: extract from manually pasted text (LinkedIn snippet, company page, etc.)
    if (text && typeof text === "string" && text.trim()) {
      const built = assistantPrompts.extractDecisionMakers(text);
      const result = await completeJson<{ decision_makers: { name: string; title: string; relevance: string }[] }>(built);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "clientId or text is required" }, { status: 400 });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 501 });
    console.error(err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
