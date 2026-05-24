import { supabase } from '../lib/supabase';
import type { CartItem, CartItemInput } from '../types/cart';
import type { Product } from '../types/product';

type AnalyticsEventType =
  | 'product_view'
  | 'add_to_cart'
  | 'add_to_favorite'
  | 'remove_from_favorite'
  | 'checkout_started'
  | 'order_created'
  | 'payment_confirmed';

type TrackEventInput = {
  eventType: AnalyticsEventType;
  productId?: string | null;
  orderId?: string | null;
  quantity?: number;
  amount?: number;
  metadata?: Record<string, unknown>;
};

const ANALYTICS_SESSION_KEY = 'club-orquideas-analytics-session-id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createSessionId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getOrCreateSessionId = () => {
  if (typeof window === 'undefined') {
    return createSessionId();
  }

  try {
    const currentSessionId = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
    if (currentSessionId) {
      return currentSessionId;
    }

    const nextSessionId = createSessionId();
    window.localStorage.setItem(ANALYTICS_SESSION_KEY, nextSessionId);
    return nextSessionId;
  } catch {
    return createSessionId();
  }
};

const toUuidOrNull = (value?: string | null) => {
  if (!value || !UUID_PATTERN.test(value)) {
    return null;
  }

  return value;
};

const getProductUuid = (product: Product | CartItem | CartItemInput) => toUuidOrNull(product.sourceId);

const trackAnalyticsEvent = async ({
  eventType,
  productId = null,
  orderId = null,
  quantity = 1,
  amount = 0,
  metadata = {},
}: TrackEventInput) => {
  if (!supabase) {
    return;
  }

  const payload = {
    p_event_type: eventType,
    p_product_id: toUuidOrNull(productId),
    p_order_id: toUuidOrNull(orderId),
    p_quantity: Math.max(1, Math.trunc(Number(quantity) || 1)),
    p_amount: Number.isFinite(Number(amount)) ? Number(amount) : 0,
    p_metadata: metadata,
    p_session_id: getOrCreateSessionId(),
  };

  try {
    const { error } = await supabase.rpc('track_analytics_event', payload);

    if (error && import.meta.env.DEV) {
      console.warn('No se pudo registrar analytics:', error);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('No se pudo registrar analytics:', error);
    }
  }
};

export const trackProductView = (product: Product) => {
  void trackAnalyticsEvent({
    eventType: 'product_view',
    productId: getProductUuid(product),
    metadata: {
      product_name: product.name,
      category: product.category,
      type: product.type,
      source: 'product_detail',
    },
  });
};

export const trackAddToCart = (item: CartItem | CartItemInput) => {
  void trackAnalyticsEvent({
    eventType: 'add_to_cart',
    productId: getProductUuid(item),
    quantity: item.quantity,
    amount: item.price * item.quantity,
    metadata: {
      product_name: item.name,
      price: item.price,
      size: item.size,
      color: item.color,
    },
  });
};

export const trackAddToFavorite = (product: Product) => {
  void trackAnalyticsEvent({
    eventType: 'add_to_favorite',
    productId: getProductUuid(product),
    metadata: {
      product_name: product.name,
      category: product.category,
      type: product.type,
    },
  });
};

export const trackRemoveFromFavorite = (product: Product) => {
  void trackAnalyticsEvent({
    eventType: 'remove_from_favorite',
    productId: getProductUuid(product),
    metadata: {
      product_name: product.name,
      category: product.category,
      type: product.type,
    },
  });
};

export const trackCheckoutStarted = (amount: number) => {
  void trackAnalyticsEvent({
    eventType: 'checkout_started',
    amount,
  });
};

export const trackOrderCreated = (order: { id?: string; total?: number; amount?: number }) => {
  void trackAnalyticsEvent({
    eventType: 'order_created',
    orderId: order.id,
    amount: order.total ?? order.amount ?? 0,
  });
};

export const trackPaymentConfirmed = (order: { id?: string; total?: number; amount?: number }) => {
  void trackAnalyticsEvent({
    eventType: 'payment_confirmed',
    orderId: order.id,
    amount: order.total ?? order.amount ?? 0,
  });
};
