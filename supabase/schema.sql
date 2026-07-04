do $$
begin
  if not exists (select 1 from pg_type where typname = 'portal_role') then
    create type public.portal_role as enum ('client', 'vendor', 'internal');
  end if;

  if not exists (select 1 from pg_type where typname = 'intake_status') then
    create type public.intake_status as enum ('draft', 'submitted', 'reviewing', 'accepted', 'closed');
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

alter table public.portal_profiles enable row level security;
alter table public.access_requests enable row level security;
alter table public.intake_requests enable row level security;

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
using (public.is_internal_admin())
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
