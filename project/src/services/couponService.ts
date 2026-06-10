import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import type {
  Coupon,
  CouponDiscountType,
  CouponInput,
  CouponValidationResult,
} from '../types/coupon';

const COUPON_COLUMNS =
  'id, code, description, discount_type, discount_value, is_active, starts_at, ends_at, min_order_amount, max_uses, max_uses_per_user, requires_login, notes, created_at, updated_at';

const getClient = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

const toText = (value: unknown) => String(value ?? '').trim();
const toTextOrNull = (value: unknown) => toText(value) || null;
const toNonNegativeNumber = (value: unknown, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : fallback;
};
const toPositiveIntegerOrNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.trunc(parsedValue) : null;
};
const normalizeDiscountType = (value: unknown): CouponDiscountType => {
  if (value === 'fixed_amount' || value === 'free_shipping') {
    return value;
  }

  return 'percent';
};
const toIsoDateOrNull = (value: unknown) => {
  const text = toText(value);
  if (!text) {
    return null;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Revisá las fechas del cupón.');
  }

  return date.toISOString();
};
const toDatetimeLocal = (value: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const isMissingCouponSchemaError = (error: { code?: string; message?: string } | null | undefined) => {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST202' ||
    error?.code === 'PGRST205' ||
    message.includes('validate_coupon_for_checkout') ||
    message.includes("could not find the table 'public.coupons'") ||
    message.includes('relation "public.coupons" does not exist') ||
    message.includes('schema cache')
  );
};

const mapCoupon = (coupon: Coupon): Coupon => ({
  ...coupon,
  code: toText(coupon.code).toUpperCase(),
  description: coupon.description ?? null,
  discount_type: normalizeDiscountType(coupon.discount_type),
  discount_value: toNonNegativeNumber(coupon.discount_value),
  is_active: coupon.is_active === true,
  starts_at: coupon.starts_at ?? null,
  ends_at: coupon.ends_at ?? null,
  min_order_amount: toNonNegativeNumber(coupon.min_order_amount),
  max_uses: toPositiveIntegerOrNull(coupon.max_uses),
  max_uses_per_user: toPositiveIntegerOrNull(coupon.max_uses_per_user),
  requires_login: coupon.requires_login !== false,
  notes: coupon.notes ?? null,
});

const toCouponPayload = (coupon: CouponInput) => {
  const code = toText(coupon.code).toUpperCase();
  if (!code) {
    throw new Error('El cupón necesita un código.');
  }

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new Error('El código solo puede usar letras, números, guiones y guion bajo.');
  }

  const discountType = normalizeDiscountType(coupon.discount_type);
  const discountValue = toNonNegativeNumber(coupon.discount_value);
  if (discountType === 'percent' && discountValue > 100) {
    throw new Error('El descuento porcentual no puede superar el 100%.');
  }

  const startsAt = toIsoDateOrNull(coupon.starts_at);
  const endsAt = toIsoDateOrNull(coupon.ends_at);
  if (startsAt && endsAt && new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio.');
  }

  return {
    code,
    description: toTextOrNull(coupon.description),
    discount_type: discountType,
    discount_value: discountType === 'free_shipping' ? 0 : discountValue,
    is_active: coupon.is_active === true,
    starts_at: startsAt,
    ends_at: endsAt,
    min_order_amount: toNonNegativeNumber(coupon.min_order_amount),
    max_uses: toPositiveIntegerOrNull(coupon.max_uses),
    max_uses_per_user: toPositiveIntegerOrNull(coupon.max_uses_per_user),
    requires_login: coupon.requires_login === true,
    notes: toTextOrNull(coupon.notes),
  };
};

export const emptyCouponInput = (): CouponInput => ({
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: 0,
  is_active: true,
  starts_at: '',
  ends_at: '',
  min_order_amount: 0,
  max_uses: '',
  max_uses_per_user: '',
  requires_login: true,
  notes: '',
});

export const couponToInput = (coupon: Coupon): CouponInput => ({
  code: coupon.code,
  description: coupon.description ?? '',
  discount_type: coupon.discount_type,
  discount_value: coupon.discount_value,
  is_active: coupon.is_active,
  starts_at: toDatetimeLocal(coupon.starts_at),
  ends_at: toDatetimeLocal(coupon.ends_at),
  min_order_amount: coupon.min_order_amount,
  max_uses: coupon.max_uses ?? '',
  max_uses_per_user: coupon.max_uses_per_user ?? '',
  requires_login: coupon.requires_login,
  notes: coupon.notes ?? '',
});

