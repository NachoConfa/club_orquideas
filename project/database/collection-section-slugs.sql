-- Slugs para paginas dedicadas de secciones de colecciones.
-- Ejecutar manualmente en Supabase SQL Editor.

alter table public.product_collection_sections
add column if not exists slug text;

do $$
declare
  section_record record;
  base_slug text;
  candidate_slug text;
  suffix integer;
begin
  for section_record in
    select id, collection_id, title, slug
    from public.product_collection_sections
    order by collection_id, sort_order, created_at, id
  loop
    base_slug := lower(
      regexp_replace(
        translate(
          coalesce(nullif(btrim(section_record.slug), ''), section_record.title, 'seccion'),
          'áéíóúüñÁÉÍÓÚÜÑ',
          'aeiouunAEIOUUN'
        ),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      )
    );
    base_slug := trim(both '-' from base_slug);

    if base_slug = '' then
      base_slug := 'seccion';
    end if;

    candidate_slug := base_slug;
    suffix := 2;

    while exists (
      select 1
      from public.product_collection_sections existing_section
      where existing_section.collection_id = section_record.collection_id
        and existing_section.id <> section_record.id
        and existing_section.slug = candidate_slug
    ) loop
      candidate_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    end loop;

    update public.product_collection_sections
    set slug = candidate_slug
    where id = section_record.id
      and slug is distinct from candidate_slug;
  end loop;
end
$$;

alter table public.product_collection_sections
alter column slug set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_collection_sections_collection_slug_key'
      and conrelid = 'public.product_collection_sections'::regclass
  ) then
    alter table public.product_collection_sections
    add constraint product_collection_sections_collection_slug_key
    unique (collection_id, slug);
  end if;
end
$$;

create index if not exists product_collection_sections_collection_slug_idx
on public.product_collection_sections(collection_id, slug);

notify pgrst, 'reload schema';
