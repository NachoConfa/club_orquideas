import React from 'react';
import { Heart, ShoppingCart, Star } from 'lucide-react';

interface Product {
  id: number;
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
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  isFavorite: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onToggleFavorite, isFavorite }) => {
  const handleAddToCart = () => {
    onAddToCart(product);
  };

  const handleToggleFavorite = () => {
    onToggleFavorite(product);
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group">
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 sm:h-56 lg:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 space-y-2">
          <button 
            onClick={handleToggleFavorite}
            className={`bg-white p-1.5 sm:p-2 rounded-full shadow-md transition-colors ${
              isFavorite ? 'bg-pink-50' : 'hover:bg-pink-50'
            }`}
          >
            <Heart className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors ${
              isFavorite ? 'text-pink-500 fill-current' : 'text-gray-400 hover:text-pink-500'
            }`} />
          </button>
          {product.originalPrice && (
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2 py-1 rounded-full text-xs font-bold">
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
          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
            {product.category}
          </span>
        </div>
        
        <h3 className="font-semibold text-sm sm:text-base text-gray-800 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
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
          <span className="text-xs sm:text-sm text-gray-500 ml-1 sm:ml-2">({product.reviews})</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-1 sm:space-y-0">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span className="text-lg sm:text-xl font-bold text-gray-800">${product.price.toLocaleString('es-AR')}</span>
            {product.originalPrice && (
              <span className="text-xs sm:text-sm text-gray-500 line-through">${product.originalPrice.toLocaleString('es-AR')}</span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            {product.size} • {product.color}
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className={`w-full py-2 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base ${
            product.inStock
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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