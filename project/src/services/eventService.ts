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

export const toRequiredText = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

export const toTextOrNull = (value: unknown) => toRequiredText(value) || null;

export const toNumberOrDefault = (value: unknown, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const toStringIdOrNull = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim() || null;
};

const toBooleanOrDefault = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalizedValue = toRequiredText(value).toLowerCase();

  if (['true', '1', 'yes', 'si', 'sí'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalizedValue)) {
    return false;
  }

  return fallback;
};

const isValidCalendarDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const formatDateParts = (year: number, month: number, day: number) => {
  if (!isValidCalendarDate(year, month, day)) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const normalizeDateForSupabase = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const textValue = toRequiredText(value);

  if (!textValue) {
    return null;
  }

  const isoMatch = textValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (isoMatch) {
    return formatDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const argentineMatch = textValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (argentineMatch) {
    return formatDateParts(
      Number(argentineMatch[3]),
      Number(argentineMatch[2]),
      Number(argentineMatch[1])
    );
  }

  return null;
};

const normalizeSlug = (value: unknown) =>
  toRequiredText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `evento-${Date.now()}`;

const normalizeNumber = (value: unknown) => {
  return toNumberOrDefault(value, 0);
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

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

const getSupabaseErrorData = (error: unknown) => {
  const source = error && typeof error === 'object' ? (error as SupabaseErrorLike) : {};

  return {
    code: toTextOrNull(source.code),
    message: toTextOrNull(source.message),
    details: toTextOrNull(source.details),
    hint: toTextOrNull(source.hint),
  };
};

const throwSupabaseError = (operation: string, payload: unknown, error: unknown): never => {
  const errorData = getSupabaseErrorData(error);

  console.error(`[Eventos] ${operation}`, {
    payload,
    error: errorData,
  });

  const message =
    [errorData.message, errorData.details, errorData.hint].filter(Boolean).join(' · ') ||
    'No se pudo completar la operación en Supabase.';

  throw new Error(message);
};

const normalizeEventStatus = (status: unknown): EventStatus => {
  const normalizedStatus = toRequiredText(status)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalizedStatus === 'available' || normalizedStatus === 'disponible') {
    return 'available';
  }

  if (normalizedStatus === 'finished' || normalizedStatus === 'finalizado') {
    return 'finished';
  }

  return 'upcoming';
};

const toEventPayload = (event: EventInput) => {
  const title = toRequiredText(event.title);
  const rawDate = toRequiredText(event.event_date);
  const eventDate = normalizeDateForSupabase(event.event_date);

  if (!title) {
    throw new Error('El evento necesita un título.');
  }

  if (rawDate && !eventDate) {
    throw new Error('La fecha del evento debe tener formato DD/MM/AAAA o AAAA-MM-DD.');
  }

  return {
    title,
    slug: normalizeSlug(event.slug || title),
    short_description: toTextOrNull(event.short_description),
    description: toTextOrNull(event.description),
    image_url: toTextOrNull(event.image_url),
    event_date: eventDate,
    event_time: toTextOrNull(event.event_time),
    location: toTextOrNull(event.location),
    modality: toTextOrNull(event.modality),
    status: normalizeEventStatus(event.status),
    capacity: toTextOrNull(event.capacity),
    whatsapp_message: toTextOrNull(event.whatsapp_message),
    is_active: toBooleanOrDefault(event.is_active, true),
    sort_order: toNumberOrDefault(event.sort_order, 0),
  };
};

const toSectionPayload = (eventId: unknown, section: EventSectionInput) => ({
  event_id: toRequiredText(eventId),
  title: toRequiredText(section.title),
  description: toTextOrNull(section.description),
  image_url: toTextOrNull(section.image_url),
  sort_order: toNumberOrDefault(section.sort_order, 0),
  is_active: toBooleanOrDefault(section.is_active, true),
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
  title: toRequiredText(event.title),
  slug: toRequiredText(event.slug),
  short_description: toRequiredText(event.short_description),
  description: toRequiredText(event.description),
  image_url: toRequiredText(event.image_url),
  event_date: normalizeDateForSupabase(event.event_date) ?? '',
  event_time: toRequiredText(event.event_time),
  location: toRequiredText(event.location),
  modality: toRequiredText(event.modality),
  status: normalizeEventStatus(event.status),
  capacity: toRequiredText(event.capacity),
  whatsapp_message: toRequiredText(event.whatsapp_message),
  is_active: toBooleanOrDefault(event.is_active, true),
  sort_order: toNumberOrDefault(event.sort_order, 0),
  sections: (Array.isArray(event.sections) ? event.sections : []).map((section) => ({
    id: toRequiredText(section.id) || undefined,
    title: toRequiredText(section.title),
    description: toRequiredText(section.description),
    image_url: toRequiredText(section.image_url),
    sort_order: toNumberOrDefault(section.sort_order, 0),
    is_active: toBooleanOrDefault(section.is_active, true),
    products: (Array.isArray(section.products) ? section.products : [])
      .map((relation) => ({
        id: toRequiredText(relation.id) || undefined,
        product_id: toRequiredText(relation.product_id),
        sort_order: toNumberOrDefault(relation.sort_order, 0),
      }))
      .filter((relation) => Boolean(relation.product_id)),
  })),
  deletedSectionIds: [],
});

const saveSectionProducts = async (sectionId: string, products: EventSectionProductInput[] = []) => {
  const client = getClient();
  const normalizedSectionId = toRequiredText(sectionId);
  const productInputs = Array.isArray(products) ? products : [];
  const { error: deleteError } = await client
    .from('event_section_products')
    .delete()
    .eq('event_section_id', normalizedSectionId);

  if (isMissingTableError(deleteError)) {
    if (productInputs.length === 0) {
      return;
    }

    throw new Error('Falta crear la tabla event_section_products en Supabase.');
  }

  if (deleteError) {
    throwSupabaseError(
      'No se pudieron limpiar los productos relacionados de la sección.',
      { event_section_id: normalizedSectionId },
      deleteError
    );
  }

  const uniqueProductsById = new Map<
    string,
    {
      id: string;
      event_section_id: string;
      product_id: string;
      sort_order: number;
    }
  >();

  productInputs.forEach((product, index) => {
    const productId = toStringIdOrNull(product?.product_id);

    if (!productId) {
      return;
    }

    uniqueProductsById.set(productId, {
      id: toStringIdOrNull(product?.id) || createUuid(),
      event_section_id: normalizedSectionId,
      product_id: productId,
      sort_order: toNumberOrDefault(product?.sort_order, index + 1),
    });
  });

  const uniqueProducts = Array.from(uniqueProductsById.values());

  if (uniqueProducts.length === 0) {
    return;
  }

  const { error: insertError } = await client.from('event_section_products').insert(uniqueProducts);

  if (isMissingTableError(insertError)) {
    throw new Error('Falta crear la tabla event_section_products en Supabase.');
  }

  if (insertError) {
    throwSupabaseError('No se pudieron guardar los productos relacionados de la sección.', uniqueProducts, insertError);
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
  const normalizedEventId = toRequiredText(eventId);
  const deletedSectionIds = (Array.isArray(event.deletedSectionIds) ? event.deletedSectionIds : [])
    .map((sectionId) => toRequiredText(sectionId))
    .filter(Boolean);

  if (deletedSectionIds.length > 0) {
    const { error } = await client.from('event_sections').delete().in('id', deletedSectionIds);
    if (error) {
      throwSupabaseError('No se pudieron eliminar las secciones quitadas.', { deletedSectionIds }, error);
    }
  }

  const sections = Array.isArray(event.sections) ? event.sections : [];

  for (const section of sections) {
    const sectionTitle = toRequiredText(section?.title);

    if (!sectionTitle) {
      throw new Error('Cada sección del evento necesita un título.');
    }

    let sectionId = toRequiredText(section?.id);
    const sectionPayload = toSectionPayload(normalizedEventId, {
      ...section,
      title: sectionTitle,
    });

    if (sectionId) {
      const { error } = await client
        .from('event_sections')
        .update(sectionPayload)
        .eq('id', sectionId);

      if (error) {
        throwSupabaseError('No se pudo actualizar una sección del evento.', sectionPayload, error);
      }
    } else {
      const insertPayload = { id: createUuid(), ...sectionPayload };
      const { data, error } = await client
        .from('event_sections')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        throwSupabaseError('No se pudo crear una sección del evento.', insertPayload, error);
      }

      sectionId = toRequiredText(data?.id);
    }

    if (sectionId) {
      await saveSectionProducts(sectionId, Array.isArray(section.products) ? section.products : []);
    }
  }
};

export const createEvent = async (event: EventInput) => {
  const client = getClient();
  const eventPayload = { id: createUuid(), ...toEventPayload(event) };
  const { data, error } = await client
    .from('events')
    .insert(eventPayload)
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    throwSupabaseError('No se pudo crear el evento.', eventPayload, error);
  }

  const createdEvent = data as StoreEvent;
  await saveEventSections(createdEvent.id, event);
  return (await attachSectionsToEvents([createdEvent]))[0];
};

export const updateEvent = async (id: string, event: EventInput) => {
  const client = getClient();
  const eventId = toRequiredText(id);
  const eventPayload = toEventPayload(event);
  const { data, error } = await client
    .from('events')
    .update(eventPayload)
    .eq('id', eventId)
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    throwSupabaseError('No se pudo actualizar el evento.', { id: eventId, ...eventPayload }, error);
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