export const getAdminCoupons = async (): Promise<Coupon[]> => {
  const client = getClient();
  const [{ data, error }, { data: redemptions, error: redemptionsError }] = await Promise.all([
    client.from('coupons').select(COUPON_COLUMNS).order('created_at', { ascending: false }),
    client
      .from('coupon_redemptions')
      .select('coupon_id, status')
      .in('status', ['reserved', 'redeemed']),
  ]);

  if (isMissingCouponSchemaError(error) || isMissingCouponSchemaError(redemptionsError)) {
    throw new Error('Falta ejecutar el SQL de cupones en Supabase.');
  }

  if (error) throw error;
  if (redemptionsError) throw redemptionsError;

  const usageByCoupon = new Map<string, number>();
  for (const redemption of redemptions ?? []) {
    const couponId = String(redemption.coupon_id ?? '');
    if (couponId) {
      usageByCoupon.set(couponId, (usageByCoupon.get(couponId) ?? 0) + 1);
    }
  }

  return ((data ?? []) as Coupon[]).map((coupon) => ({
    ...mapCoupon(coupon),
    usage_count: usageByCoupon.get(coupon.id) ?? 0,
  }));
};

export const createCoupon = async (coupon: CouponInput): Promise<Coupon> => {
  const client = getClient();
  const { data, error } = await client
    .from('coupons')
    .insert(toCouponPayload(coupon))
    .select(COUPON_COLUMNS)
    .single();

  if (error?.code === '23505') {
    throw new Error('Ya existe un cupón con ese código.');
  }
  if (isMissingCouponSchemaError(error)) {
    throw new Error('Falta ejecutar el SQL de cupones en Supabase.');
  }
  if (error) throw error;

  return mapCoupon(data as Coupon);
};

export const updateCoupon = async (id: string, coupon: CouponInput): Promise<Coupon> => {
  const client = getClient();
  const { data, error } = await client
    .from('coupons')
    .update({ ...toCouponPayload(coupon), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COUPON_COLUMNS)
    .single();

  if (error?.code === '23505') {
    throw new Error('Ya existe un cupón con ese código.');
  }
  if (isMissingCouponSchemaError(error)) {
    throw new Error('Falta ejecutar el SQL de cupones en Supabase.');
  }
  if (error) throw error;

  return mapCoupon(data as Coupon);
};

export const deleteCoupon = async (id: string) => {
  const client = getClient();
  const { error } = await client.from('coupons').delete().eq('id', id);

  if (isMissingCouponSchemaError(error)) {
    throw new Error('Falta ejecutar el SQL de cupones en Supabase.');
  }
  if (error?.code === '23503') {
    throw new Error('Este cupón tiene usos registrados y no puede eliminarse. Podés desactivarlo.');
  }
  if (error) throw error;
};

// Los pedidos pendientes con cupón reservado consumen cupo hasta cancelarse.
export const validateCouponForCheckout = async (
  code: string,
  subtotal: number,
  shipping = 0
): Promise<CouponValidationResult> => {
  const client = getClient();
  const normalizedCode = toText(code).toUpperCase();
  if (!normalizedCode) {
    return {
      valid: false,
      coupon_id: null,
      code: null,
      discount_type: null,
      discount_value: 0,
      discount_amount: 0,
      message: 'Ingresá un código de cupón.',
    };
  }

  const { data, error } = await client.rpc('validate_coupon_for_checkout', {
    p_code: normalizedCode,
    p_subtotal: toNonNegativeNumber(subtotal),
    p_shipping: toNonNegativeNumber(shipping),
  });

  if (isMissingCouponSchemaError(error)) {
    throw new Error('Falta ejecutar el SQL de cupones en Supabase.');
  }
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as Partial<CouponValidationResult> | null;
  if (!row) {
    throw new Error('No pudimos validar el cupón. Intentá nuevamente.');
  }

  return {
    valid: row.valid === true,
    coupon_id: row.coupon_id ?? null,
    code: row.code ? toText(row.code).toUpperCase() : null,
    discount_type: row.discount_type ? normalizeDiscountType(row.discount_type) : null,
    discount_value: toNonNegativeNumber(row.discount_value),
    discount_amount: toNonNegativeNumber(row.discount_amount),
    message: toText(row.message) || 'No pudimos validar el cupón.',
  };
};
