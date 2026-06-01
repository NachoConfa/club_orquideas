export interface CareGuideVariant {
  id: string;
  care_guide_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  light: string | null;
  watering: string | null;
  temperature: string | null;
  humidity: string | null;
  fertilization: string | null;
  transplant: string | null;
  flowering: string | null;
  special_tips: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CareGuide {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  category: string | null;
  difficulty: string | null;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  light: string | null;
  watering: string | null;
  temperature: string | null;
  humidity: string | null;
  fertilization: string | null;
  transplant: string | null;
  flowering: string | null;
  special_tips: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  variants?: CareGuideVariant[];
}

export interface CareGuideVariantInput {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  light: string;
  watering: string;
  temperature: string;
  humidity: string;
  fertilization: string;
  transplant: string;
  flowering: string;
  special_tips: string;
  is_active: boolean;
  sort_order: number;
}

export interface CareGuideInput {
  title: string;
  slug?: string;
  subtitle: string;
  category: string;
  difficulty: string;
  short_description: string;
  description: string;
  image_url: string;
  light: string;
  watering: string;
  temperature: string;
  humidity: string;
  fertilization: string;
  transplant: string;
  flowering: string;
  special_tips: string;
  is_active: boolean;
  sort_order: number;
  variants: CareGuideVariantInput[];
  deletedVariantIds?: string[];
}
