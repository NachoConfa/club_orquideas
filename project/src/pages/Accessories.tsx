import React from 'react';
import {
  ArrowLeft,
  Beaker,
  Droplets,
  FlaskConical,
  Heart,
  Lightbulb,
  Package,
  Scissors,
  Thermometer,
  Wind,
  Wrench,
} from 'lucide-react';
import type { Product } from '../types/product';

interface AccessoriesProps {
  products: Product[];
  isLoading?: boolean;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  favoriteItems: Product[];
}

const normalize = (value: string) => value.toLowerCase();

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Fertilizantes':
      return <Droplets className="h-6 w-6" />;
    case 'Herramientas':
      return <Scissors className="h-6 w-6" />;
    case 'Medicion':
    case 'Medición':
      return <Thermometer className="h-6 w-6" />;
    case 'Iluminacion':
    case 'Iluminación':
      return <Lightbulb className="h-6 w-6" />;
    case 'Humedad':
      return <Wind className="h-6 w-6" />;
    case 'Analisis':
    case 'Análisis':
      return <Beaker className="h-6 w-6" />;
    case 'Sustrato':
      return <FlaskConical className="h-6 w-6" />;
    case 'Macetas':
      return <Package className="h-6 w-6" />;
    default:
      return <Wrench className="h-6 w-6" />;
  }
};

const Accessories: React.FC<AccessoriesProps> = ({
  products,
  isLoading = false,
  onBack,
  onAddToCart,
  onToggleFavorite,
  favoriteItems,
}) => {
  const accessories = products.filter((product) => {
    const category = normalize(product.category);
    const type = normalize(product.type);
    return category.includes('accesor') || type.includes('accesor');
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver al catálogo</span>
          </button>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Accesorios para plantas
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Productos seleccionados para el cuidado de tus plantas.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-xl bg-white shadow-lg">
                <div className="h-48 animate-pulse bg-gray-100" />
                <div className="space-y-4 p-6">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                  <div className="h-5 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                  <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : accessories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-10 text-center">
            <Package className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No hay accesorios cargados
            </h2>
            <p className="text-gray-500">
              Agregá accesorios desde el panel administrador usando categoría o tipo "Accesorios".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {accessories.map((accessory) => (
              <div
                key={accessory.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={accessory.image}
                    alt={accessory.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-2 rounded-full">
                    {getCategoryIcon(accessory.category)}
                  </div>
                  {accessory.originalPrice && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{Math.round(((accessory.originalPrice - accessory.price) / accessory.originalPrice) * 100)}%
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="mb-3">
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                      {accessory.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    {accessory.name}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {accessory.description || `${accessory.size} - ${accessory.color}`}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-gray-800">
                        ${accessory.price.toLocaleString('es-AR')}
                      </span>
                      {accessory.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          ${accessory.originalPrice.toLocaleString('es-AR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onAddToCart(accessory)}
                    disabled={!accessory.inStock}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {accessory.inStock ? 'Agregar al Carrito' : 'Agotado'}
                  </button>

                  <button
                    onClick={() => onToggleFavorite(accessory)}
                    className={`w-full mt-2 py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                      favoriteItems.some((item) => item.id === accessory.id)
                        ? 'bg-pink-500 text-white hover:bg-pink-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favoriteItems.some((item) => item.id === accessory.id) ? 'fill-current' : ''
                      }`}
                    />
                    <span>
                      {favoriteItems.some((item) => item.id === accessory.id)
                        ? 'En Favoritos'
                        : 'Agregar a Favoritos'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Accessories;
