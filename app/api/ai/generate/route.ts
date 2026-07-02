import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeText } from "@/lib/ai/clients";
import { AiNotConfiguredError } from "@/lib/ai/clients";
import { assistantPrompts } from "@/lib/ai/prompts";
import type { Client } from "@/types/database";

type ActionType =
  | "summarize"
  | "meeting_prep"
  | "email_ar"
  | "email_en"
  | "proposal"
  | "follow_up"
  | "next_action";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, clientId, purpose } = (await request.json()) as {
    type: ActionType;
    clientId: string;
    purpose?: string;
  };

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const c = client as Client;
  let built: { system: string; prompt: string };

  switch (type) {
    case "summarize":
      built = assistantPrompts.summarizeCompany(c);
      break;
    case "meeting_prep":
      built = assistantPrompts.meetingPrep(c);
      break;
    case "email_ar":
      built = assistantPrompts.draftEmail(c, "ar", purpose || "متابعة عامة");
      break;
    case "email_en":
      built = assistantPrompts.draftEmail(c, "en", purpose || "general follow-up");
      break;
    case "proposal":
      built = assistantPrompts.proposalDraft(c);
      break;
    case "follow_up":
      built = assistantPrompts.followUpEmail(c);
      break;
    case "next_action":
      built = assistantPrompts.suggestNextAction(c);
      break;
    default:
      return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
  }

  try {
    const text = await completeText({ system: built.system, prompt: built.prompt });
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
