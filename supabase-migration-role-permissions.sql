-- Role-level default permission sets editable by sales admins.
create table if not exists public.sales_role_permissions (
  role public.sales_role primary key,
  permissions text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.sales_role_permissions enable row level security;

drop policy if exists "Sales users can read role permissions" on public.sales_role_permissions;
create policy "Sales users can read role permissions"
  on public.sales_role_permissions for select
  to authenticated
  using (public.is_sales_user(auth.uid()));

drop policy if exists "Sales admins manage role permissions" on public.sales_role_permissions;
create policy "Sales admins manage role permissions"
  on public.sales_role_permissions for all
  to authenticated
  using (public.is_sales_admin(auth.uid()))
  with check (public.is_sales_admin(auth.uid()));

-- Seed defaults (admin row exists for completeness; admin always has all perms in code).
insert into public.sales_role_permissions (role, permissions) values
  ('admin', array[
    'leads.create','leads.edit','leads.delete','leads.view_all',
    'leads.reassign','leads.bulk','import.csv','export.data'
  ]),
  ('executive', array[
    'leads.create','leads.edit'
  ])
on conflict (role) do nothing;

create or replace function public.touch_sales_role_permissions()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_sales_role_permissions_touch on public.sales_role_permissions;
create trigger trg_sales_role_permissions_touch
  before update on public.sales_role_permissions
  for each row execute function public.touch_sales_role_permissions();
