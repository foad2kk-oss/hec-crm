-- ============================================================================
-- HEC AI Business Development CRM — Database Schema
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"; -- fuzzy company-name matching (discovery dedupe, search)

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'manager', 'sales_engineer');

create type pipeline_stage as enum (
  'new_lead', 'qualified', 'contacted', 'meeting_scheduled',
  'proposal_requested', 'proposal_sent', 'negotiation',
  'won', 'lost', 'delayed'
);

create type lead_priority as enum ('hot', 'warm', 'cold');

create type discovery_status as enum ('new', 'reviewed', 'converted', 'dismissed');

create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create type task_status as enum ('todo', 'in_progress', 'done');

create type document_type as enum (
  'company_profile', 'brochure', 'technical_proposal', 'financial_proposal',
  'contract', 'meeting_minutes', 'presentation', 'other'
);

create type notification_type as enum (
  'follow_up', 'meeting_reminder', 'hot_lead', 'task_assigned', 'task_due', 'system'
);

-- ----------------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'sales_engineer',
  department text,
  avatar_url text,
  google_connected boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ----------------------------------------------------------------------------
-- CLIENTS  (Module 1: Client Database)
-- ----------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  position text,
  mobile text,
  email text,
  website text,
  commercial_registration text,
  industry text,
  factory_type text,
  city text,
  industrial_city text,
  project_status text,
  expected_construction_date date,
  estimated_budget numeric,
  estimated_area numeric,
  owner_name text,
  consultant text,
  contractor text,
  lead_source text,
  lead_score int not null default 0 check (lead_score between 0 and 100),
  priority lead_priority not null default 'cold',
  probability int check (probability between 0 and 100),
  expected_revenue numeric,
  current_stage pipeline_stage not null default 'new_lead',
  last_contact timestamptz,
  next_followup timestamptz,
  assigned_engineer_id uuid references profiles(id) on delete set null,
  notes text,
  tags text[] not null default '{}',
  source_discovered_lead_id uuid, -- set when converted from Module 2 discovery feed
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_stage_idx on clients(current_stage);
create index clients_assigned_idx on clients(assigned_engineer_id);
create index clients_company_trgm_idx on clients using gin (company_name gin_trgm_ops);
create index clients_tags_idx on clients using gin (tags);

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_set_updated_at before update on clients
  for each row execute procedure set_updated_at();

-- ----------------------------------------------------------------------------
-- ATTACHMENTS (generic file attachments on a client, e.g. logos, misc files)
-- ----------------------------------------------------------------------------
create table attachments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  file_name text not null,
  storage_path text not null, -- path within the `documents` storage bucket
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index attachments_client_idx on attachments(client_id);

-- ----------------------------------------------------------------------------
-- DISCOVERED_LEADS  (Module 2: AI Lead Discovery)
-- ----------------------------------------------------------------------------
create table discovered_leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  project text,
  location text,
  source_link text,
  date_found timestamptz not null default now(),
  estimated_project_size text,
  industry text,
  investment_value numeric,
  status discovery_status not null default 'new',
  confidence_score int check (confidence_score between 0 and 100),
  ai_summary text,
  suggested_action text,
  search_query text, -- which discovery query/source category produced this
  raw_result jsonb,  -- full LLM/search response for audit
  converted_client_id uuid references clients(id) on delete set null,
  created_at timestamptz not null default now()
);

