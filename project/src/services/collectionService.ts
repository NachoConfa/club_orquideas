import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import type {
  CollectionRelatedProduct,
  CollectionRelatedProductVariant,
  ProductCollection,
  ProductCollectionInput,
  ProductCollectionSection,
  ProductCollectionSectionInput,
  ProductCollectionSectionProduct,
  ProductCollectionSectionProductInput,
} from '../types/collection';
import {
  toNumberOrDefault,
  toRequiredText,
  toTextOrNull,
} from './eventService';

const COLLECTION_COLUMNS =
  'id, title, slug, subtitle, description, image_url, is_active, sort_order, created_at, updated_at';
const COLLECTION_SECTION_COLUMNS =
  'id, collection_id, title, description, image_url, is_active, sort_order, created_at, updated_at';
const COLLECTION_SECTION_PRODUCT_COLUMNS =
  'id, collection_section_id, product_id, sort_order, created_at';
const COLLECTION_PRODUCT_COLUMNS =
  'id, name, slug, description, price, stock, orchid_type, color, size, image_url, is_active, stock_mode, price_mode';
const COLLECTION_PRODUCT_COLUMNS_WITHOUT_PRICE_MODE =
  'id, name, slug, description, price, stock, orchid_type, color, size, image_url, is_active, stock_mode';
const COLLECTION_PRODUCT_VARIANT_COLUMNS =
  'id, product_id, price, stock, stock_mode, price_mode, image_url, is_active, sort_order';
const COLLECTION_PRODUCT_VARIANT_COLUMNS_WITHOUT_PRICE_MODE =
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

const normalizeSlug = (value: unknown) =>
  toRequiredText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `coleccion-${Date.now()}`;

const isMissingTableError = (error: { code?: string; message?: string } | null) => {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('could not find the table') ||
    message.includes('does not exist')
  );
};

const isMissingPriceModeColumnError = (error: { code?: string; message?: string } | null) => {
  const message = error?.message?.toLowerCase() ?? '';
  return error?.code === 'PGRST204' || error?.code === '42703' || message.includes('price_mode');
};

const toStringIdOrNull = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim() || null;
};

const toBooleanOrDefault = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalizedValue = toRequiredText(value).toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí'].includes(normalizedValue)) return true;
  if (['false', '0', 'no'].includes(normalizedValue)) return false;
  return fallback;
};

const normalizeNumber = (value: unknown) => toNumberOrDefault(value, 0);

const toCollectionPayload = (collection: ProductCollectionInput) => {
  const title = toRequiredText(collection.title);

  if (!title) {
    throw new Error('La colección necesita un título.');
  }

  return {
    title,
    slug: normalizeSlug(collection.slug || title),
    subtitle: toTextOrNull(collection.subtitle),
    description: toTextOrNull(collection.description),
    image_url: toTextOrNull(collection.image_url),
    is_active: toBooleanOrDefault(collection.is_active, true),
    sort_order: toNumberOrDefault(collection.sort_order, 0),
  };
};

const toSectionPayload = (collectionId: unknown, section: ProductCollectionSectionInput) => ({
  collection_id: toRequiredText(collectionId),
  title: toRequiredText(section.title),
  description: toTextOrNull(section.description),
  image_url: toTextOrNull(section.image_url),
  is_active: toBooleanOrDefault(section.is_active, true),
  sort_order: toNumberOrDefault(section.sort_order, 0),
});

const mapRelatedProduct = (product: CollectionRelatedProduct): CollectionRelatedProduct => ({
  id: String(product.id),
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: normalizeNumber(product.price),
  price_mode: product.price_mode === 'quote' ? 'quote' : 'fixed',
  stock: normalizeNumber(product.stock),
  stock_mode: product.stock_mode === 'consult' ? 'consult' : 'quantity',
  orchid_type: product.orchid_type,
  color: product.color,
  size: product.size,
  image_url: product.image_url,
  is_active: product.is_active !== false,
  variants: [],
});

const mapRelatedProductVariant = (
  variant: CollectionRelatedProductVariant
): CollectionRelatedProductVariant => ({
  id: String(variant.id),
  product_id: String(variant.product_id),
  price: normalizeNumber(variant.price),
  price_mode: variant.price_mode === 'quote' ? 'quote' : 'fixed',
  stock: normalizeNumber(variant.stock),
  stock_mode: variant.stock_mode === 'consult' ? 'consult' : 'quantity',
  image_url: variant.image_url,
  is_active: variant.is_active !== false,
  sort_order: normalizeNumber(variant.sort_order),
});

