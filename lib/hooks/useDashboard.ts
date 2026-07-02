"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { DashboardKpis, PipelineStage } from "@/types/database";

export function useDashboardData() {
  const supabase = createClient();

  const { data: kpis } = useSWR<DashboardKpis | null>("dash-kpis", async () => {
    const { data } = await supabase.from("v_dashboard_kpis").select("*").single();
    return data as DashboardKpis | null;
  });

  const { data: funnel } = useSWR<{ current_stage: PipelineStage; count: number }[]>("dash-funnel", async () => {
    const { data } = await supabase.from("v_pipeline_funnel").select("*");
    return (data ?? []) as { current_stage: PipelineStage; count: number }[];
  });

  const { data: bySource } = useSWR<{ lead_source: string; count: number }[]>("dash-source", async () => {
    const { data } = await supabase.from("v_leads_by_source").select("*");
    return (data ?? []) as { lead_source: string; count: number }[];
  });

  const { data: byCity } = useSWR<{ city: string; count: number }[]>("dash-city", async () => {
    const { data } = await supabase.from("v_leads_by_city").select("*").limit(8);
    return (data ?? []) as { city: string; count: number }[];
  });

  const { data: byIndustry } = useSWR<{ industry: string; count: number }[]>("dash-industry", async () => {
    const { data } = await supabase.from("v_leads_by_industry").select("*");
    return (data ?? []) as { industry: string; count: number }[];
  });

  const { data: engineerPerf } = useSWR<
    { engineer_id: string; full_name: string; total_assigned: number; won_count: number; won_revenue: number; win_rate_pct: number }[]
  >("dash-engineers", async () => {
    const { data } = await supabase.from("v_engineer_performance").select("*").order("won_revenue", { ascending: false });
    return (data ?? []) as never[];
  });

  const { data: upcomingFollowups } = useSWR("dash-followups", async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, company_name, next_followup")
      .not("next_followup", "is", null)
      .gte("next_followup", new Date().toISOString())
      .order("next_followup", { ascending: true })
      .limit(6);
    return data ?? [];
  });

  return { kpis, funnel: funnel ?? [], bySource: bySource ?? [], byCity: byCity ?? [], byIndustry: byIndustry ?? [], engineerPerf: engineerPerf ?? [], upcomingFollowups: upcomingFollowups ?? [] };
}
