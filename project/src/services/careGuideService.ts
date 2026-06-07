import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import type { CareGuide, CareGuideInput, CareGuideVariant, CareGuideVariantInput } from '../types/careGuide';

const CARE_GUIDE_COLUMNS =
  'id, title, slug, subtitle, category, difficulty, short_description, description, image_url, light, watering, temperature, humidity, fertilization, transplant, flowering, special_tips, is_active, sort_order, created_at, updated_at';
const CARE_GUIDE_VARIANT_COLUMNS =
  'id, care_guide_id, title, subtitle, description, image_url, light, watering, temperature, humidity, fertilization, transplant, flowering, special_tips, is_active, sort_order, created_at, updated_at';

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
    .replace(/^-+|-+$/g, '') || `cuidado-${Date.now()}`;

const getUniqueCareGuideCopySlug = async (guide: CareGuide) => {
  const client = getClient();
  const sourceSlug = normalizeSlug(guide.slug || guide.title);
  const copyBaseSlug = `${sourceSlug.replace(/-copia(?:-\d+)?$/, '')}-copia`;
  const { data, error } = await client
    .from('care_guides')
    .select('slug')
    .like('slug', `${copyBaseSlug}%`);

  if (error) {
    throw error;
  }

  const existingSlugs = new Set(
    ((data ?? []) as Array<{ slug?: string | null }>)
      .map((item) => item.slug)
      .filter((slug): slug is string => Boolean(slug))
  );

  if (!existingSlugs.has(copyBaseSlug)) {
    return copyBaseSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${copyBaseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${copyBaseSlug}-${suffix}`;
};

const parseSpecialTips = (value: string | string[] | null | undefined) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const stringifySpecialTips = (tips: string[] | null | undefined) => (tips ?? []).join('\n');

const normalizeText = (value: string) => value.trim() || null;

const toCareGuidePayload = (guide: CareGuideInput) => ({
  title: guide.title.trim(),
  slug: normalizeSlug(guide.slug || guide.title),
  subtitle: normalizeText(guide.subtitle),
  category: normalizeText(guide.category),
  difficulty: normalizeText(guide.difficulty),
  short_description: normalizeText(guide.short_description),
  description: normalizeText(guide.description),
  image_url: normalizeText(guide.image_url),
  light: normalizeText(guide.light),
  watering: normalizeText(guide.watering),
  temperature: normalizeText(guide.temperature),
  humidity: normalizeText(guide.humidity),
  fertilization: normalizeText(guide.fertilization),
  transplant: normalizeText(guide.transplant),
  flowering: normalizeText(guide.flowering),
  special_tips: parseSpecialTips(guide.special_tips),
  is_active: guide.is_active,
  sort_order: Number.isFinite(Number(guide.sort_order)) ? Number(guide.sort_order) : 0,
});

const toVariantPayload = (careGuideId: string, variant: CareGuideVariantInput) => ({
  care_guide_id: careGuideId,
  title: variant.title.trim(),
  subtitle: normalizeText(variant.subtitle),
  description: normalizeText(variant.description),
  image_url: normalizeText(variant.image_url),
  light: normalizeText(variant.light),
  watering: normalizeText(variant.watering),
  temperature: normalizeText(variant.temperature),
  humidity: normalizeText(variant.humidity),
  fertilization: normalizeText(variant.fertilization),
  transplant: normalizeText(variant.transplant),
  flowering: normalizeText(variant.flowering),
  special_tips: parseSpecialTips(variant.special_tips),
  is_active: variant.is_active,
  sort_order: Number.isFinite(Number(variant.sort_order)) ? Number(variant.sort_order) : 0,
});

const attachVariantsToGuides = async (guides: CareGuide[], onlyActive = false) => {
  if (guides.length === 0) {
    return guides;
  }

  const client = getClient();
  let query = client
    .from('care_guide_variants')
    .select(CARE_GUIDE_VARIANT_COLUMNS)
    .in('care_guide_id', guides.map((guide) => guide.id))
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const variantsByGuide = new Map<string, CareGuideVariant[]>();
  ((data ?? []) as CareGuideVariant[]).forEach((variant) => {
    const variants = variantsByGuide.get(variant.care_guide_id) ?? [];
    variants.push(variant);
    variantsByGuide.set(variant.care_guide_id, variants);
  });

  return guides.map((guide) => ({
    ...guide,
    variants: variantsByGuide.get(guide.id) ?? [],
  }));
};

export const emptyCareGuideInput = (): CareGuideInput => ({
  title: '',
  subtitle: '',
  category: '',
  difficulty: '',
  short_description: '',
  description: '',
  image_url: '',
  light: '',
  watering: '',
  temperature: '',
  humidity: '',
  fertilization: '',
  transplant: '',
  flowering: '',
  special_tips: '',
  is_active: true,
  sort_order: 0,
  variants: [],
  deletedVariantIds: [],
});

export const careGuideToInput = (guide: CareGuide): CareGuideInput => ({
  title: guide.title,
  slug: guide.slug,
  subtitle: guide.subtitle || '',
  category: guide.category || '',
  difficulty: guide.difficulty || '',
  short_description: guide.short_description || '',
  description: guide.description || '',
  image_url: guide.image_url || '',
  light: guide.light || '',
  watering: guide.watering || '',
  temperature: guide.temperature || '',
  humidity: guide.humidity || '',
  fertilization: guide.fertilization || '',
  transplant: guide.transplant || '',
  flowering: guide.flowering || '',
  special_tips: stringifySpecialTips(guide.special_tips),
  is_active: Boolean(guide.is_active),
  sort_order: Number(guide.sort_order || 0),
  variants: (guide.variants ?? []).map((variant) => ({
    id: variant.id,
    title: variant.title,
    subtitle: variant.subtitle || '',
    description: variant.description || '',
    image_url: variant.image_url || '',
    light: variant.light || '',
    watering: variant.watering || '',
    temperature: variant.temperature || '',
    humidity: variant.humidity || '',
    fertilization: variant.fertilization || '',
    transplant: variant.transplant || '',
    flowering: variant.flowering || '',
    special_tips: stringifySpecialTips(variant.special_tips),
    is_active: Boolean(variant.is_active),
    sort_order: Number(variant.sort_order || 0),
  })),
  deletedVariantIds: [],
});

export const getActiveCareGuides = async () => {
  const client = getClient();
  const { data, error } = await client
    .from('care_guides')
    .select(CARE_GUIDE_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }

  return attachVariantsToGuides((data ?? []) as CareGuide[], true);
};

export const getActiveCareGuideBySlug = async (slug: string) => {
  const client = getClient();
  const { data, error } = await client
    .from('care_guides')
    .select(CARE_GUIDE_COLUMNS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [guide] = await attachVariantsToGuides([data as CareGuide], true);
  return guide;
};

export const getAdminCareGuides = async () => {
  const client = getClient();
  const { data, error } = await client
    .from('care_guides')
    .select(CARE_GUIDE_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }

  return attachVariantsToGuides((data ?? []) as CareGuide[]);
};

const saveCareGuideVariants = async (careGuideId: string, guide: CareGuideInput) => {
  const client = getClient();
  const deletedVariantIds = guide.deletedVariantIds ?? [];

  if (deletedVariantIds.length > 0) {
    const { error } = await client.from('care_guide_variants').delete().in('id', deletedVariantIds);
    if (error) {
      throw error;
    }
  }

  for (const variant of guide.variants ?? []) {
    if (!variant.title.trim()) {
      throw new Error('Cada seccion del cuidado necesita un titulo.');
    }

    if (variant.id) {
      const { error } = await client
        .from('care_guide_variants')
        .update(toVariantPayload(careGuideId, variant))
        .eq('id', variant.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client
        .from('care_guide_variants')
        .insert({ id: createUuid(), ...toVariantPayload(careGuideId, variant) });

      if (error) {
        throw error;
      }
    }
  }
};

export const createCareGuide = async (guide: CareGuideInput) => {
  const client = getClient();
  const { data, error } = await client
    .from('care_guides')
    .insert({ id: createUuid(), ...toCareGuidePayload(guide) })
    .select(CARE_GUIDE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const createdGuide = data as CareGuide;
  await saveCareGuideVariants(createdGuide.id, guide);
  return (await attachVariantsToGuides([createdGuide]))[0];
};

export const duplicateCareGuide = async (source: CareGuide) => {
  const client = getClient();
  const duplicateInput: CareGuideInput = {
    ...careGuideToInput(source),
    title: `${source.title} (copia)`,
    slug: await getUniqueCareGuideCopySlug(source),
    is_active: false,
    variants: (source.variants ?? []).map((variant) => ({
      title: variant.title,
      subtitle: variant.subtitle || '',
      description: variant.description || '',
      image_url: variant.image_url || '',
      light: variant.light || '',
      watering: variant.watering || '',
      temperature: variant.temperature || '',
      humidity: variant.humidity || '',
      fertilization: variant.fertilization || '',
      transplant: variant.transplant || '',
      flowering: variant.flowering || '',
      special_tips: stringifySpecialTips(variant.special_tips),
      is_active: Boolean(variant.is_active),
      sort_order: Number(variant.sort_order ?? 0),
    })),
    deletedVariantIds: [],
  };
  const duplicateId = createUuid();

  try {
    const { data, error } = await client
      .from('care_guides')
      .insert({ id: duplicateId, ...toCareGuidePayload(duplicateInput) })
      .select(CARE_GUIDE_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    const duplicatedGuide = data as CareGuide;
    await saveCareGuideVariants(duplicatedGuide.id, duplicateInput);
    return (await attachVariantsToGuides([duplicatedGuide]))[0];
  } catch (error) {
    await client.from('care_guides').delete().eq('id', duplicateId);
    throw error;
  }
};

export const updateCareGuide = async (id: string, guide: CareGuideInput) => {
  const client = getClient();
  const { data, error } = await client
    .from('care_guides')
    .update(toCareGuidePayload(guide))
    .eq('id', id)
    .select(CARE_GUIDE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const updatedGuide = data as CareGuide;
  await saveCareGuideVariants(updatedGuide.id, guide);
  return (await attachVariantsToGuides([updatedGuide]))[0];
};

export const deleteCareGuide = async (id: string) => {
  const client = getClient();
  const { error } = await client.from('care_guides').delete().eq('id', id);

  if (error) {
    throw error;
  }
};
