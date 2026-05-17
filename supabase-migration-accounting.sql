-- =============================================================
-- Sales Accounting: prices, deal value, payments, targets
-- =============================================================

-- 1. Course default price
alter table public.sales_courses
  add column if not exists default_price numeric(12,2) not null default 0;

-- 2. Lead deal value + won_at timestamp
alter table public.leads
  add column if not exists deal_value numeric(12,2),
  add column if not exists won_at timestamptz;

-- Backfill won_at for existing won leads (best-effort: use updated_at)
update public.leads l
   set won_at = coalesce(l.won_at, l.updated_at)
  from public.sales_statuses s
 where l.status = s.key and s.is_won = true and l.won_at is null;

-- Trigger: auto stamp/clear won_at when status flips to/from a won status
create or replace function public.leads_set_won_at()
returns trigger language plpgsql as $$
declare
  is_won_new boolean;
  is_won_old boolean;
begin
  select coalesce(is_won, false) into is_won_new from public.sales_statuses where key = NEW.status;
  if TG_OP = 'UPDATE' then
    select coalesce(is_won, false) into is_won_old from public.sales_statuses where key = OLD.status;
  else
    is_won_old := false;
  end if;

  if is_won_new and not coalesce(is_won_old, false) then
    NEW.won_at := now();
    -- if no deal value yet, auto-fill from course default prices
    if NEW.deal_value is null then
      select coalesce(sum(c.default_price), 0) into NEW.deal_value
        from public.sales_courses c
       where c.key = any (NEW.courses);
    end if;
  elsif (not is_won_new) and coalesce(is_won_old, false) then
    NEW.won_at := null;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_leads_set_won_at on public.leads;
create trigger trg_leads_set_won_at
  before insert or update of status on public.leads
  for each row execute function public.leads_set_won_at();

-- 3. Sales payments (installments per lead)
create table if not exists public.sales_payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text not null default 'cash',
  note text,
  created_by uuid references public.sales_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists sales_payments_lead_idx on public.sales_payments(lead_id);
create index if not exists sales_payments_paid_idx on public.sales_payments(paid_at desc);

alter table public.sales_payments enable row level security;

drop policy if exists "payments admin all" on public.sales_payments;
create policy "payments admin all" on public.sales_payments
  for all using (is_sales_admin(auth.uid())) with check (is_sales_admin(auth.uid()));

drop policy if exists "payments exec own" on public.sales_payments;
create policy "payments exec own" on public.sales_payments
  for all using (
    is_sales_user(auth.uid()) and exists(
      select 1 from public.leads l where l.id = lead_id and l.assigned_to = auth.uid()
    )
  ) with check (
    is_sales_user(auth.uid()) and exists(
      select 1 from public.leads l where l.id = lead_id and l.assigned_to = auth.uid()
    )
  );

-- 4. Monthly sales targets per rep
create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  sales_user_id uuid not null references public.sales_users(id) on delete cascade,
  month date not null,  -- always first day of month
  target_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (sales_user_id, month)
);

alter table public.sales_targets enable row level security;

drop policy if exists "targets admin all" on public.sales_targets;
create policy "targets admin all" on public.sales_targets
  for all using (is_sales_admin(auth.uid())) with check (is_sales_admin(auth.uid()));

drop policy if exists "targets read own" on public.sales_targets;
create policy "targets read own" on public.sales_targets
  for select using (is_sales_user(auth.uid()) and sales_user_id = auth.uid());