create index discovered_leads_status_idx on discovered_leads(status);
create index discovered_leads_company_trgm_idx on discovered_leads using gin (company gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- LEAD_SCORES  (Module 3: AI Lead Scoring — history log)
-- ----------------------------------------------------------------------------
create table lead_scores (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  score int not null check (score between 0 and 100),
  priority lead_priority not null,
  factors jsonb, -- breakdown: {construction_probability, investment_size, urgency, ...}
  recommended_action text,
  model text, -- which AI model produced this score
  scored_at timestamptz not null default now()
);

create index lead_scores_client_idx on lead_scores(client_id, scored_at desc);

-- ----------------------------------------------------------------------------
-- MEETINGS  (Module 5)
-- ----------------------------------------------------------------------------
create table meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  google_event_id text,
  agenda text,
  minutes text,
  attendees jsonb not null default '[]', -- [{name, email, role}]
  assigned_engineer_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meetings_client_idx on meetings(client_id);
create index meetings_starts_at_idx on meetings(starts_at);

create trigger meetings_set_updated_at before update on meetings
  for each row execute procedure set_updated_at();

create table meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  description text not null,
  assigned_to uuid references profiles(id) on delete set null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index meeting_action_items_meeting_idx on meeting_action_items(meeting_id);

-- ----------------------------------------------------------------------------
-- TASKS  (Module 6)
-- ----------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid references profiles(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  due_date date,
  priority task_priority not null default 'medium',
  status task_status not null default 'todo',
  progress int not null default 0 check (progress between 0 and 100),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assigned_idx on tasks(assigned_to);
create index tasks_status_idx on tasks(status);

create trigger tasks_set_updated_at before update on tasks
  for each row execute procedure set_updated_at();

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS  (Module 11)
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, read, created_at desc);

-- ----------------------------------------------------------------------------
-- DOCUMENTS  (Module 8)
-- ----------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  type document_type not null default 'other',
  storage_path text not null, -- path within the `documents` storage bucket
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index documents_client_idx on documents(client_id);

-- ----------------------------------------------------------------------------
-- ACTIVITY_LOG  (audit trail; powers "last contact", duplicate detection, similar-company AI)
-- ----------------------------------------------------------------------------
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, -- 'client' | 'meeting' | 'task' | 'discovered_lead'
  entity_id uuid not null,
  action text not null,      -- 'created' | 'updated' | 'stage_changed' | 'contacted' | 'scored' | ...
  actor_id uuid references profiles(id) on delete set null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index activity_log_entity_idx on activity_log(entity_type, entity_id, created_at desc);

-- ----------------------------------------------------------------------------
-- GOOGLE_TOKENS  (server-only; powers Calendar + Gmail integration, Module 5/11)
-- No RLS policies are defined for this table on purpose — it has RLS enabled with
-- zero policies, so it is completely inaccessible via the anon/authenticated
-- client keys. Only the service-role key (server-side only) can read/write it.
-- ----------------------------------------------------------------------------
create table google_tokens (
  user_id uuid primary key references profiles(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now()
);

alter table google_tokens enable row level security;

-- ============================================================================
-- ROW LEVEL SECURITY
-- All tables are internal-office data: any authenticated staff member can
-- read/write. Deletes and profile-role changes are restricted to admin/manager.
-- ============================================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table attachments enable row level security;
alter table discovered_leads enable row level security;
alter table lead_scores enable row level security;
alter table meetings enable row level security;
alter table meeting_action_items enable row level security;
alter table tasks enable row level security;
alter table notifications enable row level security;
alter table documents enable row level security;
alter table activity_log enable row level security;

create function is_admin_or_manager() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'manager')
  );
$$ language sql security definer stable;

-- profiles: everyone can read all profiles (needed for assignee dropdowns);
-- users can update their own row; admin/manager can update any.
create policy "profiles_select_all" on profiles for select to authenticated using (true);
create policy "profiles_update_own_or_admin" on profiles for update to authenticated
  using (id = auth.uid() or is_admin_or_manager());
create policy "profiles_insert_self" on profiles for insert to authenticated with check (id = auth.uid());

-- generic pattern: full CRUD for authenticated staff, delete limited to admin/manager
create policy "clients_select" on clients for select to authenticated using (true);
create policy "clients_insert" on clients for insert to authenticated with check (true);
create policy "clients_update" on clients for update to authenticated using (true);
create policy "clients_delete" on clients for delete to authenticated using (is_admin_or_manager());

create policy "attachments_select" on attachments for select to authenticated using (true);
create policy "attachments_insert" on attachments for insert to authenticated with check (true);
create policy "attachments_delete" on attachments for delete to authenticated using (is_admin_or_manager());

create policy "discovered_leads_select" on discovered_leads for select to authenticated using (true);
create policy "discovered_leads_insert" on discovered_leads for insert to authenticated with check (true);
create policy "discovered_leads_update" on discovered_leads for update to authenticated using (true);
create policy "discovered_leads_delete" on discovered_leads for delete to authenticated using (is_admin_or_manager());

create policy "lead_scores_select" on lead_scores for select to authenticated using (true);
create policy "lead_scores_insert" on lead_scores for insert to authenticated with check (true);

create policy "meetings_select" on meetings for select to authenticated using (true);
create policy "meetings_insert" on meetings for insert to authenticated with check (true);
create policy "meetings_update" on meetings for update to authenticated using (true);
create policy "meetings_delete" on meetings for delete to authenticated using (is_admin_or_manager());

create policy "meeting_action_items_select" on meeting_action_items for select to authenticated using (true);
create policy "meeting_action_items_insert" on meeting_action_items for insert to authenticated with check (true);
create policy "meeting_action_items_update" on meeting_action_items for update to authenticated using (true);
create policy "meeting_action_items_delete" on meeting_action_items for delete to authenticated using (true);

