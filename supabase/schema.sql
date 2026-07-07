do $$
begin
  if not exists (select 1 from pg_type where typname = 'portal_role') then
    create type public.portal_role as enum ('client', 'vendor', 'internal');
  end if;

  if not exists (select 1 from pg_type where typname = 'intake_status') then
    create type public.intake_status as enum ('draft', 'submitted', 'reviewing', 'accepted', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_operating_status') then
    create type public.project_operating_status as enum ('active', 'waiting', 'blocked', 'complete');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_health') then
    create type public.project_health as enum ('green', 'yellow', 'red');
  end if;
end $$;

create table if not exists public.portal_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  company text,
  role public.portal_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  requested_role public.portal_role not null,
  company text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.intake_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.portal_profiles(id) on delete set null,
  request_type text not null,
  company text not null,
  summary text not null,
  status public.intake_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_session_status (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  client_name text,
  status public.project_operating_status not null default 'active',
  health public.project_health not null default 'green',
  source_session_key text,
  source_session_label text,
  owner text,
  last_update text,
  next_action text,
  blocker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_crm_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.project_session_status(id) on delete cascade,
  company_name text not null,
  contact_name text,
  contact_title text,
  email text,
  phone text,
  location text,
  segment text,
  website text,
  source_url text,
  campaign_name text,
  channel text,
  last_contacted_at timestamptz,
  last_contact_subject text,
  reply_body text,
  reply_preview text,
  reply_from text,
  reply_received_at timestamptz,
  reply_message_id text,
  fit_reason text,
  stage text not null default 'qualification',
  owner text,
  next_step text,
  value_estimate text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_crm_records
  add column if not exists contact_title text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists segment text,
  add column if not exists website text,
  add column if not exists source_url text,
  add column if not exists campaign_name text,
  add column if not exists channel text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists last_contact_subject text,
  add column if not exists reply_body text,
  add column if not exists reply_preview text,
  add column if not exists reply_from text,
  add column if not exists reply_received_at timestamptz,
  add column if not exists reply_message_id text,
  add column if not exists fit_reason text;

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.project_session_status(id) on delete cascade,
  task_name text not null,
  status text not null default 'planned',
  owner text,
  due_date date,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.project_session_status(id) on delete cascade,
  campaign_name text not null,
  campaign_type text not null default 'sales',
  channel text,
  status text not null default 'draft',
  objective text,
  audience text,
  offer text,
  budget text,
  launch_date date,
  owner text,
  next_step text,
  proof_notes text,
  recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_campaigns
  add column if not exists objective text,
  add column if not exists audience text,
  add column if not exists offer text,
  add column if not exists budget text,
  add column if not exists launch_date date,
  add column if not exists owner text,
  add column if not exists next_step text,
  add column if not exists proof_notes text;

create table if not exists public.project_campaign_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.project_session_status(id) on delete cascade,
  campaign_id uuid references public.project_campaigns(id) on delete cascade,
  activity_type text not null default 'touch',
  activity_date date not null default current_date,
  owner text,
  outcome text,
  next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.project_session_status(id) on delete cascade,
  proposal_date date not null default current_date,
  proposal_time time,
  company_name text not null,
  company_address text,
  directed_to text not null,
  contact_title text,
  contact_email text,
  price text,
  scope_summary text,
  terms text,
  valid_until date,
  status text not null default 'draft',
  next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.project_session_status(id) on delete cascade,
  title text not null,
  score text,
  next_move text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_agent_recommendations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.project_session_status(id) on delete cascade,
  agent_role text not null,
  assignment text not null,
  output_target text,
  status text not null default 'recommended',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portal_profiles enable row level security;
alter table public.access_requests enable row level security;
alter table public.intake_requests enable row level security;
alter table public.project_session_status enable row level security;
alter table public.project_crm_records enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_campaigns enable row level security;
alter table public.project_campaign_activities enable row level security;
alter table public.project_proposals enable row level security;
alter table public.project_ideas enable row level security;
alter table public.project_agent_recommendations enable row level security;

create or replace function public.is_internal_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.portal_profiles
    where id = auth.uid()
      and role = 'internal'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.portal_profiles (id, email, full_name, company, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company',
    case
      when new.raw_user_meta_data ->> 'requested_role' in ('client', 'vendor', 'internal')
        then (new.raw_user_meta_data ->> 'requested_role')::public.portal_role
      else 'client'::public.portal_role
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.portal_profiles.full_name, excluded.full_name),
    company = coalesce(public.portal_profiles.company, excluded.company),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "Users can read own profile" on public.portal_profiles;
create policy "Users can read own profile"
on public.portal_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Internal admins can read profiles" on public.portal_profiles;
create policy "Internal admins can read profiles"
on public.portal_profiles
for select
to authenticated
using (public.is_internal_admin());

drop policy if exists "Users can update own profile" on public.portal_profiles;
create policy "Users can update own profile"
on public.portal_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Internal admins can update profiles" on public.portal_profiles;
create policy "Internal admins can update profiles"
on public.portal_profiles
for update
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists "Anyone can create access requests" on public.access_requests;
create policy "Anyone can create access requests"
on public.access_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "Internal admins can read access requests" on public.access_requests;
create policy "Internal admins can read access requests"
on public.access_requests
for select
to authenticated
using (public.is_internal_admin());

drop policy if exists "Internal admins can update access requests" on public.access_requests;
create policy "Internal admins can update access requests"
on public.access_requests
for update
to authenticated
using (public.is_internal_admin() and status = 'pending')
with check (public.is_internal_admin());

drop policy if exists "Anyone can create draft intake requests" on public.intake_requests;
create policy "Anyone can create draft intake requests"
on public.intake_requests
for insert
to anon, authenticated
with check (status = 'draft');

drop policy if exists "Users can create owned intake requests" on public.intake_requests;
create policy "Users can create owned intake requests"
on public.intake_requests
for insert
to authenticated
with check (auth.uid() = requester_id);

drop policy if exists "Users can read own intake requests" on public.intake_requests;
create policy "Users can read own intake requests"
on public.intake_requests
for select
to authenticated
using (auth.uid() = requester_id);

drop policy if exists "Internal admins can read intake requests" on public.intake_requests;
create policy "Internal admins can read intake requests"
on public.intake_requests
for select
to authenticated
using (public.is_internal_admin());

drop policy if exists "Internal admins can read project session status" on public.project_session_status;
create policy "Internal admins can read project session status"
on public.project_session_status
for select
to authenticated
using (public.is_internal_admin());

drop policy if exists "Internal admins can insert project session status" on public.project_session_status;
create policy "Internal admins can insert project session status"
on public.project_session_status
for insert
to authenticated
with check (public.is_internal_admin());

drop policy if exists "Internal admins can update project session status" on public.project_session_status;
create policy "Internal admins can update project session status"
on public.project_session_status
for update
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists "Internal admins can delete project session status" on public.project_session_status;
create policy "Internal admins can delete project session status"
on public.project_session_status
for delete
to authenticated
using (public.is_internal_admin());

drop policy if exists "Internal admins can manage project crm records" on public.project_crm_records;
create policy "Internal admins can manage project crm records"
on public.project_crm_records
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists "Internal admins can manage project tasks" on public.project_tasks;
create policy "Internal admins can manage project tasks"
on public.project_tasks
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists "Internal admins can manage project campaigns" on public.project_campaigns;
create policy "Internal admins can manage project campaigns"
on public.project_campaigns
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists "Internal admins can manage project campaign activities" on public.project_campaign_activities;
create policy "Internal admins can manage project campaign activities"
on public.project_campaign_activities
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists "Internal admins can manage project proposals" on public.project_proposals;
create policy "Internal admins can manage project proposals"
on public.project_proposals
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists "Internal admins can manage project ideas" on public.project_ideas;
create policy "Internal admins can manage project ideas"
on public.project_ideas
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists "Internal admins can manage project agent recommendations" on public.project_agent_recommendations;
create policy "Internal admins can manage project agent recommendations"
on public.project_agent_recommendations
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action
)
select
  'AM Premier Connect Portal',
  'AM Premier Solutions',
  'active',
  'green',
  'main webchat',
  'Elara',
  'Approval queue is live. Internal command portal shell added.',
  'Connect OpenClaw session sync into project_session_status.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'AM Premier Connect Portal'
);

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action,
  blocker
)
select
  'Live Session Status Sync',
  'Internal operations',
  'waiting',
  'yellow',
  'OpenClaw sessions',
  'Elara',
  'Session listing is available to the agent runtime.',
  'Create scheduled bridge that summarizes visible sessions and upserts portal records.',
  'The deployed browser cannot directly call OpenClaw session tools.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'Live Session Status Sync'
);

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action
)
select
  'Power Outreach Command Board',
  'AM Premier Solutions',
  'active',
  'green',
  'txinjurycheck.com dashboard',
  'Elara',
  'Reference dashboard is live with outreach totals, movement board, action queue, and downloads.',
  'Rebuild the pattern inside AM Premier Connect with project navigation and update requests.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'Power Outreach Command Board'
);

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action
)
select
  'EV/DC Charger Outreach Engine',
  'AM Premier Solutions',
  'active',
  'green',
  'workspace outreach batches',
  'Elara',
  'Multiple EV/DC charger outreach batches were prepared and logged across airport, retail, hospitality, parking, and fuel/convenience lanes.',
  'Watch replies, update CRM status, and surface warm responses in the portal action queue.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'EV/DC Charger Outreach Engine'
);

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action
)
select
  'Generator and Critical Power Outreach',
  'AM Premier Solutions',
  'active',
  'green',
  'power outreach workspace',
  'Elara',
  'Generator backup power and critical infrastructure outreach packages were created for aviation, healthcare, water, university, rail, ports, and related lanes.',
  'Monitor inbox replies and move qualified opportunities into deal-room follow-up.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'Generator and Critical Power Outreach'
);

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action,
  blocker
)
select
  'Roofing Lead Pipeline',
  'Internal sales development',
  'waiting',
  'yellow',
  'roofing subagents',
  'Elara',
  'Operating rules were captured for a 1,000-company roofing lead database, with subagents assigned for research, verification, personalization, and outreach.',
  'Restart or replace the failed research/verification subagent path before production outreach.',
  'Prior subagent runs failed before producing the approved qualified lead database.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'Roofing Lead Pipeline'
);

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action
)
select
  'Respectfully GFY Launch',
  'GFY LLC',
  'waiting',
  'yellow',
  'GFY launch workspace',
  'Elara',
  'Brand direction, launch assets, waitlist site, mockups, pricing, product listings, and readiness materials were prepared.',
  'Pick the next launch gate: storefront provider, first drop assets, or waitlist conversion flow.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'Respectfully GFY Launch'
);

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action
)
select
  'Power Intelligence Reports',
  'AM Premier Solutions',
  'active',
  'green',
  'reports workspace',
  'Elara',
  'Power infrastructure opportunity reports, government scans, commercial qualification reviews, and executive opportunity intelligence files were produced.',
  'Promote the strongest opportunities into tracked project cards with owners and next actions.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'Power Intelligence Reports'
);

insert into public.project_session_status (
  project_name,
  client_name,
  status,
  health,
  source_session_label,
  owner,
  last_update,
  next_action
)
select
  'AM Premier Station',
  'AM Premier Solutions',
  'active',
  'yellow',
  'construction command room',
  'Elara / Construction Manager Agent',
  'Construction project workspace created for schedule, CRM, campaigns, ideas, and agent recommendations.',
  'Confirm site package, permits, utility requirements, contractor roles, and the first 7-day construction lookahead.'
where not exists (
  select 1
  from public.project_session_status
  where project_name = 'AM Premier Station'
);
