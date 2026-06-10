export type LoyaltyBenefitType = 'gift' | 'manual' | 'coupon';

export interface LoyaltyBenefit {
  id: string;
  title: string;
  description: string | null;
  required_purchases: number;
  benefit_type: LoyaltyBenefitType;
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_description: string | null;
  coupon_is_active: boolean | null;
  is_unlocked?: boolean;
  gift_description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyBenefitInput {
  title: string;
  description: string;
  required_purchases: number | string;
  benefit_type: LoyaltyBenefitType;
  coupon_id: string;
  gift_description: string;
  is_active: boolean;
  sort_order: number | string;
}
