import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import { trackPaymentConfirmed } from './analyticsService';
import { sendOrderCancelledEmail, sendOrderConfirmedEmail } from './emailService';

export interface AdminProduct {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  price_mode?: AdminPriceMode | null;
  stock: number;
  stock_mode?: AdminStockMode | null;
  occasions?: string[] | null;
  visible_in_store?: boolean | null;
  orchid_type: string;
  color: string;
  size: string;
  flowering_stems: number;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
  variants?: AdminProductVariant[];
}

export type AdminMoneyInput = number | string;
export type AdminStockInput = number | string;
export type AdminStockMode = 'quantity' | 'consult';
export type AdminPriceMode = 'fixed' | 'quote';

export interface AdminProductVariant {
  id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  flowering_stems: number | null;
  price: number;
  price_mode?: AdminPriceMode | null;
  stock: number;
  stock_mode?: AdminStockMode | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminProductVariantInput {
  id?: string;
  color: string;
  size: string;
  flowering_stems: number | '';
  price: AdminMoneyInput;
  price_mode: AdminPriceMode;
  stock: AdminStockInput;
  stock_mode: AdminStockMode;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

export interface AdminProductInput {
  name: string;
  slug?: string;
  description: string;
  price: AdminMoneyInput;
  price_mode: AdminPriceMode;
  stock: AdminStockInput;
  stock_mode: AdminStockMode;
  occasions: string[];
  visible_in_store: boolean;
  orchid_type: string;
  color: string;
  size: string;
  flowering_stems: number;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  variants: AdminProductVariantInput[];
  deletedVariantIds?: string[];
}

export interface AdminBulkPriceUpdate {
  id: string;
  price: number;
}

export interface AdminBulkPriceUpdatePayload {
  productUpdates: AdminBulkPriceUpdate[];
  variantUpdates: AdminBulkPriceUpdate[];
}

export interface AdminBulkPriceUpdateResult {
  affectedProducts: number;
  affectedVariants: number;
}

export type AdminRecord = Record<string, unknown>;

export interface AdminDashboardData {
  products: AdminProduct[];
  orders: AdminRecord[];
  payments: AdminRecord[];
  profiles: AdminRecord[];
  summary?: AdminDashboardSummary;
  loadErrors?: string[];
}

export interface AdminDashboardSummary {
  activeProducts: number;
  lowStockProducts: number;
  pendingOrders: number;
  revenue: number;
  pendingPayments: number;
}

export type AnalyticsRange = 'today' | '7d' | '30d' | 'all';

export interface AnalyticsProductMetric extends AdminRecord {
  id: string;
  productId: string;
  productName: string;
  category: string;
  count: number;
  quantity: number;
  revenue: number;
  lastInteraction: string;
}

export interface AnalyticsUserMetric extends AdminRecord {
  id: string;
  userId: string;
  userLabel: string;
  visits: number;
  cartAdds: number;
  favorites: number;
  orders: number;
  totalPurchased: number;
}

export interface AnalyticsRecentActivity extends AdminRecord {
  id: string;
  eventType: string;
  productName: string;
  userLabel: string;
  createdAt: string;
}

export interface AnalyticsReportData {
  summary: {
    totalProductViews: number;
    totalAddToCart: number;
    totalFavorites: number;
    totalOrders: number;
    topViewedProduct: AnalyticsProductMetric | null;
    topCartProduct: AnalyticsProductMetric | null;
    topFavoriteProduct: AnalyticsProductMetric | null;
    topPurchasedProduct: AnalyticsProductMetric | null;
  };
  topViewedProducts: AnalyticsProductMetric[];
  topCartProducts: AnalyticsProductMetric[];
  topFavoriteProducts: AnalyticsProductMetric[];
  topPurchasedProducts: AnalyticsProductMetric[];
  topUsers: AnalyticsUserMetric[];
  recentActivity: AnalyticsRecentActivity[];
}

const PRODUCT_COLUMNS =
  'id, category_id, name, slug, description, price, stock, orchid_type, color, size, flowering_stems, image_url, is_featured, is_active, created_at, updated_at';
const PRODUCT_COLUMNS_WITH_STOCK_MODE = `${PRODUCT_COLUMNS}, stock_mode`;
const PRODUCT_COLUMNS_WITH_PRICE_MODE = `${PRODUCT_COLUMNS_WITH_STOCK_MODE}, price_mode`;
const PRODUCT_COLUMNS_WITH_OPTIONAL_MODES_WITHOUT_SORT_ORDER =
  `${PRODUCT_COLUMNS_WITH_PRICE_MODE}, occasions, visible_in_store`;
const PRODUCT_COLUMNS_WITH_OPTIONAL_MODES = `${PRODUCT_COLUMNS_WITH_OPTIONAL_MODES_WITHOUT_SORT_ORDER}, sort_order`;
const PRODUCT_VARIANT_COLUMNS =
  'id, product_id, color, size, flowering_stems, price, stock, image_url, is_active, sort_order, created_at, updated_at';
const PRODUCT_VARIANT_COLUMNS_WITH_STOCK_MODE = `${PRODUCT_VARIANT_COLUMNS}, stock_mode`;
const PRODUCT_VARIANT_COLUMNS_WITH_OPTIONAL_MODES = `${PRODUCT_VARIANT_COLUMNS_WITH_STOCK_MODE}, price_mode`;
const ORDER_COLUMNS = [
  'id',
  'user_id',
  'order_number',
  'subtotal',
  'shipping',
  'shipping_total',
  'total_amount',
  'total',
  'status',
  'payment_method',
  'payment_status',
  'customer_name',
  'customer_email',
  'customer_phone',
  'delivery_address',
  'notes',
  'shipping_requires_quote',
  'order_received_email_sent_at',
  'order_confirmed_email_sent_at',
  'order_cancelled_email_sent_at',
  'stock_deducted',
  'stock_deducted_at',
  'created_at',
  'updated_at',
].join(', ');
const PAYMENT_COLUMNS =
  'id, order_id, amount, method, status, payment_status, preference_id, provider_payment_id, created_at';
const PROFILE_COLUMNS = 'id, full_name, phone, address, role, created_at';
const PROFILE_COLUMNS_WITH_EMAIL = 'id, full_name, email, phone, address, role, created_at';
const ORDER_ITEM_SUMMARY_COLUMNS = 'order_id, product_name, quantity, product_details';
const ADMIN_QUERY_TIMEOUT_MS = 12000;
const ADMIN_PAGE_LIMIT = 120;
const ADMIN_DASHBOARD_LIMIT = 8;
const ADMIN_ANALYTICS_LIMIT = 2000;
const PAID_PAYMENT_STATUSES = ['paid', 'approved', 'confirmed'];
const PURCHASED_ORDER_STATUSES = ['confirmed', 'paid', 'approved', 'processing', 'completed', 'delivered'];
const PENDING_PAYMENT_STATUSES = [
  'pending',
  'awaiting_transfer',
  'pending_cash_payment',
  'awaiting_payment',
  'payment_pending',
  'received',
];

const getClient = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

const withAdminTimeout = <T,>(operation: PromiseLike<T>, message: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => reject(new Error(message)), ADMIN_QUERY_TIMEOUT_MS);

    Promise.resolve(operation)
      .then(resolve, reject)
      .finally(() => globalThis.clearTimeout(timeoutId));
  });

const normalizeSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getUniqueProductCopySlug = async (source: AdminProduct) => {
  const client = getClient();
  const sourceSlug = normalizeSlug(source.slug || source.name) || `producto-${Date.now()}`;
  const copyBaseSlug = `${sourceSlug.replace(/-copia(?:-\d+)?$/, '')}-copia`;
  const { data, error } = await client
    .from('products')
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

const isMissingProductVariantsTableError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('product_variants') ||
    message.includes('schema cache')
  );
};

const isMissingStockModeColumnError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLowerCase() ?? '';
  return error.code === 'PGRST204' || error.code === '42703' || message.includes('stock_mode');
};

const isMissingOptionalModeColumnError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    message.includes('stock_mode') ||
    message.includes('price_mode') ||
    message.includes('occasions') ||
    message.includes('visible_in_store') ||
    message.includes('sort_order')
  );
};

const isMissingSortOrderColumnError = (error: { code?: string; message?: string } | null) => {
  const message = error?.message?.toLowerCase() ?? '';
  return error?.code === 'PGRST204' || error?.code === '42703' || message.includes('sort_order');
};

const isMissingProfileEmailColumnError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLowerCase() ?? '';
  return error.code === 'PGRST204' || error.code === '42703' || message.includes('email');
};

export const parseAdminMoneyValue = (value: AdminMoneyInput, label = 'precio') => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Ingresa un ${label} valido.`);
    }

    return value;
  }

  const rawValue = value.trim();
  const normalizedValue = rawValue.replace(/[^\d,.-]/g, '');

  if (!/\d/.test(normalizedValue)) {
    throw new Error(`Ingresa un ${label} valido.`);
  }

  const sign = normalizedValue.startsWith('-') ? '-' : '';
  const unsignedValue = normalizedValue.replace(/-/g, '');
  const lastCommaIndex = unsignedValue.lastIndexOf(',');
  const lastDotIndex = unsignedValue.lastIndexOf('.');
  let decimalSeparator = '';

  if (lastCommaIndex >= 0 && lastDotIndex >= 0) {
    decimalSeparator = lastCommaIndex > lastDotIndex ? ',' : '.';
  } else if (lastCommaIndex >= 0) {
    const decimalLength = unsignedValue.length - lastCommaIndex - 1;
    decimalSeparator = decimalLength > 0 && decimalLength <= 2 ? ',' : '';
  } else if (lastDotIndex >= 0) {
    const decimalLength = unsignedValue.length - lastDotIndex - 1;
    const dotCount = unsignedValue.split('.').length - 1;
    decimalSeparator = dotCount === 1 && decimalLength > 0 && decimalLength <= 2 ? '.' : '';
  }

  const parsedText = decimalSeparator
    ? (() => {
        const separatorIndex = unsignedValue.lastIndexOf(decimalSeparator);
        const integerPart = unsignedValue.slice(0, separatorIndex).replace(/\D/g, '');
        const decimalPart = unsignedValue.slice(separatorIndex + 1).replace(/\D/g, '');
        return `${sign}${integerPart || '0'}.${decimalPart}`;
      })()
    : `${sign}${unsignedValue.replace(/\D/g, '')}`;

  const parsedValue = Number(parsedText);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`Ingresa un ${label} valido.`);
  }

  return parsedValue;
};

const normalizeStockMode = (stockMode?: AdminStockMode | null): AdminStockMode =>
  stockMode === 'consult' ? 'consult' : 'quantity';

const normalizePriceMode = (priceMode?: AdminPriceMode | null): AdminPriceMode =>
  priceMode === 'quote' ? 'quote' : 'fixed';

const normalizeTextArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
    )
  );
};

const parseAdminPriceForMode = (
  value: AdminMoneyInput | null | undefined,
  priceMode: AdminPriceMode,
  label = 'precio'
) => {
  if (priceMode === 'quote' && (value === '' || value === null || value === undefined)) {
    return 0;
  }

  return parseAdminMoneyValue(value ?? '', label);
};

const parseAdminStockValue = (value: AdminStockInput | null | undefined, label = 'stock') => {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  const stock = Number(value);

  if (!Number.isFinite(stock) || stock < 0) {
    throw new Error(`El ${label} debe ser un numero mayor o igual a 0.`);
  }

  return stock;
};

const parseAdminSortOrderValue = (value: unknown) => {
  const sortOrder = Number(value);
  return Number.isFinite(sortOrder) && sortOrder >= 0 ? Math.trunc(sortOrder) : 0;
};

const toProductPayload = (product: AdminProductInput) => ({
  name: product.name.trim(),
  slug: normalizeSlug(product.slug || product.name),
  description: product.description.trim(),
  price: parseAdminPriceForMode(product.price, normalizePriceMode(product.price_mode)),
  price_mode: normalizePriceMode(product.price_mode),
  stock: parseAdminStockValue(product.stock, 'stock del producto'),
  stock_mode: normalizeStockMode(product.stock_mode),
  occasions: normalizeTextArray(product.occasions),
  visible_in_store: product.visible_in_store !== false,
  orchid_type: product.orchid_type.trim(),
  color: product.color.trim(),
  size: product.size.trim(),
  flowering_stems: Number(product.flowering_stems),
  image_url: product.image_url.trim(),
  is_featured: product.is_featured,
  is_active: product.is_active,
  sort_order: parseAdminSortOrderValue(product.sort_order),
});

const omitSortOrder = <T extends { sort_order?: unknown }>(payload: T) => {
  const { sort_order: _sortOrder, ...payloadWithoutSortOrder } = payload;
  return payloadWithoutSortOrder;
};

const createUuid = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomHex = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}-${randomHex(12)}`;
};