const attachProductsToSections = async (sections: ProductCollectionSection[], onlyActive = false) => {
  if (sections.length === 0) {
    return sections;
  }

  const client = getClient();
  const { data: relationData, error: relationError } = await client
    .from('product_collection_section_products')
    .select(COLLECTION_SECTION_PRODUCT_COLUMNS)
    .in('collection_section_id', sections.map((section) => section.id))
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (isMissingTableError(relationError)) {
    return sections.map((section) => ({ ...section, products: [] }));
  }

  if (relationError) {
    throw relationError;
  }

  const relations = (relationData ?? []) as ProductCollectionSectionProduct[];
  if (relations.length === 0) {
    return sections.map((section) => ({ ...section, products: [] }));
  }

  const productIds = Array.from(new Set(relations.map((relation) => relation.product_id).filter(Boolean)));
  let productQuery = client.from('products').select(COLLECTION_PRODUCT_COLUMNS).in('id', productIds);

  if (onlyActive) {
    productQuery = productQuery.eq('is_active', true);
  }

  let { data: productData, error: productError } = await productQuery;

  if (isMissingPriceModeColumnError(productError)) {
    productQuery = client.from('products').select(COLLECTION_PRODUCT_COLUMNS_WITHOUT_PRICE_MODE).in('id', productIds);

    if (onlyActive) {
      productQuery = productQuery.eq('is_active', true);
    }

    const fallbackResult = await productQuery;
    productData = fallbackResult.data;
    productError = fallbackResult.error;
  }

  if (productError) {
    throw productError;
  }

  let variantQuery = client
    .from('product_variants')
    .select(COLLECTION_PRODUCT_VARIANT_COLUMNS)
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });

  if (onlyActive) {
    variantQuery = variantQuery.eq('is_active', true);
  }

  let { data: variantData, error: variantError } = await variantQuery;

  if (isMissingPriceModeColumnError(variantError)) {
    variantQuery = client
      .from('product_variants')
      .select(COLLECTION_PRODUCT_VARIANT_COLUMNS_WITHOUT_PRICE_MODE)
      .in('product_id', productIds)
      .order('sort_order', { ascending: true });

    if (onlyActive) {
      variantQuery = variantQuery.eq('is_active', true);
    }

    const fallbackResult = await variantQuery;
    variantData = fallbackResult.data;
    variantError = fallbackResult.error;
  }

  if (variantError && !isMissingTableError(variantError)) {
    throw variantError;
  }

  const variantsByProduct = new Map<string, CollectionRelatedProductVariant[]>();
  ((variantData ?? []) as CollectionRelatedProductVariant[]).forEach((variant) => {
    const productId = String(variant.product_id);
    const variants = variantsByProduct.get(productId) ?? [];
    variants.push(mapRelatedProductVariant(variant));
    variantsByProduct.set(productId, variants);
  });

  const productsById = new Map<string, CollectionRelatedProduct>();
  ((productData ?? []) as CollectionRelatedProduct[]).forEach((product) => {
    const mappedProduct = mapRelatedProduct(product);
    mappedProduct.variants = variantsByProduct.get(mappedProduct.id) ?? [];
    productsById.set(mappedProduct.id, mappedProduct);
  });

  const relationsBySection = new Map<string, ProductCollectionSectionProduct[]>();
  relations.forEach((relation) => {
    const product = productsById.get(String(relation.product_id));
    if (!product) return;

    const sectionRelations = relationsBySection.get(relation.collection_section_id) ?? [];
    sectionRelations.push({
      ...relation,
      sort_order: normalizeNumber(relation.sort_order),
      product,
    });
    relationsBySection.set(relation.collection_section_id, sectionRelations);
  });

  return sections.map((section) => ({
    ...section,
    products: relationsBySection.get(section.id) ?? [],
  }));
};

const attachSectionsToCollections = async (collections: ProductCollection[], onlyActive = false) => {
  if (collections.length === 0) {
    return collections;
  }

  const client = getClient();
  let query = client
    .from('product_collection_sections')
    .select(COLLECTION_SECTION_COLUMNS)
    .in('collection_id', collections.map((collection) => collection.id))
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (isMissingTableError(error)) {
    return collections.map((collection) => ({ ...collection, sections: [] }));
  }

  if (error) {
    throw error;
  }

  const sectionsWithProducts = await attachProductsToSections((data ?? []) as ProductCollectionSection[], onlyActive);
  const sectionsByCollection = new Map<string, ProductCollectionSection[]>();
  sectionsWithProducts.forEach((section) => {
    const sections = sectionsByCollection.get(section.collection_id) ?? [];
    sections.push(section);
    sectionsByCollection.set(section.collection_id, sections);
  });

  return collections.map((collection) => ({
    ...collection,
    sections: sectionsByCollection.get(collection.id) ?? [],
  }));
};

export const emptyProductCollectionInput = (): ProductCollectionInput => ({
  title: '',
  subtitle: '',
  description: '',
  image_url: '',
  is_active: true,
  sort_order: 0,
  sections: [],
  deletedSectionIds: [],
});

