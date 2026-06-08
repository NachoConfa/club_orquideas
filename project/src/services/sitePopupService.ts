import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import type { SitePopup, SitePopupInput, SitePopupResponse } from '../types/sitePopup';

const SITE_POPUP_COLUMNS =
  'id, title, description, accept_label, dismiss_label, image_url, link_url, link_label, campaign_key, is_active, show_once, starts_at, ends_at, sort_order, created_at, updated_at';

const DEFAULT_ACCEPT_LABEL = 'Sí, quiero recibir novedades';
const DEFAULT_DISMISS_LABEL = 'Ahora no';

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

const isMissingTableError = (error: { code?: string; message?: string } | null | undefined) => {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('site_popups') ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
};

const toText = (value: unknown) => String(value ?? '').trim();
const toTextOrNull = (value: unknown) => toText(value) || null;
const toBoolean = (value: unknown, fallback = false) => (typeof value === 'boolean' ? value : fallback);
const toNumberOrDefault = (value: unknown, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const normalizeCampaignKey = (value: unknown, fallbackTitle: string) =>
  (toText(value) || fallbackTitle || `popup-${Date.now()}`)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `popup-${Date.now()}`;

const toIsoDateTimeOrNull = (value: unknown) => {
  const textValue = toText(value);
  if (!textValue) {
    return null;
  }

  const date = new Date(textValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const isPopupActiveNow = (popup: SitePopup, now = new Date()) => {
  if (!popup.is_active) {
    return false;
  }

  const startsAt = popup.starts_at ? new Date(popup.starts_at) : null;
  const endsAt = popup.ends_at ? new Date(popup.ends_at) : null;

  if (startsAt && !Number.isNaN(startsAt.getTime()) && startsAt > now) {
    return false;
  }

  if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt < now) {
    return false;
  }

  return true;
};

const mapPopup = (popup: SitePopup): SitePopup => ({
  ...popup,
  description: popup.description ?? null,
  accept_label: popup.accept_label || DEFAULT_ACCEPT_LABEL,
  dismiss_label: popup.dismiss_label || DEFAULT_DISMISS_LABEL,
  image_url: popup.image_url ?? null,
  link_url: popup.link_url ?? null,
  link_label: popup.link_label ?? null,
  is_active: popup.is_active === true,
  show_once: popup.show_once !== false,
  starts_at: popup.starts_at ?? null,
  ends_at: popup.ends_at ?? null,
  sort_order: toNumberOrDefault(popup.sort_order, 0),
});

export const emptySitePopupInput = (): SitePopupInput => ({
  title: '¿Querés recibir novedades?',
  description: 'Enterate antes que nadie de nuevos ingresos, promociones, eventos y consejos para cuidar tus plantas.',
  accept_label: DEFAULT_ACCEPT_LABEL,
  dismiss_label: DEFAULT_DISMISS_LABEL,
  image_url: '',
  link_url: '',
  link_label: '',
  campaign_key: `novedades-${new Date().getFullYear()}`,
  is_active: false,
  show_once: true,
  starts_at: '',
  ends_at: '',
  sort_order: 0,
});

export const sitePopupToInput = (popup: SitePopup): SitePopupInput => ({
  title: popup.title,
  description: popup.description ?? '',
  accept_label: popup.accept_label || DEFAULT_ACCEPT_LABEL,
  dismiss_label: popup.dismiss_label || DEFAULT_DISMISS_LABEL,
  image_url: popup.image_url ?? '',
  link_url: popup.link_url ?? '',
  link_label: popup.link_label ?? '',
  campaign_key: popup.campaign_key,
  is_active: popup.is_active,
  show_once: popup.show_once,
  starts_at: popup.starts_at ?? '',
  ends_at: popup.ends_at ?? '',
  sort_order: popup.sort_order ?? 0,
});

const toSitePopupPayload = (popup: SitePopupInput) => {
  const title = toText(popup.title);

  if (!title) {
    throw new Error('El pop-up necesita un titulo.');
  }

  return {
    title,
    description: toTextOrNull(popup.description),
    accept_label: toText(popup.accept_label) || DEFAULT_ACCEPT_LABEL,
    dismiss_label: toText(popup.dismiss_label) || DEFAULT_DISMISS_LABEL,
    image_url: toTextOrNull(popup.image_url),
    link_url: toTextOrNull(popup.link_url),
    link_label: toTextOrNull(popup.link_label),
    campaign_key: normalizeCampaignKey(popup.campaign_key, title),
    is_active: toBoolean(popup.is_active, false),
    show_once: toBoolean(popup.show_once, true),
    starts_at: toIsoDateTimeOrNull(popup.starts_at),
    ends_at: toIsoDateTimeOrNull(popup.ends_at),
    sort_order: toNumberOrDefault(popup.sort_order, 0),
  };
};

export const getActiveSitePopup = async (): Promise<SitePopup | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('site_popups')
    .select(SITE_POPUP_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (isMissingTableError(error)) {
    return null;
  }

  if (error) {
    throw error;
  }

  return ((data ?? []) as SitePopup[]).map(mapPopup).find((popup) => isPopupActiveNow(popup)) ?? null;
};

export const getAdminSitePopups = async (): Promise<SitePopup[]> => {
  const client = getClient();
  const { data, error } = await client
    .from('site_popups')
    .select(SITE_POPUP_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (isMissingTableError(error)) {
    return [];
  }

  if (error) {
    throw error;
  }

  return ((data ?? []) as SitePopup[]).map(mapPopup);
};

export const createSitePopup = async (popup: SitePopupInput): Promise<SitePopup> => {
  const client = getClient();
  const { data, error } = await client
    .from('site_popups')
    .insert({ id: createUuid(), ...toSitePopupPayload(popup) })
    .select(SITE_POPUP_COLUMNS)
    .single();

  if (isMissingTableError(error)) {
    throw new Error('Falta crear la tabla site_popups en Supabase.');
  }

  if (error) {
    throw error;
  }

  return mapPopup(data as SitePopup);
};

export const updateSitePopup = async (id: string, popup: SitePopupInput): Promise<SitePopup> => {
  const client = getClient();
  const { data, error } = await client
    .from('site_popups')
    .update(toSitePopupPayload(popup))
    .eq('id', id)
    .select(SITE_POPUP_COLUMNS)
    .single();

  if (isMissingTableError(error)) {
    throw new Error('Falta crear la tabla site_popups en Supabase.');
  }

  if (error) {
    throw error;
  }

  return mapPopup(data as SitePopup);
};

export const deleteSitePopup = async (id: string) => {
  const client = getClient();
  const { error } = await client.from('site_popups').delete().eq('id', id);

  if (isMissingTableError(error)) {
    throw new Error('Falta crear la tabla site_popups en Supabase.');
  }

  if (error) {
    throw error;
  }
};

export const getSitePopupStorageKey = (campaignKey: string) => `modo-plantas-popup-${campaignKey}`;

export const saveSitePopupPreference = (popup: SitePopup, response: SitePopupResponse) => {
  const storageKey = getSitePopupStorageKey(popup.campaign_key);
  const preference = {
    popupId: popup.id,
    campaignKey: popup.campaign_key,
    response,
    respondedAt: new Date().toISOString(),
  };

  try {
    const serializedPreference = JSON.stringify(preference);
    localStorage.setItem(storageKey, serializedPreference);

    if (!popup.show_once) {
      sessionStorage.setItem(storageKey, serializedPreference);
    }
  } catch {
    // El popup igualmente puede cerrarse aunque el navegador bloquee Storage.
  }
};

export const hasSitePopupPreference = (popup: SitePopup) => {
  try {
    const storageKey = getSitePopupStorageKey(popup.campaign_key);
    return popup.show_once
      ? Boolean(localStorage.getItem(storageKey))
      : Boolean(sessionStorage.getItem(storageKey));
  } catch {
    return false;
  }
};
