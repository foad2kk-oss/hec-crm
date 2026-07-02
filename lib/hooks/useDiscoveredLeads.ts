"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { DiscoveredLead } from "@/types/database";

export function useDiscoveredLeads() {
  const supabase = createClient();
  const { data, isLoading, mutate } = useSWR<DiscoveredLead[]>("discovered_leads", async () => {
    const { data, error } = await supabase
      .from("discovered_leads")
      .select("*")
      .order("date_found", { ascending: false });
    if (error) throw error;
    return (data ?? []) as DiscoveredLead[];
  });

  return { leads: data ?? [], isLoading, mutate };
}

export async function convertDiscoveredLead(lead: DiscoveredLead) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      company_name: lead.company,
      industry: lead.industry,
      city: lead.location,
      project_status: lead.project,
      estimated_budget: lead.investment_value,
      lead_source: "AI Discovery",
      notes: lead.ai_summary,
      current_stage: "new_lead",
      source_discovered_lead_id: lead.id,
      created_by: user?.id,
      tags: ["ai-discovered"],
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("discovered_leads").update({ status: "converted", converted_client_id: client.id }).eq("id", lead.id);

  fetch("/api/leads/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: client.id }),
  }).catch(() => {});

  return client;
}

export async function dismissDiscoveredLead(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("discovered_leads").update({ status: "dismissed" }).eq("id", id);
  if (error) throw error;
}