const toVariantPayload = (productId: string, variant: AdminProductVariantInput) => {
  const stock = parseAdminStockValue(variant.stock, 'stock de variante');
  const sortOrder = Number(variant.sort_order ?? 0);
  const floweringStems =
    variant.flowering_stems === '' || variant.flowering_stems === null || variant.flowering_stems === undefined
      ? null
      : Number(variant.flowering_stems);

  if (floweringStems !== null && (!Number.isFinite(floweringStems) || floweringStems <= 0)) {
    throw new Error('Las varas de una variante deben ser un numero positivo o quedar vacias.');
  }

  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    throw new Error('El orden de variante no puede ser negativo.');
  }

  return {
    product_id: productId,
    color: variant.color.trim() || null,
    size: variant.size.trim() || null,
    flowering_stems: floweringStems,
    price: parseAdminPriceForMode(variant.price, normalizePriceMode(variant.price_mode), 'precio de variante'),
    price_mode: normalizePriceMode(variant.price_mode),
    stock,
    stock_mode: normalizeStockMode(variant.stock_mode),
    image_url: variant.image_url.trim() || null,
    is_active: variant.is_active,
    sort_order: sortOrder,
  };
};

const getVariantsForProducts = async (productIds: string[]) => {
  if (productIds.length === 0) {
    return new Map<string, AdminProductVariant[]>();
  }

  const client = getClient();
  let result = await client
    .from('product_variants')
    .select(PRODUCT_VARIANT_COLUMNS_WITH_OPTIONAL_MODES)
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });

  if (result.error && isMissingOptionalModeColumnError(result.error)) {
    result = await client
      .from('product_variants')
      .select(PRODUCT_VARIANT_COLUMNS_WITH_STOCK_MODE)
      .in('product_id', productIds)
      .order('sort_order', { ascending: true });
  }

  if (result.error && isMissingOptionalModeColumnError(result.error)) {
    result = await client
      .from('product_variants')
      .select(PRODUCT_VARIANT_COLUMNS)
      .in('product_id', productIds)
      .order('sort_order', { ascending: true });
  }

  if (result.error) {
    if (isMissingProductVariantsTableError(result.error)) {
      return new Map<string, AdminProductVariant[]>();
    }

    throw result.error;
  }

  const variantsByProduct = new Map<string, AdminProductVariant[]>();
  ((result.data ?? []) as AdminProductVariant[]).forEach((variant) => {
    const variants = variantsByProduct.get(variant.product_id) ?? [];
    variants.push(variant);
    variantsByProduct.set(variant.product_id, variants);
  });

  return variantsByProduct;
};

const attachVariantsToProducts = async (products: AdminProduct[]) => {
  const variantsByProduct = await getVariantsForProducts(products.map((product) => product.id));

  return products.map((product) => ({
    ...product,
    variants: variantsByProduct.get(product.id) ?? [],
  }));
};

const sortAdminProducts = (products: AdminProduct[]) =>
  products.slice().sort((first, second) => {
    const sortDifference = parseAdminSortOrderValue(first.sort_order) - parseAdminSortOrderValue(second.sort_order);
    if (sortDifference !== 0) {
      return sortDifference;
    }

    const firstDate = Date.parse(first.created_at || '');
    const secondDate = Date.parse(second.created_at || '');
    if (Number.isFinite(firstDate) && Number.isFinite(secondDate) && firstDate !== secondDate) {
      return secondDate - firstDate;
    }

    return String(first.name ?? '').localeCompare(String(second.name ?? ''), 'es');
  });

const getOrderItemsSummaryForOrders = async (orderIds: string[]) => {
  if (orderIds.length === 0) {
    return new Map<string, string>();
  }

  const client = getClient();
  const { data, error } = await client
    .from('order_items')
    .select(ORDER_ITEM_SUMMARY_COLUMNS)
    .in('order_id', orderIds);

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error cargando resumen de items de pedidos:', error);
    }
    return new Map<string, string>();
  }

  const summaryByOrder = new Map<string, string[]>();
  ((data ?? []) as AdminRecord[]).forEach((item) => {
    const orderId = String(item.order_id ?? '');
    if (!orderId) return;

    const details =
      item.product_details && typeof item.product_details === 'object'
        ? (item.product_details as Record<string, unknown>)
        : {};
    const variantDetails = [
      details.color,
      details.size,
      details.flowering_stems ? `${details.flowering_stems} varas` : '',
    ]
      .filter(Boolean)
      .join(' / ');
    const itemSummary = `${item.product_name || 'Producto'} x${Number(item.quantity ?? 0)}${
      variantDetails ? ` (${variantDetails})` : ''
    }`;

    summaryByOrder.set(orderId, [...(summaryByOrder.get(orderId) ?? []), itemSummary]);
  });

  return new Map(
    Array.from(summaryByOrder.entries()).map(([orderId, summaries]) => [orderId, summaries.join(', ')])
  );
};

