"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/types/database";
import type { ClientFormValues } from "@/lib/validations/client";

export function useClients() {
  const supabase = createClient();
  const { data, isLoading, mutate } = useSWR<Client[]>("clients", async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*, assigned_engineer:profiles!clients_assigned_engineer_id_fkey(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Client[];
  });

  return { clients: data ?? [], isLoading, mutate };
}

export function useClient(id: string | undefined) {
  const supabase = createClient();
  const { data, isLoading, mutate } = useSWR<Client | null>(id ? `client-${id}` : null, async () => {
    if (!id) return null;
    const { data, error } = await supabase
      .from("clients")
      .select("*, assigned_engineer:profiles!clients_assigned_engineer_id_fkey(*)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as Client;
  });

  return { client: data, isLoading, mutate };
}

function cleanPayload(values: ClientFormValues) {
  const payload: Record<string, unknown> = { ...values };
  for (const key of Object.keys(payload)) {
    if (payload[key] === "") payload[key] = null;
  }
  return payload;
}

export async function createClientRecord(values: ClientFormValues) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...cleanPayload(values), created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  if (user) {
    await supabase
      .from("activity_log")
      .insert({ entity_type: "client", entity_id: data.id, action: "created", actor_id: user.id, meta: {} });
  }
  return data as Client;
}

export async function updateClientRecord(id: string, values: Partial<ClientFormValues>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(cleanPayload(values as ClientFormValues))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClientRecord(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function updateClientStage(id: string, stage: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("clients").update({ current_stage: stage }).eq("id", id);
  if (error) throw error;
  if (user) {
    await supabase
      .from("activity_log")
      .insert({ entity_type: "client", entity_id: id, action: "stage_changed", actor_id: user.id, meta: { stage } });
  }
}
