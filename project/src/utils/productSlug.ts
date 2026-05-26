import type { Product } from '../types/product';

export const createProductSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getProductSlug = (product: Product) =>
  product.slug?.trim() || createProductSlug(product.name) || `producto-${product.id}`;
