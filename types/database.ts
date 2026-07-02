export type UserRole = "admin" | "manager" | "sales_engineer";

export type PipelineStage =
  | "new_lead"
  | "qualified"
  | "contacted"
  | "meeting_scheduled"
  | "proposal_requested"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost"
  | "delayed";

export const PIPELINE_STAGES: PipelineStage[] = [
  "new_lead",
  "qualified",
  "contacted",
  "meeting_scheduled",
  "proposal_requested",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "delayed",
];

export type LeadPriority = "hot" | "warm" | "cold";
export type DiscoveryStatus = "new" | "reviewed" | "converted" | "dismissed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done";
export type DocumentType =
  | "company_profile"
  | "brochure"
  | "technical_proposal"
  | "financial_proposal"
  | "contract"
  | "meeting_minutes"
  | "presentation"
  | "other";
export type NotificationType =
  | "follow_up"
  | "meeting_reminder"
  | "hot_lead"
  | "task_assigned"
  | "task_due"
  | "system";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  avatar_url: string | null;
  google_connected: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  position: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  commercial_registration: string | null;
  industry: string | null;
  factory_type: string | null;
  city: string | null;
  industrial_city: string | null;
  project_status: string | null;
  expected_construction_date: string | null;
  estimated_budget: number | null;
  estimated_area: number | null;
  owner_name: string | null;
  consultant: string | null;
  contractor: string | null;
  lead_source: string | null;
  lead_score: number;
  priority: LeadPriority;
  probability: number | null;
  expected_revenue: number | null;
  current_stage: PipelineStage;
  last_contact: string | null;
  next_followup: string | null;
  assigned_engineer_id: string | null;
  notes: string | null;
  tags: string[];
  source_discovered_lead_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_engineer?: Profile | null;
}

export interface Attachment {
  id: string;
  client_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface DiscoveredLead {
  id: string;
  company: string;
  project: string | null;
  location: string | null;
  source_link: string | null;
  date_found: string;
  estimated_project_size: string | null;
  industry: string | null;
  investment_value: number | null;
  status: DiscoveryStatus;
  confidence_score: number | null;
  ai_summary: string | null;
  suggested_action: string | null;
  search_query: string | null;
  raw_result: unknown;
  converted_client_id: string | null;
  created_at: string;
}

export interface LeadScore {
  id: string;
  client_id: string;
  score: number;
  priority: LeadPriority;
  factors: Record<string, unknown> | null;
  recommended_action: string | null;
  model: string | null;
  scored_at: string;
}

export interface Meeting {
  id: string;
  client_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  google_event_id: string | null;
  agenda: string | null;
  minutes: string | null;
  attendees: { name: string; email?: string; role?: string }[];
  assigned_engineer_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: Client | null;
  action_items?: MeetingActionItem[];
}

export interface MeetingActionItem {
  id: string;
  meeting_id: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  done: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  client_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  client?: Client | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface AppDocument {
  id: string;
  client_id: string | null;
  name: string;
  type: DocumentType;
  storage_path: string;
  created_by: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface DashboardKpis {
  total_leads: number;
  new_leads_this_week: number;
  meetings_this_week: number;
  projects_won: number;
  conversion_rate_pct: number | null;
  proposal_success_rate_pct: number | null;
  expected_revenue: number;
  revenue_won: number;
}