const saveProductVariants = async (productId: string, product: AdminProductInput) => {
  const variants = product.variants ?? [];
  const deletedVariantIds = product.deletedVariantIds ?? [];

  if (variants.length === 0 && deletedVariantIds.length === 0) {
    return;
  }

  const client = getClient();

  if (deletedVariantIds.length > 0) {
    const { error } = await client.from('product_variants').delete().in('id', deletedVariantIds);
    if (error) {
      throw error;
    }
  }

  for (const variant of variants) {
    if (variant.id) {
      const { error } = await client
        .from('product_variants')
        .update(toVariantPayload(productId, variant))
        .eq('id', variant.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client
        .from('product_variants')
        .insert({ id: createUuid(), ...toVariantPayload(productId, variant) });

      if (error) {
        throw error;
      }
    }
  }
};

export const emptyAdminProductInput = (): AdminProductInput => ({
  name: '',
  description: '',
  price: '',
  price_mode: 'fixed',
  stock: 0,
  stock_mode: 'quantity',
  occasions: [],
  visible_in_store: true,
  orchid_type: 'Phalaenopsis',
  color: 'Variado',
  size: 'Mediana',
  flowering_stems: 1,
  image_url: '',
  is_featured: false,
  is_active: true,
  sort_order: 0,
  variants: [],
  deletedVariantIds: [],
});

export const productToInput = (product: AdminProduct): AdminProductInput => ({
  name: product.name,
  slug: product.slug,
  description: product.description || '',
  price: String(product.price ?? ''),
  price_mode: product.price_mode === 'quote' ? 'quote' : 'fixed',
  stock: Number(product.stock),
  stock_mode: product.stock_mode === 'consult' ? 'consult' : 'quantity',
  occasions: normalizeTextArray(product.occasions),
  visible_in_store: product.visible_in_store !== false,
  orchid_type: product.orchid_type || '',
  color: product.color || '',
  size: product.size || '',
  flowering_stems: Number(product.flowering_stems || 0),
  image_url: product.image_url || '',
  is_featured: Boolean(product.is_featured),
  is_active: Boolean(product.is_active),
  sort_order: parseAdminSortOrderValue(product.sort_order),
  variants: (product.variants ?? []).map((variant) => ({
    id: variant.id,
    color: variant.color || '',
    size: variant.size || '',
    flowering_stems: variant.flowering_stems == null ? '' : Number(variant.flowering_stems),
    price: String(variant.price ?? ''),
    price_mode: variant.price_mode === 'quote' ? 'quote' : 'fixed',
    stock: Number(variant.stock || 0),
    stock_mode: variant.stock_mode === 'consult' ? 'consult' : 'quantity',
    image_url: variant.image_url || '',
    is_active: Boolean(variant.is_active),
    sort_order: Number(variant.sort_order || 0),
  })),
  deletedVariantIds: [],
});

export const getAdminProducts = async (limit = ADMIN_PAGE_LIMIT) => {
  const client = getClient();
  let result = await withAdminTimeout(
    client
      .from('products')
      .select(PRODUCT_COLUMNS_WITH_OPTIONAL_MODES)
      .order('created_at', { ascending: false })
      .limit(limit),
    'La carga de productos del panel tardó demasiado.'
  );

  if (result.error && isMissingOptionalModeColumnError(result.error)) {
    result = await withAdminTimeout(
      client
        .from('products')
        .select(PRODUCT_COLUMNS_WITH_PRICE_MODE)
        .order('created_at', { ascending: false })
        .limit(limit),
      'La carga de productos del panel tardó demasiado.'
    );
  }

  if (result.error && isMissingOptionalModeColumnError(result.error)) {
    result = await withAdminTimeout(
      client
        .from('products')
        .select(PRODUCT_COLUMNS_WITH_STOCK_MODE)
        .order('created_at', { ascending: false })
        .limit(limit),
      'La carga de productos del panel tardó demasiado.'
    );
  }

  if (result.error) {
    throw result.error;
  }

  return sortAdminProducts(await attachVariantsToProducts((result.data ?? []) as AdminProduct[]));
};

export const getAdminLowStockProducts = async (limit = ADMIN_DASHBOARD_LIMIT) => {
  const client = getClient();
  let result = await withAdminTimeout(
    client
      .from('products')
      .select(PRODUCT_COLUMNS_WITH_OPTIONAL_MODES)
      .eq('is_active', true)
      .lte('stock', 3)
      .order('stock', { ascending: true })
      .limit(limit),
    'La carga del resumen de productos tardo demasiado.'
  );

  if (result.error && isMissingOptionalModeColumnError(result.error)) {
    result = await withAdminTimeout(
      client
        .from('products')
        .select(PRODUCT_COLUMNS_WITH_PRICE_MODE)
        .eq('is_active', true)
        .lte('stock', 3)
        .order('stock', { ascending: true })
        .limit(limit),
      'La carga del resumen de productos tardo demasiado.'
    );
  }

  if (result.error && isMissingOptionalModeColumnError(result.error)) {
    result = await withAdminTimeout(
      client
        .from('products')
        .select(PRODUCT_COLUMNS_WITH_STOCK_MODE)
        .eq('is_active', true)
        .lte('stock', 3)
        .order('stock', { ascending: true })
        .limit(limit),
      'La carga del resumen de productos tardo demasiado.'
    );
  }

  if (result.error) {
    throw result.error;
  }

  const quantityProducts = ((result.data ?? []) as AdminProduct[]).filter(
    (product) => product.price_mode !== 'quote' && product.stock_mode !== 'consult'
  );
  return attachVariantsToProducts(quantityProducts);
};

export const createAdminProduct = async (product: AdminProductInput) => {
  const client = getClient();
  const payload = { id: createUuid(), ...toProductPayload(product) };
  let { data, error } = await client
    .from('products')
    .insert(payload)
    .select(PRODUCT_COLUMNS_WITH_OPTIONAL_MODES)
    .single();

  if (error && isMissingSortOrderColumnError(error)) {
    const fallbackResult = await client
      .from('products')
      .insert(omitSortOrder(payload))
      .select(PRODUCT_COLUMNS_WITH_OPTIONAL_MODES_WITHOUT_SORT_ORDER)
      .single();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  const createdProduct = data as AdminProduct;
  await saveProductVariants(createdProduct.id, product);
  return (await attachVariantsToProducts([createdProduct]))[0];
};

export const duplicateAdminProduct = async (source: AdminProduct) => {
  const client = getClient();
  const duplicateInput: AdminProductInput = {
    ...productToInput(source),
    name: `${source.name} (copia)`,
    slug: await getUniqueProductCopySlug(source),
    is_active: false,
    variants: (source.variants ?? []).map((variant) => ({
      color: variant.color || '',
      size: variant.size || '',
      flowering_stems: variant.flowering_stems == null ? '' : Number(variant.flowering_stems),
      price: String(variant.price ?? ''),
      price_mode: variant.price_mode === 'quote' ? 'quote' : 'fixed',
      stock: Number(variant.stock ?? 0),
      stock_mode: variant.stock_mode === 'consult' ? 'consult' : 'quantity',
      image_url: variant.image_url || '',
      is_active: Boolean(variant.is_active),
      sort_order: Number(variant.sort_order ?? 0),
    })),
    deletedVariantIds: [],
  };
  const duplicateId = createUuid();

  try {
    const payload = {
      id: duplicateId,
      ...toProductPayload(duplicateInput),
      category_id: source.category_id,
    };
    let { data, error } = await client
      .from('products')
      .insert(payload)
      .select(PRODUCT_COLUMNS_WITH_OPTIONAL_MODES)
      .single();

    if (error && isMissingSortOrderColumnError(error)) {
      const fallbackResult = await client
        .from('products')
        .insert(omitSortOrder(payload))
        .select(PRODUCT_COLUMNS_WITH_OPTIONAL_MODES_WITHOUT_SORT_ORDER)
        .single();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      throw error;
    }

    const duplicatedProduct = data as AdminProduct;
    await saveProductVariants(duplicatedProduct.id, duplicateInput);
    return (await attachVariantsToProducts([duplicatedProduct]))[0];
  } catch (error) {
    await client.from('products').delete().eq('id', duplicateId);
    throw error;
  }
};

export const updateAdminProduct = async (id: string, product: AdminProductInput) => {
  const client = getClient();
  const payload = toProductPayload(product);
  let { data, error } = await client
    .from('products')
    .update(payload)
    .eq('id', id)
    .select(PRODUCT_COLUMNS_WITH_OPTIONAL_MODES)
    .single();

  if (error && isMissingSortOrderColumnError(error)) {
    const fallbackResult = await client
      .from('products')
      .update(omitSortOrder(payload))
      .eq('id', id)
      .select(PRODUCT_COLUMNS_WITH_OPTIONAL_MODES_WITHOUT_SORT_ORDER)
      .single();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  const updatedProduct = data as AdminProduct;
  await saveProductVariants(updatedProduct.id, product);
  return (await attachVariantsToProducts([updatedProduct]))[0];
};

export const deleteAdminProduct = async (id: string) => {
  const client = getClient();
  const { error } = await client.from('products').delete().eq('id', id);

  if (error) {
    throw error;
  }
};

export const applyAdminBulkPriceUpdates = async ({
  productUpdates,
  variantUpdates,
}: AdminBulkPriceUpdatePayload): Promise<AdminBulkPriceUpdateResult> => {
  const client = getClient();

  for (const update of productUpdates) {
    const price = Number(update.price);

    if (!update.id || !Number.isFinite(price) || price < 0) {
      throw new Error('Hay un precio de producto invalido en la actualizacion.');
    }

    const { error } = await client.from('products').update({ price }).eq('id', update.id);

    if (error) {
      throw error;
    }
  }

  for (const update of variantUpdates) {
    const price = Number(update.price);

    if (!update.id || !Number.isFinite(price) || price < 0) {
      throw new Error('Hay un precio de variante invalido en la actualizacion.');
    }

    const { error } = await client.from('product_variants').update({ price }).eq('id', update.id);

    if (error) {
      throw error;
    }
  }

  return {
    affectedProducts: productUpdates.length,
    affectedVariants: variantUpdates.length,
  };
};

export const getAdminOrders = async (limit = ADMIN_PAGE_LIMIT) => {
  const client = getClient();
  const { data, error } = await withAdminTimeout(
    client
      .from('orders')
      .select(ORDER_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit),
    'La carga de pedidos del panel tardó demasiado.'
  );

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error Supabase getAdminOrders:', error);
      console.error('getAdminOrders message:', error.message);
      console.error('getAdminOrders details:', error.details);
      console.error('getAdminOrders hint:', error.hint);
      console.error('getAdminOrders code:', error.code);
      console.error('Columnas solicitadas en orders:', ORDER_COLUMNS);
    }
    throw error;
  }

  const orders = (data ?? []) as AdminRecord[];
  const summariesByOrder = await getOrderItemsSummaryForOrders(orders.map((order) => String(order.id ?? '')).filter(Boolean));

  return orders.map((order) => ({
    ...order,
    items_summary: summariesByOrder.get(String(order.id ?? '')) || '',
  }));
};

export const updateAdminOrderStatus = async (id: string, status: string) => {
  const client = getClient();
  const { error } = await client.from('orders').update({ status }).eq('id', id);

  if (error) {
    throw error;
  }
};

export const confirmAdminOrderPayment = async (id: string) => {
  const client = getClient();
  const confirmationPayload = {
    p_order_id: id,
    p_payment_status: 'confirmed',
    p_order_status: 'confirmed',
  };

  const { data, error } = await client.rpc('confirm_order_payment_and_deduct_stock', confirmationPayload);

  if (error) {
    if (import.meta.env.DEV) {
      console.error('confirm_order_payment_and_deduct_stock error:', error);
      console.error('confirm_order_payment_and_deduct_stock payload:', confirmationPayload);
    }
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (result && result.stock_deducted === false) {
    throw new Error('No hay stock suficiente para confirmar este pedido. Quedó marcado para revisión.');
  }

  void sendOrderConfirmedEmail(id);
  void trackPaymentConfirmed({ id });

  return result;
};

const getCancelAdminOrderMessage = (error: unknown) => {
  const errorText =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object'
        ? [
            (error as { message?: string }).message,
            (error as { details?: string }).details,
            (error as { hint?: string }).hint,
            (error as { code?: string }).code,
          ]
            .filter(Boolean)
            .join(' ')
        : String(error);

  if (errorText.includes('ORDER_ALREADY_DEDUCTED') || errorText.includes('ORDER_ALREADY_CONFIRMED')) {
    return 'Este pedido ya fue confirmado y no puede cancelarse desde aca.';
  }

  if (errorText.includes('ORDER_NOT_CANCELABLE')) {
    return 'Solo podes cancelar pedidos pendientes.';
  }

  return 'No se pudo cancelar el pedido.';
};

export const cancelAdminPendingOrder = async (id: string) => {
  const client = getClient();
  const payload = { p_order_id: id };
  const { data, error } = await client.rpc('cancel_pending_order', payload);

  if (error) {
    if (import.meta.env.DEV) {
      console.error('cancel_pending_order admin error:', error);
      console.error('cancel_pending_order admin payload:', payload);
    }
    throw new Error(getCancelAdminOrderMessage(error));
  }

  const result = Array.isArray(data) ? data[0] : data;
  void sendOrderCancelledEmail(id);

  return result;
};

export const getAdminPayments = async (limit = ADMIN_PAGE_LIMIT) => {
  const client = getClient();
  const { data, error } = await withAdminTimeout(
    client
      .from('payments')
      .select(PAYMENT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit),
    'La carga de pagos del panel tardó demasiado.'
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as AdminRecord[];
};

const attachCustomerEmailFallbacks = async (profiles: AdminRecord[]) => {
  const userIds = profiles
    .map((profile) => String(profile.id ?? '').trim())
    .filter(Boolean);

  if (userIds.length === 0) {
    return profiles;
  }

  const client = getClient();
  const { data, error } = await withAdminTimeout(
    client
      .from('orders')
      .select('user_id, customer_email, created_at')
      .in('user_id', userIds)
      .not('customer_email', 'is', null)
      .order('created_at', { ascending: false }),
    'La carga de emails de clientes del panel tardó demasiado.'
  );

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('No se pudieron cargar emails de clientes desde pedidos:', error);
    }

    return profiles;
  }

  const emailByUserId = new Map<string, string>();
  ((data ?? []) as AdminRecord[]).forEach((order) => {
    const userId = String(order.user_id ?? '').trim();
    const email = String(order.customer_email ?? '').trim();

    if (userId && email && !emailByUserId.has(userId)) {
      emailByUserId.set(userId, email);
    }
  });

  return profiles.map((profile) => ({
    ...profile,
    email: profile.email || emailByUserId.get(String(profile.id ?? '').trim()) || null,
  }));
};

export const getAdminProfiles = async (limit = ADMIN_PAGE_LIMIT) => {
  const client = getClient();
  let result = await withAdminTimeout(
    client
      .from('profiles')
      .select(PROFILE_COLUMNS_WITH_EMAIL)
      .order('created_at', { ascending: false })
      .limit(limit),
    'La carga de clientes del panel tardó demasiado.'
  );

  if (result.error && isMissingProfileEmailColumnError(result.error)) {
    result = await withAdminTimeout(
      client
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit),
      'La carga de clientes del panel tardó demasiado.'
    );
  }

  if (result.error) {
    throw result.error;
  }

  return attachCustomerEmailFallbacks((result.data ?? []) as AdminRecord[]);
};

