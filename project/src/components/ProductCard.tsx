import React from 'react';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import type { Product } from '../types/product';
import { getCategoryDisplayLabel } from '../utils/displayLabels';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  isFavorite: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetails, onToggleFavorite, isFavorite }) => {
  const categoryLabel = getCategoryDisplayLabel(product.category);
  const activeVariants = (product.variants ?? []).filter((variant) => variant.isActive !== false);
  const requiresAvailabilityConsult =
    activeVariants.length > 0
      ? activeVariants.every((variant) => variant.stockMode === 'consult')
      : product.stockMode === 'consult';
  const isUnavailable = !requiresAvailabilityConsult && !product.inStock;

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
      className="group cursor-pointer overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#16352B]/10 focus:outline-none focus:ring-2 focus:ring-[#0F8F61]"
    >
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-56 lg:h-64"
        />
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 space-y-2">
          <button 
            onClick={handleToggleFavorite}
            className={`rounded-full bg-white p-1.5 shadow-sm transition-colors sm:p-2 ${
              isFavorite ? 'bg-[#F8DDEB]' : 'hover:bg-[#E8F7EF]'
            }`}
          >
            <Heart className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors ${
              isFavorite ? 'text-[#D96C9F] fill-current' : 'text-[#6B7280] hover:text-[#0F8F61]'
            }`} />
          </button>
          {product.originalPrice && (
            <div className="rounded-full bg-[#D96C9F] px-2 py-1 text-xs font-bold text-white">
              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </div>
          )}
        </div>
        {isUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#16352B]/55">
            <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#16352B]">Sin stock</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="mb-2">
          <span className="rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
            {categoryLabel}
          </span>
        </div>
        
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[#16352B] transition-colors group-hover:text-[#0F8F61] sm:text-base">
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
          <span className="ml-1 text-xs text-[#6B7280] sm:ml-2 sm:text-sm">({product.reviews})</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-1 sm:space-y-0">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span className="text-lg font-bold text-[#16352B] sm:text-xl">${product.price.toLocaleString('es-AR')}</span>
            {product.originalPrice && (
              <span className="text-xs text-[#6B7280] line-through sm:text-sm">${product.originalPrice.toLocaleString('es-AR')}</span>
            )}
          </div>
          <div className="text-xs text-[#6B7280] sm:text-sm">
            {requiresAvailabilityConsult ? 'Consultar disponibilidad' : `${product.size} · ${product.color}`}
          </div>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            handleOpenDetails();
          }}
          disabled={isUnavailable}
          className={`w-full py-2 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base ${
            !isUnavailable
              ? 'bg-[#0F8F61] text-white hover:bg-[#0C7A52] transform hover:scale-[1.02]'
              : 'cursor-not-allowed bg-[#F1E3D4] text-[#6B7280]'
          }`}
        >
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{isUnavailable ? 'Sin stock' : 'Ver producto'}</span>
          <span className="sm:hidden">{isUnavailable ? 'Sin stock' : 'Ver'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
