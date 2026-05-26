export interface ProductVariant {
  id?: string;
  productId?: string;
  size: string;
  color?: string;
  floweringStems?: number;
  price: number;
  stock: number;
  image?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type ProductAttributes = Record<string, unknown>;

export interface Product {
  id: number;
  sourceId?: string;
  slug?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  color: string;
  size: string;
  inStock: boolean;
  type: string;
  description?: string;
  stock?: number;
  floweringStems?: number;
  images?: string[];
  colors?: string[];
  variants?: ProductVariant[];
  attributes?: ProductAttributes;
}
