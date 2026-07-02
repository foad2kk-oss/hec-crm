"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Meeting, MeetingActionItem } from "@/types/database";

export function useMeetings() {
  const supabase = createClient();
  const { data, isLoading, mutate } = useSWR<Meeting[]>("meetings", async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*, client:clients(id, company_name)")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Meeting[];
  });
  return { meetings: data ?? [], isLoading, mutate };
}

export function useMeeting(id: string | undefined) {
  const supabase = createClient();
  const { data, isLoading, mutate } = useSWR<Meeting | null>(id ? `meeting-${id}` : null, async () => {
    if (!id) return null;
    const { data: meeting, error } = await supabase
      .from("meetings")
      .select("*, client:clients(id, company_name)")
      .eq("id", id)
      .single();
    if (error) throw error;
    const { data: actionItems } = await supabase
      .from("meeting_action_items")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at");
    return { ...meeting, action_items: actionItems ?? [] } as unknown as Meeting;
  });
  return { meeting: data, isLoading, mutate };
}

export interface MeetingInput {
  title: string;
  client_id: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  agenda: string | null;
  assigned_engineer_id: string | null;
  attendees: { name: string; email?: string }[];
}

export async function createMeeting(values: MeetingInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("meetings")
    .insert({ ...values, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;

  fetch("/api/calendar/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetingId: data.id }),
  }).catch(() => {});

  return data as Meeting;
}

export async function updateMeeting(id: string, values: Partial<MeetingInput> & { minutes?: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.from("meetings").update(values).eq("id", id).select().single();
  if (error) throw error;
  return data as Meeting;
}

export async function deleteMeeting(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

export async function addActionItem(meetingId: string, description: string, assignedTo: string | null, dueDate: string | null) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meeting_action_items")
    .insert({ meeting_id: meetingId, description, assigned_to: assignedTo, due_date: dueDate })
    .select()
    .single();
  if (error) throw error;
  return data as MeetingActionItem;
}

export async function toggleActionItem(id: string, done: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("meeting_action_items").update({ done }).eq("id", id);
  if (error) throw error;
}
