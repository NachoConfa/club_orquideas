export interface CartItem {
  cartKey: string;
  id: number;
  sourceId?: string;
  variantId?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color: string;
  size: string;
  stock?: number;
}

export type CartItemInput = Omit<CartItem, 'cartKey'> & {
  cartKey?: string;
};
