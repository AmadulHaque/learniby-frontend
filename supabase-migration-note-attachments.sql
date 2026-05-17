-- Lead note attachments: storage bucket + metadata table

-- 1) Private storage bucket
insert into storage.buckets (id, name, public)
values ('lead-attachments', 'lead-attachments', false)
on conflict (id) do nothing;

-- 2) Metadata table
create table if not exists public.lead_note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.lead_notes(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  file_name text not null,
  file_path text not null,        -- storage object path (leads/<lead_id>/<uuid>-<name>)
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.sales_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lna_note_idx on public.lead_note_attachments(note_id);
create index if not exists lna_lead_idx on public.lead_note_attachments(lead_id, created_at desc);

alter table public.lead_note_attachments enable row level security;

drop policy if exists "lna: select" on public.lead_note_attachments;
create policy "lna: select"
  on public.lead_note_attachments for select
  using (public.can_access_lead(lead_id));

drop policy if exists "lna: insert" on public.lead_note_attachments;
create policy "lna: insert"
  on public.lead_note_attachments for insert
  with check (public.can_access_lead(lead_id) and uploaded_by = auth.uid());

drop policy if exists "lna: delete" on public.lead_note_attachments;
create policy "lna: delete"
  on public.lead_note_attachments for delete
  using (uploaded_by = auth.uid() or public.is_sales_admin(auth.uid()));

-- 3) Storage policies — sales users only, scoped to a lead they can access.
-- Object path convention: leads/<lead_id>/<file>
create or replace function public.lead_attachment_lead_id(name text)
returns uuid language sql immutable as $$
  select case
    when split_part(name, '/', 1) = 'leads' and split_part(name, '/', 2) <> ''
    then nullif(split_part(name, '/', 2), '')::uuid
    else null
  end
$$;

drop policy if exists "lead-attachments select" on storage.objects;
create policy "lead-attachments select"
  on storage.objects for select
  using (
    bucket_id = 'lead-attachments'
    and public.can_access_lead(public.lead_attachment_lead_id(name))
  );

drop policy if exists "lead-attachments insert" on storage.objects;
create policy "lead-attachments insert"
  on storage.objects for insert
  with check (
    bucket_id = 'lead-attachments'
    and public.is_sales_user(auth.uid())
    and public.can_access_lead(public.lead_attachment_lead_id(name))
  );

drop policy if exists "lead-attachments delete" on storage.objects;
create policy "lead-attachments delete"
  on storage.objects for delete
  using (
    bucket_id = 'lead-attachments'
    and (owner = auth.uid() or public.is_sales_admin(auth.uid()))
  );
