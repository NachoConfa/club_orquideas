import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import type { EventInput, EventSection, EventSectionInput, EventStatus, StoreEvent } from '../types/event';

const EVENT_COLUMNS =
  'id, title, slug, short_description, description, image_url, event_date, event_time, location, modality, status, capacity, whatsapp_message, is_active, sort_order, created_at, updated_at';
const EVENT_SECTION_COLUMNS =
  'id, event_id, title, description, image_url, sort_order, is_active, created_at, updated_at';

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

  const sectionsByEvent = new Map<string, EventSection[]>();
  ((data ?? []) as EventSection[]).forEach((section) => {
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
  })),
  deletedSectionIds: [],
});

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
      throw new Error('Cada seccion del evento necesita un titulo.');
    }

    if (section.id) {
      const { error } = await client
        .from('event_sections')
        .update(toSectionPayload(eventId, section))
        .eq('id', section.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client
        .from('event_sections')
        .insert({ id: createUuid(), ...toSectionPayload(eventId, section) });

      if (error) {
        throw error;
      }
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
