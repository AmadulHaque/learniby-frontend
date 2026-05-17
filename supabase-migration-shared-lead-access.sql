-- Shared lead access — any sales user (admin or executive) can view and edit
-- ANY lead, not just leads assigned to them. This allows reps to cover for
-- each other when someone is on leave. Ownership (assigned_to) stays for
-- dashboards / scoring / target attribution. DELETE remains admin-only.

-- 1. Broaden can_access_lead: any sales user can access any lead.
create or replace function public.can_access_lead(_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_sales_user(auth.uid())
     and exists (select 1 from public.leads l where l.id = _lead_id);
$$;

-- 2. Leads — executives can SELECT/UPDATE any lead.
drop policy if exists "leads: exec select own or unassigned" on public.leads;
create policy "leads: exec select all"
  on public.leads for select
  to authenticated
  using (public.is_sales_user(auth.uid()));

drop policy if exists "leads: exec update own or claim" on public.leads;
create policy "leads: exec update all"
  on public.leads for update
  to authenticated
  using (public.is_sales_user(auth.uid()))
  with check (public.is_sales_user(auth.uid()));

-- 3. Follow-ups — any sales user can view/edit.
drop policy if exists "follow_ups: exec select own" on public.follow_ups;
create policy "follow_ups: exec select all"
  on public.follow_ups for select
  to authenticated
  using (public.is_sales_user(auth.uid()));

drop policy if exists "follow_ups: exec update own" on public.follow_ups;
create policy "follow_ups: exec update all"
  on public.follow_ups for update
  to authenticated
  using (public.is_sales_user(auth.uid()))
  with check (public.is_sales_user(auth.uid()));

-- 4. Sales payments — any sales user can view/insert/update; delete admin only.
drop policy if exists "payments exec own" on public.sales_payments;
create policy "payments: exec select all"
  on public.sales_payments for select
  to authenticated
  using (public.is_sales_user(auth.uid()));
create policy "payments: exec insert"
  on public.sales_payments for insert
  to authenticated
  with check (public.is_sales_user(auth.uid()));
create policy "payments: exec update all"
  on public.sales_payments for update
  to authenticated
  using (public.is_sales_user(auth.uid()))
  with check (public.is_sales_user(auth.uid()));
