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
  add column if not exists fit_reason text;