create policy "tasks_select" on tasks for select to authenticated using (true);
create policy "tasks_insert" on tasks for insert to authenticated with check (true);
create policy "tasks_update" on tasks for update to authenticated using (true);
create policy "tasks_delete" on tasks for delete to authenticated using (is_admin_or_manager());

create policy "notifications_select_own" on notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_insert" on notifications for insert to authenticated with check (true);
create policy "notifications_update_own" on notifications for update to authenticated using (user_id = auth.uid());

create policy "documents_select" on documents for select to authenticated using (true);
create policy "documents_insert" on documents for insert to authenticated with check (true);
create policy "documents_delete" on documents for delete to authenticated using (is_admin_or_manager());

create policy "activity_log_select" on activity_log for select to authenticated using (true);
create policy "activity_log_insert" on activity_log for insert to authenticated with check (true);

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

create policy "documents_bucket_select" on storage.objects for select to authenticated
  using (bucket_id = 'documents');
create policy "documents_bucket_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents');
create policy "documents_bucket_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents');

-- ============================================================================
-- DASHBOARD / REPORTING VIEWS  (Module 9 + Module 12)
-- ============================================================================

create view v_pipeline_funnel as
  select current_stage, count(*)::int as count
  from clients
  group by current_stage;

create view v_leads_by_source as
  select coalesce(lead_source, 'Unknown') as lead_source, count(*)::int as count
  from clients
  group by lead_source;

create view v_leads_by_city as
  select coalesce(city, 'Unknown') as city, count(*)::int as count
  from clients
  group by city
  order by count(*) desc;

create view v_leads_by_industry as
  select coalesce(industry, 'Unknown') as industry, count(*)::int as count
  from clients
  group by industry;

create view v_engineer_performance as
  select
    p.id as engineer_id,
    p.full_name,
    count(c.id) filter (where c.id is not null)::int as total_assigned,
    count(c.id) filter (where c.current_stage = 'won')::int as won_count,
    coalesce(sum(c.expected_revenue) filter (where c.current_stage = 'won'), 0) as won_revenue,
    round(
      100.0 * count(c.id) filter (where c.current_stage = 'won')
      / nullif(count(c.id) filter (where c.current_stage in ('won','lost')), 0), 1
    ) as win_rate_pct
  from profiles p
  left join clients c on c.assigned_engineer_id = p.id
  group by p.id, p.full_name;

create view v_dashboard_kpis as
  select
    (select count(*) from clients) as total_leads,
    (select count(*) from clients where created_at >= now() - interval '7 days') as new_leads_this_week,
    (select count(*) from meetings where starts_at between date_trunc('week', now()) and date_trunc('week', now()) + interval '7 days') as meetings_this_week,
    (select count(*) from clients where current_stage = 'won') as projects_won,
    round(100.0 * (select count(*) from clients where current_stage = 'won')
      / nullif((select count(*) from clients where current_stage in ('won','lost')), 0), 1) as conversion_rate_pct,
    round(100.0 * (select count(*) from clients where current_stage = 'won')
      / nullif((select count(*) from clients where current_stage in ('proposal_sent','negotiation','won','lost')), 0), 1) as proposal_success_rate_pct,
    (select coalesce(sum(expected_revenue), 0) from clients where current_stage not in ('won','lost')) as expected_revenue,
    (select coalesce(sum(expected_revenue), 0) from clients where current_stage = 'won') as revenue_won;

grant select on v_pipeline_funnel, v_leads_by_source, v_leads_by_city, v_leads_by_industry,
  v_engineer_performance, v_dashboard_kpis to authenticated;

-- ============================================================================
-- pg_cron jobs (OPTIONAL — requires the pg_cron extension enabled on your
-- Supabase project, and the Edge Functions below deployed with `net.http_post`
-- pointed at your project URL). See README.md "Scheduling AI Discovery" section.
-- Example (run manually after deploying the `discover-leads` function):
--
-- select cron.schedule(
--   'daily-lead-discovery', '0 5 * * *', -- 05:00 UTC daily
--   $$ select net.http_post(
--        url := 'https://<project-ref>.supabase.co/functions/v1/discover-leads',
--        headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
--      ) $$
-- );
-- select cron.schedule(
--   'daily-briefing', '0 4 * * *', -- 04:00 UTC daily (before office hours in KSA, UTC+3)
--   $$ select net.http_post(
--        url := 'https://<project-ref>.supabase.co/functions/v1/daily-briefing',
--        headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
--      ) $$
-- );
-- ============================================================================
