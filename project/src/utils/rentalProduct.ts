import type { Product } from '../types/product';

const RENTAL_NORMALIZED_TAGS = ['alquiler', 'alquileres', 'rental', 'rentals'];

const normalizeStr = (s: unknown): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_/.,;:()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getAttrStrings = (product: Product, key: string): string[] => {
  const raw = product.attributes?.[key];
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map(normalizeStr).filter(Boolean);
  return [normalizeStr(raw)].filter(Boolean);
};

export const isRentalProduct = (product: Product): boolean => {
  const candidates = [
    normalizeStr(product.type),
    normalizeStr(product.category),
    ...getAttrStrings(product, 'orchid_type'),
    ...getAttrStrings(product, 'catalog_category'),
    ...getAttrStrings(product, 'product_category'),
    ...getAttrStrings(product, 'category'),
    ...getAttrStrings(product, 'type'),
    ...getAttrStrings(product, 'product_type'),
  ].filter(Boolean);

  return RENTAL_NORMALIZED_TAGS.some((tag) =>
    candidates.some((c) => c === tag || c.includes(tag) || tag.includes(c))
  );
};
