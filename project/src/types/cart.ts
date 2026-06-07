import type { PriceMode, StockMode } from './product';

export interface CartItem {
  cartKey: string;
  id: number;
  sourceId?: string;
  variantId?: string;
  name: string;
  price: number;
  priceMode?: PriceMode;
  image: string;
  quantity: number;
  color: string;
  size: string;
  floweringStems?: number;
  stock?: number;
  stockMode?: StockMode;
}

export type CartItemInput = Omit<CartItem, 'cartKey'> & {
  cartKey?: string;
};
