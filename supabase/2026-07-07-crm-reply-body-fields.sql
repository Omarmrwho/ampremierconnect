alter table public.project_crm_records
  add column if not exists reply_body text,
  add column if not exists reply_preview text,
  add column if not exists reply_from text,
  add column if not exists reply_received_at timestamptz,
  add column if not exists reply_message_id text;
