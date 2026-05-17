-- ============================================================
-- LEARNIBY — Batch number on modules (classes)
-- Supabase SQL Editor → এই স্ক্রিপ্ট paste করে Run করুন
-- ============================================================

alter table public.modules
  add column if not exists batch_number text;

create index if not exists modules_batch_number_idx
  on public.modules (batch_number);
