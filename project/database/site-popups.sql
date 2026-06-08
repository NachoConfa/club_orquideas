-- Site pop-ups configurables para Modo Plantas.
-- Ejecutar manualmente en Supabase SQL Editor.

create table if not exists public.site_popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  accept_label text not null default 'Sí, quiero recibir novedades',
  dismiss_label text not null default 'Ahora no',
  image_url text,
  link_url text,
  link_label text,
  campaign_key text not null unique,
  is_active boolean not null default false,
  show_once boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_popups_active_schedule_idx
on public.site_popups(is_active, sort_order, starts_at, ends_at);

create index if not exists site_popups_campaign_key_idx
on public.site_popups(campaign_key);

alter table public.site_popups enable row level security;

drop policy if exists "Public can read active current site popups" on public.site_popups;
create policy "Public can read active current site popups"
on public.site_popups
for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "Admins can manage site popups" on public.site_popups;
create policy "Admins can manage site popups"
on public.site_popups
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

grant select on public.site_popups to anon, authenticated;
grant select, insert, update, delete on public.site_popups to authenticated;

notify pgrst, 'reload schema';
