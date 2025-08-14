import React, { useState } from 'react';
import { Filter, X, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface FiltersProps {
  filters: {
    colors: string[];
    sizes: string[];
    types: string[];
    priceRange: [number, number];
  };
  onFilterChange: (filterType: string, value: any) => void;
  onClearFilters: () => void;
  className?: string;
}

const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange, onClearFilters, className = '' }) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const colors = [
    { name: 'Rosa', value: 'pink', bg: 'bg-pink-400' },
    { name: 'Púrpura', value: 'purple', bg: 'bg-purple-400' },
    { name: 'Blanco', value: 'white', bg: 'bg-white border' },
    { name: 'Amarillo', value: 'yellow', bg: 'bg-yellow-400' },
    { name: 'Naranja', value: 'orange', bg: 'bg-orange-400' },
    { name: 'Rojo', value: 'red', bg: 'bg-red-400' },
  ];

  const sizes = ['Pequeña', 'Mediana', 'Grande', 'Extra Grande'];
  const types = ['Phalaenopsis', 'Cattleya', 'Dendrobium', 'Oncidium', 'Vanda', 'Macetas'];

  // Contar filtros activos
  const activeFiltersCount = filters.colors.length + filters.sizes.length + filters.types.length + 
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 50000 ? 1 : 0);

  const FilterContent = () => (
    <>
      {/* Filtro de Colores */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">Colores</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {colors.map((color) => (
            <label key={color.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.colors.includes(color.value)}
                onChange={(e) => {
                  const newColors = e.target.checked
                    ? [...filters.colors, color.value]
                    : filters.colors.filter(c => c !== color.value);
                  onFilterChange('colors', newColors);
                }}
                className="sr-only"
              />
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${color.bg} ${
                filters.colors.includes(color.value) ? 'ring-2 ring-emerald-500 ring-offset-1 sm:ring-offset-2' : ''
              } transition-all`} />
              <span className="text-xs sm:text-sm text-gray-600">{color.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtro de Tamaños */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">Tamaños</h4>
        <div className="space-y-2">
          {sizes.map((size) => (
            <label key={size} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.sizes.includes(size)}
                onChange={(e) => {
                  const newSizes = e.target.checked
                    ? [...filters.sizes, size]
                    : filters.sizes.filter(s => s !== size);
                  onFilterChange('sizes', newSizes);
                }}
                className="rounded text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs sm:text-sm text-gray-600">{size}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtro de Tipos */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">Tipos</h4>
        <div className="space-y-2">
          {types.map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.types.includes(type)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...filters.types, type]
                    : filters.types.filter(t => t !== type);
                  onFilterChange('types', newTypes);
                }}
                className="rounded text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs sm:text-sm text-gray-600">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtro de Precio */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">Rango de Precio</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              value={filters.priceRange[0]}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                onFilterChange('priceRange', [value, filters.priceRange[1]]);
              }}
              className="w-20 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Min"
              min="0"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              value={filters.priceRange[1]}
              onChange={(e) => {
                const value = e.target.value === '' ? 50000 : Math.max(0, parseInt(e.target.value) || 50000);
                onFilterChange('priceRange', [filters.priceRange[0], value]);
              }}
              className="w-20 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Max"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Botón limpiar filtros - versión móvil */}
      <div className="lg:hidden">
        <button
          onClick={() => {
            onClearFilters();
            setIsMobileDrawerOpen(false);
          }}
          className="w-full bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
        >
          <X className="h-4 w-4" />
          <span>Limpiar Filtros</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Botón de filtros móvil */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center space-x-2 shadow-md"
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="bg-white text-emerald-600 text-xs font-bold px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtros Desktop */}
      <div className={`hidden lg:block bg-white rounded-xl shadow-lg p-6 sticky top-24 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
          </div>
          <button
            onClick={onClearFilters}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors flex items-center space-x-1"
          >
            <X className="h-4 w-4" />
            <span>Limpiar</span>
          </button>
        </div>

        <FilterContent />
      </div>

      {/* Drawer móvil */}
      {isMobileDrawerOpen && (
        <>
          {/* Overlay */}
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="lg:hidden fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-emerald-500" />
                <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
                {activeFiltersCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto h-full pb-20">
              <FilterContent />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Filters;