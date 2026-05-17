-- ============================================================
-- LEARNIBY — Student ID + Batch Number fields on profiles
-- Supabase SQL Editor → এই পুরো স্ক্রিপ্ট paste করে Run করুন
-- ============================================================

-- 1. Columns
alter table public.profiles
  add column if not exists student_id text,
  add column if not exists batch_number text;

-- Optional: ensure student_id unique when present (case-insensitive)
create unique index if not exists profiles_student_id_unique
  on public.profiles (lower(student_id))
  where student_id is not null and length(trim(student_id)) > 0;

-- 2. Update handle_new_user trigger to read these from auth metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, address, institution, student_id, batch_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'institution',
    new.raw_user_meta_data->>'student_id',
    new.raw_user_meta_data->>'batch_number'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
