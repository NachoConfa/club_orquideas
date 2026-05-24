import React from 'react';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import type { Product } from '../types/product';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  isFavorite: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetails, onToggleFavorite, isFavorite }) => {
  const handleOpenDetails = () => {
    onOpenDetails(product);
  };

  const handleToggleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleFavorite(product);
  };

  return (
    <div
      onClick={handleOpenDetails}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenDetails();
        }
      }}
      role="button"
      tabIndex={0}
      className="group cursor-pointer overflow-hidden rounded-xl border border-[#EADBC8]/70 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#7FAF9B]"
    >
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 sm:h-56 lg:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 space-y-2">
          <button 
            onClick={handleToggleFavorite}
            className={`rounded-full bg-white p-1.5 shadow-sm transition-colors sm:p-2 ${
              isFavorite ? 'bg-[#F8DDEB]' : 'hover:bg-[#F8DDEB]'
            }`}
          >
            <Heart className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors ${
              isFavorite ? 'text-[#D96C9F] fill-current' : 'text-[#6B756F] hover:text-[#D96C9F]'
            }`} />
          </button>
          {product.originalPrice && (
            <div className="rounded-full bg-[#D96C9F] px-2 py-1 text-xs font-bold text-white">
              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </div>
          )}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">Agotado</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="mb-2">
          <span className="rounded-full bg-[#CFE3D4] px-2 py-1 text-xs font-medium text-[#2F3A35]">
            {product.category}
          </span>
        </div>
        
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[#2F3A35] transition-colors group-hover:text-[#5FAE9B] sm:text-base">
          {product.name}
        </h3>

        <div className="flex items-center mb-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 sm:h-4 sm:w-4 ${
                  i < product.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="ml-1 text-xs text-[#6B756F] sm:ml-2 sm:text-sm">({product.reviews})</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-1 sm:space-y-0">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span className="text-lg font-bold text-[#2F3A35] sm:text-xl">${product.price.toLocaleString('es-AR')}</span>
            {product.originalPrice && (
              <span className="text-xs text-[#6B756F] line-through sm:text-sm">${product.originalPrice.toLocaleString('es-AR')}</span>
            )}
          </div>
          <div className="text-xs text-[#6B756F] sm:text-sm">
            {product.size} • {product.color}
          </div>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            handleOpenDetails();
          }}
          disabled={!product.inStock}
          className={`w-full py-2 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base ${
            product.inStock
              ? 'bg-[#5FAE9B] text-white hover:bg-[#4D9A88] transform hover:scale-105'
              : 'cursor-not-allowed bg-[#EADBC8] text-[#6B756F]'
          }`}
        >
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{product.inStock ? 'Agregar al Carrito' : 'Agotado'}</span>
          <span className="sm:hidden">{product.inStock ? 'Agregar' : 'Agotado'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
