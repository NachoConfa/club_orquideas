import type {
  EventNumberInput,
  EventRelatedProduct,
  EventRelatedProductVariant,
} from './event';

export interface ProductCollectionSectionProduct {
  id: string;
  collection_section_id: string;
  product_id: string;
  sort_order: EventNumberInput;
  created_at: string;
  product?: EventRelatedProduct;
}

export interface ProductCollectionSection {
  id: string;
  collection_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: EventNumberInput;
  created_at: string;
  updated_at: string;
  products?: ProductCollectionSectionProduct[];
}

export interface ProductCollection {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: EventNumberInput;
  created_at: string;
  updated_at: string;
  sections?: ProductCollectionSection[];
}

export interface ProductCollectionSectionProductInput {
  id?: string;
  product_id: string;
  sort_order: EventNumberInput;
}

export interface ProductCollectionSectionInput {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  sort_order: EventNumberInput;
  products: ProductCollectionSectionProductInput[];
}

export interface ProductCollectionInput {
  title: string;
  slug?: string;
  subtitle: string;
  description: string;
  image_url: string;
  is_active: boolean;
  sort_order: EventNumberInput;
  sections: ProductCollectionSectionInput[];
  deletedSectionIds?: string[];
}

export type CollectionRelatedProduct = EventRelatedProduct;
export type CollectionRelatedProductVariant = EventRelatedProductVariant;
