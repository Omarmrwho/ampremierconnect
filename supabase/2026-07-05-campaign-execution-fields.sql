alter table public.project_campaigns
  add column if not exists objective text,
  add column if not exists audience text,
  add column if not exists offer text,
  add column if not exists budget text,
  add column if not exists launch_date date,
  add column if not exists owner text,
  add column if not exists next_step text,
  add column if not exists proof_notes text;
