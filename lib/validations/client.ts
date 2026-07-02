import { z } from "zod";

export const clientSchema = z.object({
  company_name: z.string().min(1, "Required"),
  contact_person: z.string().optional().or(z.literal("")),
  position: z.string().optional().or(z.literal("")),
  mobile: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  commercial_registration: z.string().optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  factory_type: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  industrial_city: z.string().optional().or(z.literal("")),
  project_status: z.string().optional().or(z.literal("")),
  expected_construction_date: z.string().optional().or(z.literal("")),
  estimated_budget: z.coerce.number().optional().nullable(),
  estimated_area: z.coerce.number().optional().nullable(),
  owner_name: z.string().optional().or(z.literal("")),
  consultant: z.string().optional().or(z.literal("")),
  contractor: z.string().optional().or(z.literal("")),
  lead_source: z.string().optional().or(z.literal("")),
  expected_revenue: z.coerce.number().optional().nullable(),
  current_stage: z.string(),
  next_followup: z.string().optional().or(z.literal("")),
  assigned_engineer_id: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
