import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncMeetingToGoogleCalendar } from "@/lib/google/calendar";
import type { Meeting } from "@/types/database";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meetingId } = await request.json();
  const { data: meeting } = await supabase.from("meetings").select("*").eq("id", meetingId).single();
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const googleEventId = await syncMeetingToGoogleCalendar(user.id, meeting as Meeting);
  if (!googleEventId) {
    return NextResponse.json(
      { error: "Google Calendar not connected. Sign in with Google to enable sync." },
      { status: 501 }
    );
  }

  await supabase.from("meetings").update({ google_event_id: googleEventId }).eq("id", meetingId);
  return NextResponse.json({ ok: true, googleEventId });
}
