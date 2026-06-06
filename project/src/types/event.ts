export type EventStatus = 'upcoming' | 'available' | 'finished';
export type EventTextInput = string | number;
export type EventNumberInput = number | string;

export interface EventSection {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: EventNumberInput;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: EventSectionProduct[];
}

export interface EventRelatedProductVariant {
  id: string;
  product_id: string;
  price: number;
  stock: number;
  stock_mode: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: EventNumberInput;
}

export interface EventRelatedProduct {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price: number;
  stock: number;
  stock_mode: string | null;
  orchid_type: string | null;
  color: string | null;
  size: string | null;
  image_url: string | null;
  is_active: boolean;
  variants?: EventRelatedProductVariant[];
}

export interface EventSectionProduct {
  id: string;
  event_section_id: string;
  product_id: string;
  sort_order: EventNumberInput;
  created_at: string;
  product?: EventRelatedProduct;
}

export interface StoreEvent {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  modality: string | null;
  status: EventStatus | string | null;
  capacity: string | number | null;
  whatsapp_message: string | null;
  is_active: boolean;
  sort_order: EventNumberInput;
  created_at: string;
  updated_at: string;
  sections?: EventSection[];
}

export interface EventSectionInput {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  sort_order: EventNumberInput;
  is_active: boolean;
  products: EventSectionProductInput[];
}

export interface EventSectionProductInput {
  id?: string;
  product_id: string;
  sort_order: EventNumberInput;
}

export interface EventInput {
  title: string;
  slug?: string;
  short_description: string;
  description: string;
  image_url: string;
  event_date: string;
  event_time: string;
  location: string;
  modality: string;
  status: EventStatus;
  capacity: EventTextInput;
  whatsapp_message: string;
  is_active: boolean;
  sort_order: EventNumberInput;
  sections: EventSectionInput[];
  deletedSectionIds?: string[];
}
