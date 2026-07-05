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

alter table public.project_campaign_activities enable row level security;

drop policy if exists "Internal admins can manage project campaign activities" on public.project_campaign_activities;
create policy "Internal admins can manage project campaign activities"
on public.project_campaign_activities
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());
