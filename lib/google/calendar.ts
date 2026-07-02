import { google } from "googleapis";
import { getGoogleClientForUser } from "./tokens";
import type { Meeting } from "@/types/database";

export async function syncMeetingToGoogleCalendar(userId: string, meeting: Meeting) {
  const auth = await getGoogleClientForUser(userId);
  if (!auth) return null; // Google not connected — caller should skip silently

  const calendar = google.calendar({ version: "v3", auth });
  const event = {
    summary: meeting.title,
    location: meeting.location ?? undefined,
    description: meeting.agenda ?? undefined,
    start: { dateTime: meeting.starts_at },
    end: { dateTime: meeting.ends_at },
    attendees: meeting.attendees?.map((a) => ({ email: a.email, displayName: a.name })).filter((a) => a.email),
  };

  if (meeting.google_event_id) {
    const res = await calendar.events.update({
      calendarId: "primary",
      eventId: meeting.google_event_id,
      requestBody: event,
    });
    return res.data.id ?? null;
  }

  const res = await calendar.events.insert({ calendarId: "primary", requestBody: event });
  return res.data.id ?? null;
}

export async function deleteMeetingFromGoogleCalendar(userId: string, googleEventId: string) {
  const auth = await getGoogleClientForUser(userId);
  if (!auth) return;
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({ calendarId: "primary", eventId: googleEventId }).catch(() => {});
}
