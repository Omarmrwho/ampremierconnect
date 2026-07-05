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

alter table public.project_proposals enable row level security;

drop policy if exists "Internal admins can manage project proposals" on public.project_proposals;
create policy "Internal admins can manage project proposals"
on public.project_proposals
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());
