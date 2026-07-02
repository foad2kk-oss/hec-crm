import { completeJson } from "./clients";
import type { Client, LeadPriority } from "@/types/database";

export interface ScoringResult {
  score: number;
  priority: LeadPriority;
  recommended_action: string;
  factors: {
    construction_probability: number;
    investment_size: number;
    urgency: number;
    consultant_need_likelihood: number;
    project_stage: number;
    company_credibility: number;
  };
  predicted_construction_within_6_months: boolean;
  estimated_consulting_fee_sar: number | null;
}

const SYSTEM_PROMPT = `You are an AI sales analyst for an engineering consulting office in Saudi Arabia (HEC).
You score industrial investment leads (factories, industrial facilities) on how likely they are to
become paying engineering-consultancy clients. Consider: construction probability, investment size,
urgency, likelihood of needing an engineering consultant, project stage, and company credibility.
Always respond with strict JSON matching the requested schema.`;

export async function scoreClient(client: Partial<Client>): Promise<ScoringResult> {
  const prompt = `Score this lead (0-100) and return JSON with keys:
score (0-100 int), priority ("hot"|"warm"|"cold" — hot >=70, warm 40-69, cold <40),
recommended_action (short actionable Arabic sentence),
factors { construction_probability, investment_size, urgency, consultant_need_likelihood, project_stage, company_credibility } each 0-100 int,
predicted_construction_within_6_months (boolean),
estimated_consulting_fee_sar (number estimate based on typical MEP/engineering consulting fees as 1-3% of estimated_budget, or null if budget unknown).

Lead data:
${JSON.stringify(
  {
    company_name: client.company_name,
    industry: client.industry,
    factory_type: client.factory_type,
    city: client.city,
    industrial_city: client.industrial_city,
    project_status: client.project_status,
    expected_construction_date: client.expected_construction_date,
    estimated_budget: client.estimated_budget,
    estimated_area: client.estimated_area,
    lead_source: client.lead_source,
    current_stage: client.current_stage,
    notes: client.notes,
  },
  null,
  2
)}`;

  return completeJson<ScoringResult>({ system: SYSTEM_PROMPT, prompt, maxTokens: 800 });
}
