-- ============================================================
-- LEARNIBY — Single-IP lock per user
-- ============================================================
-- প্রতিটা approved user-এর জন্য এক IP-তে lock।
-- দ্বিতীয় IP থেকে login হলে status='ip_locked' হবে এবং
-- admin re-approval না করা পর্যন্ত access বন্ধ।
-- ============================================================

-- 1) status check constraint update — 'ip_locked' যোগ
alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'ip_locked'));

-- 2) IP tracking columns
alter table public.profiles
  add column if not exists locked_ip text,
  add column if not exists ip_locked_at timestamptz,
  add column if not exists last_attempted_ip text,
  add column if not exists last_attempt_at timestamptz;

-- 3) is_approved() এখনো শুধু 'approved' status check করে — ip_locked block হবে।
-- (existing function অপরিবর্তিত রাখলেই চলবে)
