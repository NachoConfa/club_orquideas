import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
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
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[#16352B]/55" onClick={onClose} />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md transform bg-[#FFF8EF] shadow-xl transition-transform duration-300 ease-in-out">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#F1E3D4] bg-white p-4 sm:p-6">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-6 w-6 text-[#0F8F61]" />
              <h2 className="text-xl font-semibold text-[#16352B]">Mi carrito</h2>
              <span className="rounded-full bg-[#E8F7EF] px-2 py-1 text-sm font-bold text-[#0F8F61]">
                {itemCount}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              aria-label="Cerrar carrito"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {items.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F7EF]">
                  <ShoppingBag className="h-10 w-10 text-[#0F8F61]" />
                </div>
                <p className="text-lg font-semibold text-[#16352B]">Tu carrito está vacío</p>
                <p className="mt-2 text-sm text-[#6B7280]">Agregá plantas, macetas u otros productos para empezar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.cartKey} className="animate-fadeIn rounded-xl border border-[#F1E3D4] bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-medium text-[#16352B]">{item.name}</h3>
                        <p className="text-sm text-[#6B7280]">
                          {[item.size, item.color, item.floweringStems ? `${item.floweringStems} varas` : '']
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="text-lg font-semibold text-[#0F8F61]">${item.price.toLocaleString('es-AR')}</p>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.cartKey)}
                        className="rounded-full p-2 text-red-400 transition-colors hover:bg-[#FDECEC] hover:text-red-600"
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => onUpdateQuantity(item.cartKey, Math.max(0, item.quantity - 1))}
                          className="rounded-full border border-[#F1E3D4] bg-white p-1 transition-colors hover:bg-[#E8F7EF]"
                          aria-label="Restar cantidad"
                        >
                          <Minus className="h-4 w-4 text-[#6B7280]" />
                        </button>
                        <span className="min-w-[2rem] text-center font-medium text-[#16352B]">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)}
                          disabled={Boolean(item.stock && item.quantity >= item.stock)}
                          className="rounded-full border border-[#F1E3D4] bg-white p-1 transition-colors hover:bg-[#E8F7EF] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Sumar cantidad"
                        >
                          <Plus className="h-4 w-4 text-[#6B7280]" />
                        </button>
                      </div>
                      <p className="font-semibold text-[#16352B]">${(item.price * item.quantity).toLocaleString('es-AR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-[#F1E3D4] bg-white p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-[#16352B]">Total:</span>
                <span className="text-2xl font-bold text-[#0F8F61]">${total.toLocaleString('es-AR')}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full rounded-lg bg-[#0F8F61] px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-[#0C7A52]"
              >
                Finalizar compra
              </button>
              <button
                onClick={onClose}
                className="mt-2 w-full py-2 text-[#6B7280] transition-colors hover:text-[#16352B]"
              >
                Continuar comprando
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Cart;
