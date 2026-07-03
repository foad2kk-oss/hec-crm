import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeText, AiNotConfiguredError, AiQuotaExceededError } from "@/lib/ai/clients";
import { assistantPrompts } from "@/lib/ai/prompts";
import type { Client } from "@/types/database";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, name, title, lang } = (await request.json()) as {
    clientId: string;
    name: string;
    title: string;
    lang?: "ar" | "en";
  };

  if (!clientId || !name) {
    return NextResponse.json({ error: "clientId and name are required" }, { status: 400 });
  }

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  try {
    const built = assistantPrompts.draftOutreachToPerson(client as Client, { name, title: title || "-" }, lang === "en" ? "en" : "ar");
    const text = await completeText({ system: built.system, prompt: built.prompt });
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 501 });
    if (err instanceof AiQuotaExceededError) return NextResponse.json({ error: err.message }, { status: 429 });
    console.error(err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
