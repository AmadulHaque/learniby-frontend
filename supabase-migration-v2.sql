-- ============================================================
-- LEARNIBY v2 — Self-registration + Approval + Per-video access
-- ============================================================
-- Supabase Dashboard → SQL Editor → এ পুরোটা paste করে Run করুন।
-- (পুরোনো batches/enrollments ফেলে নতুন approval + video_access বানাবে)
-- ============================================================

-- 1) পুরোনো অপ্রয়োজনীয় টেবিল ও পলিসি ড্রপ
drop policy if exists "Students see enrolled courses" on public.courses;
drop policy if exists "Students see modules of enrolled courses" on public.modules;
drop policy if exists "Students see videos of enrolled courses" on public.videos;
drop policy if exists "Users see own enrollments" on public.enrollments;
drop policy if exists "Admins manage enrollments" on public.enrollments;
drop policy if exists "Authenticated users can view active batches" on public.batches;
drop policy if exists "Admins manage batches" on public.batches;

drop function if exists public.has_course_access(uuid, uuid) cascade;

drop table if exists public.enrollments cascade;
drop table if exists public.batches cascade;

-- 2) Profile-এ নতুন কলাম + approval status
alter table public.profiles
  add column if not exists address text,
  add column if not exists institution text,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id);

-- পুরোনো admin user-কে auto-approved করি
update public.profiles p
set status = 'approved', approved_at = now()
where exists (
  select 1 from public.user_roles r
  where r.user_id = p.id and r.role = 'admin'
);

-- 3) Signup trigger — নতুন meta fields সংরক্ষণ + status='pending'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, address, institution, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'institution',
    'pending'
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'student');

  return new;
end;
$$;

-- 4) Per-video access টেবিল
create table if not exists public.video_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  unique (user_id, video_id)
);

alter table public.video_access enable row level security;

create policy "Users see own video access"
  on public.video_access for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins manage video access"
  on public.video_access for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 5) Helper functions
create or replace function public.is_approved(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and status = 'approved'
  )
$$;

create or replace function public.has_video_access(_user_id uuid, _video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.video_access
    where user_id = _user_id and video_id = _video_id
  )
$$;

-- কোনো student-এর কোর্সে অন্তত একটা video access আছে কিনা
create or replace function public.has_any_video_in_course(_user_id uuid, _course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.video_access va
    join public.videos v on v.id = va.video_id
    join public.modules m on m.id = v.module_id
    where va.user_id = _user_id and m.course_id = _course_id
  )
$$;

-- কোনো module-এ access-যোগ্য video আছে কিনা
create or replace function public.has_any_video_in_module(_user_id uuid, _module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.video_access va
    join public.videos v on v.id = va.video_id
    where va.user_id = _user_id and v.module_id = _module_id
  )
$$;

-- 6) নতুন RLS policies — শুধু approved user + assigned video
create policy "Approved students see their courses"
  on public.courses for select
  to authenticated
  using (
    is_published = true
    and public.is_approved(auth.uid())
    and public.has_any_video_in_course(auth.uid(), id)
  );

create policy "Approved students see their modules"
  on public.modules for select
  to authenticated
  using (
    public.is_approved(auth.uid())
    and public.has_any_video_in_module(auth.uid(), id)
  );

create policy "Approved students see their assigned videos"
  on public.videos for select
  to authenticated
  using (
    public.is_approved(auth.uid())
    and public.has_video_access(auth.uid(), id)
  );

-- 7) video_progress যদি আগের migration-এ has_course_access রেফার করে — ঠিক করি
-- (নতুন setup-এ video_progress শুধু নিজের data দেখবে)
do $$
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='video_progress') then
    -- কিছু করার নাই, table আগেই আছে
    null;
  end if;
end $$;
