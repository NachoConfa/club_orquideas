import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import type {
  EventInput,
  EventRelatedProduct,
  EventRelatedProductVariant,
  EventSection,
  EventSectionInput,
  EventSectionProduct,
  EventSectionProductInput,
  EventStatus,
  StoreEvent,
} from '../types/event';

const EVENT_COLUMNS =
  'id, title, slug, short_description, description, image_url, event_date, event_time, location, modality, status, capacity, whatsapp_message, is_active, sort_order, created_at, updated_at';
const EVENT_SECTION_COLUMNS =
  'id, event_id, title, description, image_url, sort_order, is_active, created_at, updated_at';
const EVENT_SECTION_PRODUCT_COLUMNS = 'id, event_section_id, product_id, sort_order, created_at';
const EVENT_PRODUCT_COLUMNS =
  'id, name, slug, description, price, stock, orchid_type, color, size, image_url, is_active, stock_mode';
const EVENT_PRODUCT_VARIANT_COLUMNS =
  'id, product_id, price, stock, stock_mode, image_url, is_active, sort_order';

const getClient = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

const createUuid = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomHex = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}-${randomHex(12)}`;
};

const normalizeSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `evento-${Date.now()}`;

const normalizeText = (value: string) => value.trim() || null;

const normalizeNumber = (value: unknown) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const isMissingTableError = (error: { code?: string; message?: string } | null) => {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  );
};

const normalizeEventStatus = (status?: string | null): EventStatus => {
  if (status === 'available' || status === 'finished') {
    return status;
  }

  return 'upcoming';
};

const toEventPayload = (event: EventInput) => ({
  title: event.title.trim(),
  slug: normalizeSlug(event.slug || event.title),
  short_description: normalizeText(event.short_description),
  description: normalizeText(event.description),
  image_url: normalizeText(event.image_url),
  event_date: event.event_date || null,
  event_time: normalizeText(event.event_time),
  location: normalizeText(event.location),
  modality: normalizeText(event.modality),
  status: normalizeEventStatus(event.status),
  capacity: normalizeText(event.capacity),
  whatsapp_message: normalizeText(event.whatsapp_message),
  is_active: event.is_active,
  sort_order: Number.isFinite(Number(event.sort_order)) ? Number(event.sort_order) : 0,
});

const toSectionPayload = (eventId: string, section: EventSectionInput) => ({
  event_id: eventId,
  title: section.title.trim(),
  description: normalizeText(section.description),
  image_url: normalizeText(section.image_url),
  sort_order: Number.isFinite(Number(section.sort_order)) ? Number(section.sort_order) : 0,
  is_active: section.is_active,
});

const mapRelatedProduct = (product: EventRelatedProduct): EventRelatedProduct => ({
  id: String(product.id),
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: normalizeNumber(product.price),
  stock: normalizeNumber(product.stock),
  stock_mode: product.stock_mode === 'consult' ? 'consult' : 'quantity',
  orchid_type: product.orchid_type,
  color: product.color,
  size: product.size,
  image_url: product.image_url,
  is_active: product.is_active !== false,
  variants: [],
});

const mapRelatedProductVariant = (variant: EventRelatedProductVariant): EventRelatedProductVariant => ({
  id: String(variant.id),
  product_id: String(variant.product_id),
  price: normalizeNumber(variant.price),
  stock: normalizeNumber(variant.stock),
  stock_mode: variant.stock_mode === 'consult' ? 'consult' : 'quantity',
  image_url: variant.image_url,
  is_active: variant.is_active !== false,
  sort_order: normalizeNumber(variant.sort_order),
});

const attachProductsToSections = async (sections: EventSection[], onlyActive = false) => {
  if (sections.length === 0) {
    return sections;
  }

  const client = getClient();
  const { data: relationData, error: relationError } = await client
    .from('event_section_products')
    .select(EVENT_SECTION_PRODUCT_COLUMNS)
    .in('event_section_id', sections.map((section) => section.id))
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (isMissingTableError(relationError)) {
    return sections.map((section) => ({ ...section, products: [] }));
  }

  if (relationError) {
    throw relationError;
  }

  const relations = (relationData ?? []) as EventSectionProduct[];

  if (relations.length === 0) {
    return sections.map((section) => ({ ...section, products: [] }));
  }

  const productIds = Array.from(new Set(relations.map((relation) => relation.product_id).filter(Boolean)));

  let productQuery = client.from('products').select(EVENT_PRODUCT_COLUMNS).in('id', productIds);

  if (onlyActive) {
    productQuery = productQuery.eq('is_active', true);
  }

  const { data: productData, error: productError } = await productQuery;

  if (productError) {
    throw productError;
  }

  let variantQuery = client
    .from('product_variants')
    .select(EVENT_PRODUCT_VARIANT_COLUMNS)
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });

  if (onlyActive) {
    variantQuery = variantQuery.eq('is_active', true);
  }

  const { data: variantData, error: variantError } = await variantQuery;

  if (variantError) {
    throw variantError;
  }

  const variantsByProduct = new Map<string, EventRelatedProductVariant[]>();
  ((variantData ?? []) as EventRelatedProductVariant[]).forEach((variant) => {
    const productId = String(variant.product_id);
    const variants = variantsByProduct.get(productId) ?? [];
    variants.push(mapRelatedProductVariant(variant));
    variantsByProduct.set(productId, variants);
  });

  const productsById = new Map<string, EventRelatedProduct>();
  ((productData ?? []) as EventRelatedProduct[]).forEach((product) => {
    const mappedProduct = mapRelatedProduct(product);
    mappedProduct.variants = variantsByProduct.get(mappedProduct.id) ?? [];
    productsById.set(mappedProduct.id, mappedProduct);
  });

  const relationsBySection = new Map<string, EventSectionProduct[]>();
  relations.forEach((relation) => {
    const product = productsById.get(String(relation.product_id));

    if (!product) {
      return;
    }

    const sectionRelations = relationsBySection.get(relation.event_section_id) ?? [];
    sectionRelations.push({
      ...relation,
      sort_order: normalizeNumber(relation.sort_order),
      product,
    });
    relationsBySection.set(relation.event_section_id, sectionRelations);
  });

  return sections.map((section) => ({
    ...section,
    products: relationsBySection.get(section.id) ?? [],
  }));
};

const attachSectionsToEvents = async (events: StoreEvent[], onlyActive = false) => {
  if (events.length === 0) {
    return events;
  }

  const client = getClient();
  let query = client
    .from('event_sections')
    .select(EVENT_SECTION_COLUMNS)
    .in('event_id', events.map((event) => event.id))
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const sectionsWithProducts = await attachProductsToSections((data ?? []) as EventSection[], onlyActive);
  const sectionsByEvent = new Map<string, EventSection[]>();
  sectionsWithProducts.forEach((section) => {
    const sections = sectionsByEvent.get(section.event_id) ?? [];
    sections.push(section);
    sectionsByEvent.set(section.event_id, sections);
  });

  return events.map((event) => ({
    ...event,
    sections: sectionsByEvent.get(event.id) ?? [],
  }));
};

export const emptyEventInput = (): EventInput => ({
  title: '',
  short_description: '',
  description: '',
  image_url: '',
  event_date: '',
  event_time: '',
  location: '',
  modality: '',
  status: 'upcoming',
  capacity: '',
  whatsapp_message: '',
  is_active: true,
  sort_order: 0,
  sections: [],
  deletedSectionIds: [],
});

export const eventToInput = (event: StoreEvent): EventInput => ({
  title: event.title,
  slug: event.slug,
  short_description: event.short_description || '',
  description: event.description || '',
  image_url: event.image_url || '',
  event_date: event.event_date || '',
  event_time: event.event_time || '',
  location: event.location || '',
  modality: event.modality || '',
  status: normalizeEventStatus(event.status),
  capacity: event.capacity || '',
  whatsapp_message: event.whatsapp_message || '',
  is_active: Boolean(event.is_active),
  sort_order: Number(event.sort_order || 0),
  sections: (event.sections ?? []).map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description || '',
    image_url: section.image_url || '',
    sort_order: Number(section.sort_order || 0),
    is_active: Boolean(section.is_active),
    products: (section.products ?? []).map((relation) => ({
      id: relation.id,
      product_id: relation.product_id,
      sort_order: Number(relation.sort_order || 0),
    })),
  })),
  deletedSectionIds: [],
});

const saveSectionProducts = async (sectionId: string, products: EventSectionProductInput[] = []) => {
  const client = getClient();
  const { error: deleteError } = await client.from('event_section_products').delete().eq('event_section_id', sectionId);

  if (isMissingTableError(deleteError)) {
    if (products.length === 0) {
      return;
    }

    throw new Error('Falta crear la tabla event_section_products en Supabase.');
  }

  if (deleteError) {
    throw deleteError;
  }

  const uniqueProducts = Array.from(
    new Map(
      products
        .filter((product) => product.product_id)
        .map((product, index) => [
          product.product_id,
          {
            id: product.id || createUuid(),
            event_section_id: sectionId,
            product_id: product.product_id,
            sort_order: Number.isFinite(Number(product.sort_order)) ? Number(product.sort_order) : index + 1,
          },
        ])
    ).values()
  );

  if (uniqueProducts.length === 0) {
    return;
  }

  const { error: insertError } = await client.from('event_section_products').insert(uniqueProducts);

  if (isMissingTableError(insertError)) {
    throw new Error('Falta crear la tabla event_section_products en Supabase.');
  }

  if (insertError) {
    throw insertError;
  }
};

export const getActiveEvents = async () => {
  const client = getClient();
  const { data, error } = await client
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }

  return attachSectionsToEvents((data ?? []) as StoreEvent[], true);
};

export const getActiveEventBySlug = async (slug: string) => {
  const client = getClient();
  const { data, error } = await client
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [event] = await attachSectionsToEvents([data as StoreEvent], true);
  return event;
};

export const getAdminEvents = async () => {
  const client = getClient();
  const { data, error } = await client
    .from('events')
    .select(EVENT_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }

  return attachSectionsToEvents((data ?? []) as StoreEvent[]);
};

const saveEventSections = async (eventId: string, event: EventInput) => {
  const client = getClient();
  const deletedSectionIds = event.deletedSectionIds ?? [];

  if (deletedSectionIds.length > 0) {
    const { error } = await client.from('event_sections').delete().in('id', deletedSectionIds);
    if (error) {
      throw error;
    }
  }

  for (const section of event.sections ?? []) {
    if (!section.title.trim()) {
      throw new Error('Cada sección del evento necesita un título.');
    }

    let sectionId = section.id;

    if (section.id) {
      const { error } = await client
        .from('event_sections')
        .update(toSectionPayload(eventId, section))
        .eq('id', section.id);

      if (error) {
        throw error;
      }
    } else {
      const { data, error } = await client
        .from('event_sections')
        .insert({ id: createUuid(), ...toSectionPayload(eventId, section) })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      sectionId = data?.id;
    }

    if (sectionId) {
      await saveSectionProducts(sectionId, section.products);
    }
  }
};

export const createEvent = async (event: EventInput) => {
  const client = getClient();
  const { data, error } = await client
    .from('events')
    .insert({ id: createUuid(), ...toEventPayload(event) })
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const createdEvent = data as StoreEvent;
  await saveEventSections(createdEvent.id, event);
  return (await attachSectionsToEvents([createdEvent]))[0];
};

export const updateEvent = async (id: string, event: EventInput) => {
  const client = getClient();
  const { data, error } = await client
    .from('events')
    .update(toEventPayload(event))
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const updatedEvent = data as StoreEvent;
  await saveEventSections(updatedEvent.id, event);
  return (await attachSectionsToEvents([updatedEvent]))[0];
};

export const deleteEvent = async (id: string) => {
  const client = getClient();
  const { error } = await client.from('events').delete().eq('id', id);

  if (error) {
    throw error;
  }
};
