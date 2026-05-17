-- ============================================================
-- LEARNIBY COURSE PORTAL — DATABASE SCHEMA
-- ============================================================
-- এই পুরো ফাইলটা Supabase Dashboard → SQL Editor এ paste করে
-- "Run" বাটনে click করুন। একবারেই পুরো schema তৈরি হয়ে যাবে।
-- ============================================================

-- 1. ROLE ENUM + USER_ROLES TABLE (security-critical, separate table)
create type public.app_role as enum ('admin', 'student');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can manage all roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 2. PROFILES TABLE
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "Admins can manage all profiles"
  on public.profiles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default 'student' role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  insert into public.user_roles (user_id, role)
  values (new.id, 'student');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3. BATCHES (with expiry)
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  starts_at date,
  expires_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.batches enable row level security;

create trigger batches_updated_at before update on public.batches
  for each row execute function public.set_updated_at();

create policy "Authenticated users can view active batches"
  on public.batches for select
  to authenticated
  using (is_active = true or public.has_role(auth.uid(), 'admin'));

create policy "Admins manage batches"
  on public.batches for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 4. COURSES → MODULES → VIDEOS
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  thumbnail_url text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.modules enable row level security;

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  youtube_id text not null,           -- e.g. "dQw4w9WgXcQ"
  duration_seconds int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

-- 5. ENROLLMENTS — gives a user access to a course (via batch OR direct)
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,             -- null = no expiry; else date-based access
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.enrollments enable row level security;

-- Helper: does user have valid (non-expired) access to a course?
create or replace function public.has_course_access(_user_id uuid, _course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    left join public.batches b on b.id = e.batch_id
    where e.user_id = _user_id
      and e.course_id = _course_id
      and (e.expires_at is null or e.expires_at > now())
      and (b.id is null or (
        b.is_active = true
        and (b.expires_at is null or b.expires_at >= current_date)
      ))
  )
$$;

-- COURSES policies: students see only enrolled courses
create policy "Students see enrolled courses"
  on public.courses for select
  to authenticated
  using (
    is_published = true and public.has_course_access(auth.uid(), id)
  );

create policy "Admins manage courses"
  on public.courses for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- MODULES: visible if user has course access
create policy "Students see modules of enrolled courses"
  on public.modules for select
  to authenticated
  using (public.has_course_access(auth.uid(), course_id));

create policy "Admins manage modules"
  on public.modules for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- VIDEOS: visible if user has access to parent course
create policy "Students see videos of enrolled courses"
  on public.videos for select
  to authenticated
  using (
    exists (
      select 1 from public.modules m
      where m.id = videos.module_id
        and public.has_course_access(auth.uid(), m.course_id)
    )
  );

create policy "Admins manage videos"
  on public.videos for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ENROLLMENTS policies
create policy "Users see own enrollments"
  on public.enrollments for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins manage enrollments"
  on public.enrollments for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. CREATE FIRST ADMIN USER (manual step after running this)
-- ============================================================
-- ১. Supabase Dashboard → Authentication → Users → "Add user"
--    এ গিয়ে নিজের email/password দিয়ে user তৈরি করুন।
-- ২. ওই user-এর id কপি করে নিচের query-তে বসান এবং SQL Editor-এ run করুন:
--
--    insert into public.user_roles (user_id, role)
--    values ('PASTE-YOUR-USER-ID-HERE', 'admin');
--
-- ৩. একই user-এর জন্য default 'student' role row delete করতে পারেন (optional):
--    delete from public.user_roles
--    where user_id = 'PASTE-YOUR-USER-ID-HERE' and role = 'student';
-- ============================================================
