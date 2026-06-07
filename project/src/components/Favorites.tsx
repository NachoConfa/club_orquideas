import React from 'react';
import { X, Heart, ShoppingCart, Trash2 } from '../lib/icons';
import type { Product } from '../types/product';

interface FavoritesProps {
  items: Product[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveItem: (id: number) => void;
  onAddToCart: (product: Product) => void;
}

const Favorites: React.FC<FavoritesProps> = ({ items, isOpen, onClose, onRemoveItem, onAddToCart }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-pink-500 to-rose-500">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-white" />
              <h2 className="text-xl font-semibold text-white">Mis Favoritos</h2>
              <span className="bg-white text-pink-500 text-sm font-bold px-2 py-1 rounded-full">
                {items.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-pink-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No tienes favoritos aún</p>
                <p className="text-gray-400 text-sm mt-2">¡Agrega productos que te gusten!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const requiresQuote = item.priceMode === 'quote';

                  return (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4 animate-fadeIn">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 line-clamp-2">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.size} • {item.color}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-semibold text-pink-600">
                            {requiresQuote ? 'A cotizar' : `$${item.price.toLocaleString('es-AR')}`}
                          </p>
                          {!requiresQuote && item.originalPrice && (
                            <p className="text-sm text-gray-500 line-through">${item.originalPrice.toLocaleString('es-AR')}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="mt-3">
                      <button
                        onClick={() => onAddToCart(item)}
                        disabled={!item.inStock && !requiresQuote}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                          item.inStock || requiresQuote
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>{requiresQuote ? 'Consultar' : item.inStock ? 'Agregar al Carrito' : 'Agotado'}</span>
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-white p-6">
            <button
              onClick={onClose}
              className="w-full text-gray-600 py-2 hover:text-gray-800 transition-colors"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Favorites;
