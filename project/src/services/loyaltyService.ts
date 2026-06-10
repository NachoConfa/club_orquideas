import { getSupabaseConfigMessage, supabase } from '../lib/supabase';
import type { LoyaltyBenefit, LoyaltyBenefitInput, LoyaltyBenefitType } from '../types/loyalty';

const LOYALTY_BENEFIT_COLUMNS =
  'id, title, description, required_purchases, benefit_type, coupon_id, gift_description, is_active, sort_order, created_at, updated_at, coupons(code, description, is_active)';

const getClient = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

const isMissingTableError = (error: { code?: string; message?: string } | null | undefined) => {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('loyalty_benefits') ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
};

const toText = (value: unknown) => String(value ?? '').trim();
const toTextOrNull = (value: unknown) => toText(value) || null;
const toNonNegativeInteger = (value: unknown, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.max(0, Math.trunc(parsedValue)) : fallback;
};
const toInteger = (value: unknown, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : fallback;
};

const normalizeBenefitType = (value: unknown): LoyaltyBenefitType => {
  if (value === 'gift' || value === 'coupon') {
    return value;
  }

  return 'manual';
};

const mapBenefit = (benefit: LoyaltyBenefit & { coupons?: unknown }): LoyaltyBenefit => {
  const joinedCoupon = Array.isArray(benefit.coupons) ? benefit.coupons[0] : benefit.coupons;
  const coupon =
    joinedCoupon && typeof joinedCoupon === 'object'
      ? (joinedCoupon as { code?: unknown; description?: unknown; is_active?: unknown })
      : null;

  return {
    ...benefit,
    description: benefit.description ?? null,
    required_purchases: toNonNegativeInteger(benefit.required_purchases),
    benefit_type: normalizeBenefitType(benefit.benefit_type),
    coupon_id: benefit.coupon_id ?? null,
    coupon_code: coupon?.code ? toText(coupon.code).toUpperCase() : benefit.coupon_code ?? null,
    coupon_description: coupon?.description ? toText(coupon.description) : benefit.coupon_description ?? null,
    coupon_is_active:
      coupon?.is_active === undefined ? benefit.coupon_is_active ?? null : coupon.is_active === true,
    gift_description: benefit.gift_description ?? null,
    is_active: benefit.is_active === true,
    is_unlocked: benefit.is_unlocked === true,
    sort_order: toInteger(benefit.sort_order),
  };
};

const toBenefitPayload = (benefit: LoyaltyBenefitInput) => {
  const title = toText(benefit.title);
  if (!title) {
    throw new Error('El beneficio necesita un título.');
  }

  const requiredPurchases = Number(benefit.required_purchases);
  if (!Number.isFinite(requiredPurchases) || requiredPurchases < 0) {
    throw new Error('Las compras requeridas deben ser un número igual o mayor que cero.');
  }

  const sortOrder = Number(benefit.sort_order);
  const benefitType = normalizeBenefitType(benefit.benefit_type);
  const couponId = toTextOrNull(benefit.coupon_id);

  if (benefitType === 'coupon' && !couponId) {
    throw new Error('Seleccioná un cupón para este beneficio.');
  }

  return {
    title,
    description: toTextOrNull(benefit.description),
    required_purchases: Math.trunc(requiredPurchases),
    benefit_type: benefitType,
    coupon_id: benefitType === 'coupon' ? couponId : null,
    gift_description: toTextOrNull(benefit.gift_description),
    is_active: benefit.is_active === true,
    sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
  };
};

export const emptyLoyaltyBenefitInput = (): LoyaltyBenefitInput => ({
  title: '',
  description: '',
  required_purchases: 0,
  benefit_type: 'manual',
  coupon_id: '',
  gift_description: '',
  is_active: true,
  sort_order: 0,
});

export const loyaltyBenefitToInput = (benefit: LoyaltyBenefit): LoyaltyBenefitInput => ({
  title: benefit.title,
  description: benefit.description ?? '',
  required_purchases: benefit.required_purchases,
  benefit_type: benefit.benefit_type,
  coupon_id: benefit.coupon_id ?? '',
  gift_description: benefit.gift_description ?? '',
  is_active: benefit.is_active,
  sort_order: benefit.sort_order,
});

export const getActiveLoyaltyBenefits = async (): Promise<LoyaltyBenefit[]> => {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_my_loyalty_benefits');

  if (isMissingTableError(error)) {
    return [];
  }

  if (error) {
    throw error;
  }

  return ((data ?? []) as LoyaltyBenefit[]).map(mapBenefit);
};

export const getAdminLoyaltyBenefits = async (): Promise<LoyaltyBenefit[]> => {
  const client = getClient();
  const { data, error } = await client
    .from('loyalty_benefits')
    .select(LOYALTY_BENEFIT_COLUMNS)
    .order('required_purchases', { ascending: true })
    .order('sort_order', { ascending: true });

  if (isMissingTableError(error)) {
    throw new Error('Falta ejecutar el SQL de loyalty_benefits en Supabase.');
  }

  if (error) {
    throw error;
  }

  return ((data ?? []) as LoyaltyBenefit[]).map(mapBenefit);
};

export const createLoyaltyBenefit = async (benefit: LoyaltyBenefitInput): Promise<LoyaltyBenefit> => {
  const client = getClient();
  const { data, error } = await client
    .from('loyalty_benefits')
    .insert(toBenefitPayload(benefit))
    .select(LOYALTY_BENEFIT_COLUMNS)
    .single();

  if (isMissingTableError(error)) {
    throw new Error('Falta ejecutar el SQL de loyalty_benefits en Supabase.');
  }

  if (error) {
    throw error;
  }

  return mapBenefit(data as LoyaltyBenefit);
};

export const updateLoyaltyBenefit = async (
  id: string,
  benefit: LoyaltyBenefitInput
): Promise<LoyaltyBenefit> => {
  const client = getClient();
  const { data, error } = await client
    .from('loyalty_benefits')
    .update({ ...toBenefitPayload(benefit), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(LOYALTY_BENEFIT_COLUMNS)
    .single();

  if (isMissingTableError(error)) {
    throw new Error('Falta ejecutar el SQL de loyalty_benefits en Supabase.');
  }

  if (error) {
    throw error;
  }

  return mapBenefit(data as LoyaltyBenefit);
};

export const deleteLoyaltyBenefit = async (id: string) => {
  const client = getClient();
  const { error } = await client.from('loyalty_benefits').delete().eq('id', id);

  if (isMissingTableError(error)) {
    throw new Error('Falta ejecutar el SQL de loyalty_benefits en Supabase.');
  }

  if (error) {
    throw error;
  }
};