export const productCollectionToInput = (collection: ProductCollection): ProductCollectionInput => ({
  title: toRequiredText(collection.title),
  slug: toRequiredText(collection.slug),
  subtitle: toRequiredText(collection.subtitle),
  description: toRequiredText(collection.description),
  image_url: toRequiredText(collection.image_url),
  is_active: toBooleanOrDefault(collection.is_active, true),
  sort_order: toNumberOrDefault(collection.sort_order, 0),
  sections: (Array.isArray(collection.sections) ? collection.sections : []).map((section) => ({
    id: toRequiredText(section.id) || undefined,
    title: toRequiredText(section.title),
    description: toRequiredText(section.description),
    image_url: toRequiredText(section.image_url),
    is_active: toBooleanOrDefault(section.is_active, true),
    sort_order: toNumberOrDefault(section.sort_order, 0),
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

const saveSectionProducts = async (
  sectionId: string,
  products: ProductCollectionSectionProductInput[] = []
) => {
  const client = getClient();
  const normalizedSectionId = toRequiredText(sectionId);
  const productInputs = Array.isArray(products) ? products : [];
  const { error: deleteError } = await client
    .from('product_collection_section_products')
    .delete()
    .eq('collection_section_id', normalizedSectionId);

  if (deleteError) {
    throw deleteError;
  }

  const uniqueProductsById = new Map<
    string,
    {
      id: string;
      collection_section_id: string;
      product_id: string;
      sort_order: number;
    }
  >();

  productInputs.forEach((product, index) => {
    const productId = toStringIdOrNull(product?.product_id);
    if (!productId) return;

    uniqueProductsById.set(productId, {
      id: toStringIdOrNull(product?.id) || createUuid(),
      collection_section_id: normalizedSectionId,
      product_id: productId,
      sort_order: toNumberOrDefault(product?.sort_order, index + 1),
    });
  });

  const uniqueProducts = Array.from(uniqueProductsById.values());
  if (uniqueProducts.length === 0) {
    return;
  }

  const { error: insertError } = await client.from('product_collection_section_products').insert(uniqueProducts);

  if (insertError) {
    throw insertError;
  }
};

const saveCollectionSections = async (collectionId: string, collection: ProductCollectionInput) => {
  const client = getClient();
  const deletedSectionIds = (Array.isArray(collection.deletedSectionIds) ? collection.deletedSectionIds : [])
    .map((sectionId) => toRequiredText(sectionId))
    .filter(Boolean);

  if (deletedSectionIds.length > 0) {
    const { error } = await client.from('product_collection_sections').delete().in('id', deletedSectionIds);
    if (error) throw error;
  }

  const sections = Array.isArray(collection.sections) ? collection.sections : [];
  for (const section of sections) {
    const sectionTitle = toRequiredText(section?.title);
    if (!sectionTitle) {
      throw new Error('Cada sección de la colección necesita un título.');
    }

    let sectionId = toRequiredText(section?.id);
    const sectionPayload = toSectionPayload(collectionId, { ...section, title: sectionTitle });

    if (sectionId) {
      const { error } = await client
        .from('product_collection_sections')
        .update(sectionPayload)
        .eq('id', sectionId);

      if (error) throw error;
    } else {
      const insertPayload = { id: createUuid(), ...sectionPayload };
      const { data, error } = await client
        .from('product_collection_sections')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) throw error;
      sectionId = toRequiredText(data?.id);
    }

    if (sectionId) {
      await saveSectionProducts(sectionId, Array.isArray(section.products) ? section.products : []);
    }
  }
};

export const getActiveProductCollections = async () => {
  const client = getClient();
  const { data, error } = await client
    .from('product_collections')
    .select(COLLECTION_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }

  return attachSectionsToCollections((data ?? []) as ProductCollection[], true);
};

export const getActiveProductCollectionBySlug = async (slug: string) => {
  const client = getClient();
  const { data, error } = await client
    .from('product_collections')
    .select(COLLECTION_COLUMNS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [collection] = await attachSectionsToCollections([data as ProductCollection], true);
  return collection;
};

export const getAdminProductCollections = async () => {
  const client = getClient();
  const { data, error } = await client
    .from('product_collections')
    .select(COLLECTION_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }

  return attachSectionsToCollections((data ?? []) as ProductCollection[]);
};

export const createProductCollection = async (collection: ProductCollectionInput) => {
  const client = getClient();
  const payload = { id: createUuid(), ...toCollectionPayload(collection) };
  const { data, error } = await client
    .from('product_collections')
    .insert(payload)
    .select(COLLECTION_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const createdCollection = data as ProductCollection;
  await saveCollectionSections(createdCollection.id, collection);
  return (await attachSectionsToCollections([createdCollection]))[0];
};

export const updateProductCollection = async (id: string, collection: ProductCollectionInput) => {
  const client = getClient();
  const collectionId = toRequiredText(id);
  const payload = toCollectionPayload(collection);
  const { data, error } = await client
    .from('product_collections')
    .update(payload)
    .eq('id', collectionId)
    .select(COLLECTION_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const updatedCollection = data as ProductCollection;
  await saveCollectionSections(updatedCollection.id, collection);
  return (await attachSectionsToCollections([updatedCollection]))[0];
};

export const deleteProductCollection = async (id: string) => {
  const client = getClient();
  const { error } = await client.from('product_collections').delete().eq('id', id);

  if (error) {
    throw error;
  }
};
