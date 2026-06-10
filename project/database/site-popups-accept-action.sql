-- Acción configurable del botón aceptar en site_popups.
-- Ejecutar manualmente en Supabase SQL Editor (proyecto wcfxrqnesekpqzahadlc).

alter table public.site_popups
  add column if not exists accept_action text not null default 'dismiss';

alter table public.site_popups
  add column if not exists accept_link_url text;

alter table public.site_popups
  add column if not exists accept_whatsapp_message text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_popups_accept_action_check'
      and conrelid = 'public.site_popups'::regclass
  ) then
    alter table public.site_popups
    add constraint site_popups_accept_action_check
    check (accept_action in ('dismiss', 'link', 'whatsapp'));
  end if;
end;
$$;

notify pgrst, 'reload schema';
