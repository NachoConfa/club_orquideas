import React, { useState, useEffect } from 'react';
import { ArrowLeft, Droplets, Scissors, Thermometer, Sun, Wind, Beaker, Heart, Package, Wrench, FlaskConical, Lightbulb } from 'lucide-react';
import { orchidApi, Accessory } from '../services/api';

interface AccessoriesProps {
  onBack: () => void;
  onAddToCart: (product: any) => void;
  onToggleFavorite: (product: any) => void;
  favoriteItems: any[];
}

const Accessories: React.FC<AccessoriesProps> = ({ onBack, onAddToCart, onToggleFavorite, favoriteItems }) => {
  const [accessories, setAccessories] = useState<Accessory[]>([]);

  // Función para obtener el icono según la categoría
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Fertilizantes':
        return <Droplets className="h-6 w-6" />;
      case 'Herramientas':
        return <Scissors className="h-6 w-6" />;
      case 'Medición':
        return <Thermometer className="h-6 w-6" />;
      case 'Iluminación':
        return <Lightbulb className="h-6 w-6" />;
      case 'Humedad':
        return <Wind className="h-6 w-6" />;
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

  // Función para cargar accesorios
  const loadAccessories = async () => {
    try {
      const response = await orchidApi.getAccessories({ in_stock: true });
      if (response.success && response.data) {
        setAccessories(response.data.accessories);
      }
    } catch (error) {
      console.error('Error loading accessories:', error);
      // Fallback a datos por defecto en caso de error
      const defaultAccessories = [
        {
          id: 101,
          name: "Kit de Fertilizante Especial para Orquídeas",
          price: 5999,
          originalPrice: 7999,
          image: "https://images.pexels.com/photos/1974508/pexels-photo-1974508.jpeg?auto=compress&cs=tinysrgb&w=500",
          rating: 5,
          reviews: 45,
          category: "Fertilizantes",
          description: "Fertilizante líquido concentrado con nutrientes específicos para orquídeas",
          inStock: true
        },
        {
          id: 102,
          name: "Tijeras de Podar Profesionales",
          price: 4999,
          image: "https://images.pexels.com/photos/1317712/pexels-photo-1317712.jpeg?auto=compress&cs=tinysrgb&w=500",
          rating: 4,
          reviews: 32,
          category: "Herramientas",
          description: "Tijeras de acero inoxidable con mango ergonómico para poda precisa",
          inStock: true
        },
        {
          id: 103,
          name: "Termómetro e Higrómetro Digital",
          price: 3999,
          image: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=500",
          rating: 5,
          reviews: 28,
          category: "Medición",
          description: "Monitor digital de temperatura y humedad con pantalla LCD",
          inStock: true
        },
        {
          id: 104,
          name: "Lámpara LED de Crecimiento",
          price: 19999,
          originalPrice: 24999,
          image: "https://images.pexels.com/photos/1408967/pexels-photo-1408967.jpeg?auto=compress&cs=tinysrgb&w=500",
          rating: 4,
          reviews: 19,
          category: "Iluminación",
          description: "Lámpara LED full spectrum para crecimiento óptimo de orquídeas",
          inStock: true
        },
        {
          id: 105,
          name: "Humidificador Ultrasónico",
          price: 9999,
          image: "https://images.pexels.com/photos/68507/spring-flowers-flowers-collage-floral-68507.jpeg?auto=compress&cs=tinysrgb&w=500",
          rating: 5,
          reviews: 36,
          category: "Humedad",
          description: "Humidificador silencioso con control de intensidad",
          inStock: true
        },
        {
          id: 106,
          name: "Kit de pH y Nutrientes",
          price: 7999,
          image: "https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500",
          rating: 4,
          reviews: 22,
          category: "Análisis",
          description: "Kit completo para medir pH y niveles de nutrientes en el sustrato",
          inStock: true
        }
      ];
      
      setAccessories(defaultAccessories);
    }
  };

  useEffect(() => {
    loadAccessories();

    // Escuchar evento personalizado para cambios internos (misma pestaña)
    const handleAccessoriesUpdate = () => {
      loadAccessories();
    };

    window.addEventListener('accessories-updated', handleAccessoriesUpdate);

    return () => {
      window.removeEventListener('accessories-updated', handleAccessoriesUpdate);
    };
  }, []);

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
              Accesorios para Orquídeas
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Todo lo que necesitas para el cuidado perfecto de tus orquídeas. 
              Herramientas profesionales y accesorios especializados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {accessories.map((accessory) => (
            <div key={accessory.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
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
                  {accessory.description}
                </p>

                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-sm ${
                          i < accessory.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500 ml-2">({accessory.reviews})</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-800">${accessory.price.toLocaleString('es-AR')}</span>
                    {(accessory.original_price || accessory.originalPrice) && (
                      <span className="text-sm text-gray-500 line-through">${(accessory.original_price || accessory.originalPrice).toLocaleString('es-AR')}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onAddToCart({
                    ...accessory,
                    color: 'universal',
                    size: 'estándar',
                    inStock: accessory.in_stock ?? accessory.inStock ?? true,
                    type: 'Accesorios'
                  })}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105"
                >
                  Agregar al Carrito
                </button>
                
                <button
                  onClick={() => onToggleFavorite({
                    ...accessory,
                    color: 'universal',
                    size: 'estándar',
                    inStock: accessory.in_stock ?? accessory.inStock ?? true,
                    type: 'Accesorios'
                  })}
                  className={`w-full mt-2 py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                    favoriteItems.some(item => item.id === accessory.id)
                      ? 'bg-pink-500 text-white hover:bg-pink-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${
                    favoriteItems.some(item => item.id === accessory.id) ? 'fill-current' : ''
                  }`} />
                  <span>
                    {favoriteItems.some(item => item.id === accessory.id) ? 'En Favoritos' : 'Agregar a Favoritos'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Accessories;