const getCount = async (
  table: 'products' | 'orders',
  applyFilters: (query: any) => PromiseLike<{ count: number | null; error: unknown }>
) => {
  const client = getClient();
  const query = client.from(table).select('id', { count: 'exact', head: true });
  const { count, error } = await withAdminTimeout(
    applyFilters(query) as PromiseLike<{ count: number | null; error: unknown }>,
    'La carga del resumen del panel tardo demasiado.'
  );

  if (error) {
    throw error;
  }

  return count ?? 0;
};

const getPaymentAmountByStatuses = async (statuses: string[]) => {
  const client = getClient();
  const { data, error } = await withAdminTimeout(
    client
      .from('payments')
      .select('amount, status, payment_status')
      .in('payment_status', statuses)
      .limit(1000),
    'La carga del resumen de pagos tardo demasiado.'
  );

  if (error) {
    throw error;
  }

  return ((data ?? []) as AdminRecord[]).reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
};

type AnalyticsEventRow = {
  id: string;
  event_type: string;
  user_id: string | null;
  session_id: string | null;
  product_id: string | null;
  order_id: string | null;
  quantity: number | null;
  amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type AnalyticsOrderRow = {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  total_amount: number | null;
  total: number | null;
  status: string | null;
  payment_status: string | null;
  created_at: string;
};

type AnalyticsOrderItemRow = {
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
  total_price: number | null;
  subtotal: number | null;
};

type AnalyticsProductLookup = {
  id: string;
  name: string | null;
  orchid_type: string | null;
  color: string | null;
  size: string | null;
};

const getAnalyticsRangeStart = (range: AnalyticsRange) => {
  if (range === 'all') {
    return '';
  }

  const date = new Date();
  if (range === 'today') {
    date.setHours(0, 0, 0, 0);
  } else {
    const days = range === '7d' ? 7 : 30;
    date.setDate(date.getDate() - days);
  }

  return date.toISOString();
};

const normalizeStatus = (value: unknown) => String(value ?? '').toLowerCase();

const isPurchasedOrder = (order: AnalyticsOrderRow) => {
  const status = normalizeStatus(order.status);
  const paymentStatus = normalizeStatus(order.payment_status);

  if (status === 'cancelled' || paymentStatus === 'cancelled') {
    return false;
  }

  return PURCHASED_ORDER_STATUSES.includes(status) || PAID_PAYMENT_STATUSES.includes(paymentStatus);
};

const getMetadataText = (metadata: Record<string, unknown> | null | undefined, key: string) => {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
};

const makeProductMetric = (
  id: string,
  productMap: Map<string, AnalyticsProductLookup>,
  fallbackName = 'Producto sin identificar'
): AnalyticsProductMetric => {
  const product = productMap.get(id);
  const productName = product?.name?.trim() || fallbackName;
  const category = product?.orchid_type?.trim() || '-';

  return {
    id,
    productId: id,
    productName,
    category,
    count: 0,
    quantity: 0,
    revenue: 0,
    lastInteraction: '',
  };
};

const sortMetrics = (metrics: AnalyticsProductMetric[], sortKey: 'count' | 'quantity' | 'revenue') =>
  metrics.sort((a, b) => Number(b[sortKey] ?? 0) - Number(a[sortKey] ?? 0)).slice(0, 10);

const buildEventProductMetrics = (
  events: AnalyticsEventRow[],
  eventType: string,
  productMap: Map<string, AnalyticsProductLookup>,
  mode: 'count' | 'quantity' = 'count'
) => {
  const metrics = new Map<string, AnalyticsProductMetric>();

  events
    .filter((event) => event.event_type === eventType)
    .forEach((event) => {
      const productId = event.product_id || `sin-producto-${getMetadataText(event.metadata, 'product_name') || 'unknown'}`;
      const fallbackName = getMetadataText(event.metadata, 'product_name') || 'Producto sin identificar';
      const metric = metrics.get(productId) ?? makeProductMetric(productId, productMap, fallbackName);
      const eventQuantity = Math.max(1, Number(event.quantity ?? 1));

      metric.count += 1;
      metric.quantity += mode === 'quantity' ? eventQuantity : 1;
      metric.revenue += Number(event.amount ?? 0);
      metric.lastInteraction = metric.lastInteraction
        ? event.created_at > metric.lastInteraction
          ? event.created_at
          : metric.lastInteraction
        : event.created_at;

      if (metric.category === '-') {
        metric.category = getMetadataText(event.metadata, 'category') || getMetadataText(event.metadata, 'type') || '-';
      }

      metrics.set(productId, metric);
    });

  return sortMetrics(Array.from(metrics.values()), mode === 'quantity' ? 'quantity' : 'count');
};

const buildPurchasedProductMetrics = (
  orderItems: AnalyticsOrderItemRow[],
  productMap: Map<string, AnalyticsProductLookup>
) => {
  const metrics = new Map<string, AnalyticsProductMetric>();

  orderItems.forEach((item) => {
    const productId = item.product_id || `sin-producto-${item.product_name || item.order_id}`;
    const metric = metrics.get(productId) ?? makeProductMetric(productId, productMap, item.product_name || 'Producto sin identificar');
    metric.count += 1;
    metric.quantity += Math.max(0, Number(item.quantity ?? 0));
    metric.revenue += Number(item.total_price ?? item.subtotal ?? 0);
    metrics.set(productId, metric);
  });

  return sortMetrics(Array.from(metrics.values()), 'quantity');
};

export const getAnalyticsReport = async (range: AnalyticsRange = '30d'): Promise<AnalyticsReportData> => {
  const client = getClient();
  const rangeStart = getAnalyticsRangeStart(range);

  let eventsQuery = client
    .from('analytics_events')
    .select('id, event_type, user_id, session_id, product_id, order_id, quantity, amount, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(ADMIN_ANALYTICS_LIMIT);

  if (rangeStart) {
    eventsQuery = eventsQuery.gte('created_at', rangeStart);
  }

  let ordersQuery = client
    .from('orders')
    .select('id, user_id, customer_name, customer_email, total_amount, total, status, payment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (rangeStart) {
    ordersQuery = ordersQuery.gte('created_at', rangeStart);
  }

  const [eventsResult, productsResult, ordersResult] = await Promise.all([
    withAdminTimeout(eventsQuery, 'La carga de eventos de analiticas tardo demasiado.'),
    withAdminTimeout(
      client.from('products').select('id, name, orchid_type, color, size').limit(1000),
      'La carga de productos para analiticas tardo demasiado.'
    ),
    withAdminTimeout(ordersQuery, 'La carga de pedidos para analiticas tardo demasiado.'),
  ]);

  if (eventsResult.error) {
    throw eventsResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  if (ordersResult.error) {
    throw ordersResult.error;
  }

  const events = (eventsResult.data ?? []) as AnalyticsEventRow[];
  const products = (productsResult.data ?? []) as AnalyticsProductLookup[];
  const orders = ((ordersResult.data ?? []) as AnalyticsOrderRow[]).filter(isPurchasedOrder);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const orderIds = orders.map((order) => order.id);

  let orderItems: AnalyticsOrderItemRow[] = [];
  if (orderIds.length > 0) {
    const { data, error } = await withAdminTimeout(
      client
        .from('order_items')
        .select('order_id, product_id, product_name, quantity, total_price, subtotal')
        .in('order_id', orderIds),
      'La carga de productos comprados tardo demasiado.'
    );

    if (error) {
      throw error;
    }

    orderItems = (data ?? []) as AnalyticsOrderItemRow[];
  }

  const userIds = Array.from(
    new Set([
      ...events.map((event) => event.user_id).filter(Boolean),
      ...orders.map((order) => order.user_id).filter(Boolean),
    ])
  ) as string[];
  const orderUserLabels = new Map<string, string>();

  orders.forEach((order) => {
    if (!order.user_id) {
      return;
    }

    const label = [order.customer_name, order.customer_email].filter(Boolean).join(' - ');
    if (label && !orderUserLabels.has(order.user_id)) {
      orderUserLabels.set(order.user_id, label);
    }
  });

  const profileLabels = new Map<string, string>();
  if (userIds.length > 0) {
    const { data, error } = await withAdminTimeout(
      client.from('profiles').select('id, full_name').in('id', userIds),
      'La carga de usuarios para analiticas tardo demasiado.'
    );

    if (!error) {
      ((data ?? []) as Array<{ id: string; full_name: string | null }>).forEach((profile) => {
        if (profile.full_name) {
          profileLabels.set(profile.id, profile.full_name);
        }
      });
    }
  }

  const getUserLabel = (userId: string | null) => {
    if (!userId) {
      return 'Anonimo';
    }

    return orderUserLabels.get(userId) || profileLabels.get(userId) || `Usuario ${userId.slice(0, 8)}`;
  };

  const topViewedProducts = buildEventProductMetrics(events, 'product_view', productMap);
  const topCartProducts = buildEventProductMetrics(events, 'add_to_cart', productMap, 'quantity');
  const topFavoriteProducts = buildEventProductMetrics(events, 'add_to_favorite', productMap);
  const topPurchasedProducts = buildPurchasedProductMetrics(orderItems, productMap);
  const userMetrics = new Map<string, AnalyticsUserMetric>();

  events.forEach((event) => {
    if (!event.user_id) {
      return;
    }

    const metric =
      userMetrics.get(event.user_id) ??
      ({
        id: event.user_id,
        userId: event.user_id,
        userLabel: getUserLabel(event.user_id),
        visits: 0,
        cartAdds: 0,
        favorites: 0,
        orders: 0,
        totalPurchased: 0,
      } satisfies AnalyticsUserMetric);

    if (event.event_type === 'product_view') {
      metric.visits += 1;
    }

    if (event.event_type === 'add_to_cart') {
      metric.cartAdds += 1;
    }

    if (event.event_type === 'add_to_favorite') {
      metric.favorites += 1;
    }

    userMetrics.set(event.user_id, metric);
  });

  orders.forEach((order) => {
    if (!order.user_id) {
      return;
    }

    const metric =
      userMetrics.get(order.user_id) ??
      ({
        id: order.user_id,
        userId: order.user_id,
        userLabel: getUserLabel(order.user_id),
        visits: 0,
        cartAdds: 0,
        favorites: 0,
        orders: 0,
        totalPurchased: 0,
      } satisfies AnalyticsUserMetric);

    metric.orders += 1;
    metric.totalPurchased += Number(order.total_amount ?? order.total ?? 0);
    userMetrics.set(order.user_id, metric);
  });

  const topUsers = Array.from(userMetrics.values())
    .sort(
      (a, b) =>
        b.visits +
        b.cartAdds +
        b.favorites +
        b.orders * 2 -
        (a.visits + a.cartAdds + a.favorites + a.orders * 2)
    )
    .slice(0, 10);

  const recentActivity = events.slice(0, 20).map((event) => {
    const product = event.product_id ? productMap.get(event.product_id) : null;

    return {
      id: event.id,
      eventType: event.event_type,
      productName: product?.name || getMetadataText(event.metadata, 'product_name') || '-',
      userLabel: getUserLabel(event.user_id),
      createdAt: event.created_at,
    };
  });

  return {
    summary: {
      totalProductViews: events.filter((event) => event.event_type === 'product_view').length,
      totalAddToCart: events.filter((event) => event.event_type === 'add_to_cart').length,
      totalFavorites: events.filter((event) => event.event_type === 'add_to_favorite').length,
      totalOrders: orders.length,
      topViewedProduct: topViewedProducts[0] ?? null,
      topCartProduct: topCartProducts[0] ?? null,
      topFavoriteProduct: topFavoriteProducts[0] ?? null,
      topPurchasedProduct: topPurchasedProducts[0] ?? null,
    },
    topViewedProducts,
    topCartProducts,
    topFavoriteProducts,
    topPurchasedProducts,
    topUsers,
    recentActivity,
  };
};

export const getAdminDashboardData = async (): Promise<AdminDashboardData> => {
  const [
    activeProducts,
    lowStockProductsCount,
    pendingOrders,
    revenue,
    pendingPayments,
    lowStockProducts,
    recentOrders,
    recentPayments,
  ] = await Promise.allSettled([
    getCount('products', (query) => query.eq('is_active', true)),
    getAdminLowStockProducts(1000).then((products) => products.length),
    getCount('orders', (query) => query.in('payment_status', PENDING_PAYMENT_STATUSES)),
    getPaymentAmountByStatuses(PAID_PAYMENT_STATUSES),
    getPaymentAmountByStatuses(PENDING_PAYMENT_STATUSES),
    getAdminLowStockProducts(),
    getAdminOrders(ADMIN_DASHBOARD_LIMIT),
    getAdminPayments(ADMIN_DASHBOARD_LIMIT),
  ]);
  const getFailureMessage = (label: string, result: PromiseSettledResult<unknown>) =>
    result.status === 'rejected'
      ? `${label}: ${result.reason instanceof Error ? result.reason.message : 'No se pudo cargar.'}`
      : '';

  const loadErrors = [
    getFailureMessage('Productos activos', activeProducts),
    getFailureMessage('Stock bajo', lowStockProductsCount),
    getFailureMessage('Pedidos pendientes', pendingOrders),
    getFailureMessage('Cobrado', revenue),
    getFailureMessage('Pendiente', pendingPayments),
    getFailureMessage('Productos', lowStockProducts),
    getFailureMessage('Pedidos', recentOrders),
    getFailureMessage('Pagos', recentPayments),
  ].filter(Boolean);

  return {
    products: lowStockProducts.status === 'fulfilled' ? lowStockProducts.value : [],
    orders: recentOrders.status === 'fulfilled' ? recentOrders.value : [],
    payments: recentPayments.status === 'fulfilled' ? recentPayments.value : [],
    profiles: [],
    summary: {
      activeProducts: activeProducts.status === 'fulfilled' ? activeProducts.value : 0,
      lowStockProducts: lowStockProductsCount.status === 'fulfilled' ? lowStockProductsCount.value : 0,
      pendingOrders: pendingOrders.status === 'fulfilled' ? pendingOrders.value : 0,
      revenue: revenue.status === 'fulfilled' ? revenue.value : 0,
      pendingPayments: pendingPayments.status === 'fulfilled' ? pendingPayments.value : 0,
    },
    loadErrors,
  };
};
