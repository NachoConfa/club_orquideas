export interface ProductVariant {
  id?: string;
  size: string;
  color?: string;
  price: number;
  stock: number;
  image?: string;
}

export type ProductAttributes = Record<string, unknown>;

export interface Product {
  id: number;
  sourceId?: string;
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
