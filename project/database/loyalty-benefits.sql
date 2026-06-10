-- Carnet de socio: beneficios configurables de Modo Plantas.
-- Ejecutar manualmente en Supabase SQL Editor.

create table if not exists public.loyalty_benefits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  required_purchases integer not null check (required_purchases >= 0),
  benefit_type text not null default 'manual'
    check (benefit_type in ('gift', 'manual')),
  gift_description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loyalty_benefits_active_order_idx
on public.loyalty_benefits(is_active, required_purchases, sort_order);

alter table public.loyalty_benefits enable row level security;

drop policy if exists "Public can read active loyalty benefits" on public.loyalty_benefits;
create policy "Public can read active loyalty benefits"
on public.loyalty_benefits
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can read all loyalty benefits" on public.loyalty_benefits;
create policy "Admins can read all loyalty benefits"
on public.loyalty_benefits
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Admins can insert loyalty benefits" on public.loyalty_benefits;
create policy "Admins can insert loyalty benefits"
on public.loyalty_benefits
for insert
to authenticated
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can update loyalty benefits" on public.loyalty_benefits;
create policy "Admins can update loyalty benefits"
on public.loyalty_benefits
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can delete loyalty benefits" on public.loyalty_benefits;
create policy "Admins can delete loyalty benefits"
on public.loyalty_benefits
for delete
to authenticated
using (public.is_admin((select auth.uid())));

grant select on public.loyalty_benefits to anon, authenticated;
grant insert, update, delete on public.loyalty_benefits to authenticated;

notify pgrst, 'reload schema';
