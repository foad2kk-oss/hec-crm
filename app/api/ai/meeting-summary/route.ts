import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeText, AiNotConfiguredError, AiQuotaExceededError } from "@/lib/ai/clients";
import { assistantPrompts } from "@/lib/ai/prompts";
import type { Meeting } from "@/types/database";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meetingId, notes } = await request.json();
  const { data: meeting } = await supabase.from("meetings").select("*").eq("id", meetingId).single();
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  try {
    const built = assistantPrompts.meetingSummary(meeting as Meeting, notes || meeting.agenda || "");
    const text = await completeText({ system: built.system, prompt: built.prompt });
    await supabase.from("meetings").update({ minutes: text }).eq("id", meetingId);
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 501 });
    if (err instanceof AiQuotaExceededError) return NextResponse.json({ error: err.message }, { status: 429 });
    console.error(err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
