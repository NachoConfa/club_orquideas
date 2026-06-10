export type CouponDiscountType = 'percent' | 'fixed_amount' | 'free_shipping';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  min_order_amount: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  requires_login: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  usage_count?: number;
}

export interface CouponInput {
  code: string;
  description: string;
  discount_type: CouponDiscountType;
  discount_value: number | string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  min_order_amount: number | string;
  max_uses: number | string;
  max_uses_per_user: number | string;
  requires_login: boolean;
  notes: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon_id: string | null;
  code: string | null;
  discount_type: CouponDiscountType | null;
  discount_value: number;
  discount_amount: number;
  message: string;
}
