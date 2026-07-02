import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeJson, AiNotConfiguredError } from "@/lib/ai/clients";
import { assistantPrompts } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await request.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const built = assistantPrompts.extractDecisionMakers(text);
    const result = await completeJson<{ decision_makers: { name: string; title: string; relevance: string }[] }>(built);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 501 });
    console.error(err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
