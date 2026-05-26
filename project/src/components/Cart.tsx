import React from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import type { CartItem } from '../types/cart';

interface CartProps {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (cartKey: string, quantity: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({ items, isOpen, onClose, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[#2F3A35]/55" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md transform bg-[#FFF8EF] shadow-xl transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D9C7B4]/80 bg-[#E8DCCB] p-6">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-6 w-6 text-[#2F3A35]" />
              <h2 className="text-xl font-semibold text-[#2F3A35]">Mi Carrito</h2>
              <span className="rounded-full bg-[#F8DDEB] px-2 py-1 text-sm font-bold text-[#D96C9F]">
                {itemCount}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-[#2F3A35] transition-colors hover:text-[#D96C9F]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#F8DDEB]/65">
                  <ShoppingBag className="h-10 w-10 text-[#D96C9F]" />
                </div>
                <p className="text-lg font-semibold text-[#2F3A35]">Tu carrito está vacío</p>
                <p className="mt-2 text-sm text-[#6B756F]">Agregá algunas orquídeas hermosas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.cartKey} className="animate-fadeIn rounded-lg border border-[#EADBC8]/70 bg-white p-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="line-clamp-2 font-medium text-[#2F3A35]">{item.name}</h3>
                        <p className="text-sm text-[#6B756F]">
                          {[item.size, item.color, item.floweringStems ? `${item.floweringStems} varas` : '']
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                        <p className="text-lg font-semibold text-[#5FAE9B]">${item.price.toLocaleString('es-AR')}</p>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.cartKey)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => onUpdateQuantity(item.cartKey, Math.max(0, item.quantity - 1))}
                          className="rounded-full border border-[#EADBC8] bg-white p-1 transition-colors hover:bg-[#F8DDEB]/45"
                        >
                          <Minus className="h-4 w-4 text-[#6B756F]" />
                        </button>
                        <span className="min-w-[2rem] text-center font-medium text-[#2F3A35]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)}
                          disabled={Boolean(item.stock && item.quantity >= item.stock)}
                          className="rounded-full border border-[#EADBC8] bg-white p-1 transition-colors hover:bg-[#F8DDEB]/45 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4 text-[#6B756F]" />
                        </button>
                      </div>
                      <p className="font-semibold text-[#2F3A35]">
                        ${(item.price * item.quantity).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-[#EADBC8] bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-[#2F3A35]">Total:</span>
                <span className="text-2xl font-bold text-[#D96C9F]">${total.toLocaleString('es-AR')}</span>
              </div>
              <button 
                onClick={onCheckout}
                className="w-full rounded-lg bg-[#D96C9F] px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-[#C8568B]"
              >
                Finalizar Compra
              </button>
              <button
                onClick={onClose}
                className="mt-2 w-full py-2 text-[#6B756F] transition-colors hover:text-[#2F3A35]"
              >
                Continuar Comprando
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
