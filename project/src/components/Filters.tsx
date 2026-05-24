import React, { useEffect, useState } from 'react';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import type { CatalogFilterGroup, CatalogFilterState, PriceBounds } from '../utils/catalogFilters';
import { sanitizePriceInput } from '../utils/catalogFilters';

interface FiltersProps {
  filters: CatalogFilterState;
  filterGroups: CatalogFilterGroup[];
  priceBounds: PriceBounds;
  priceError: string;
  onOptionToggle: (filterKey: string, value: string, checked: boolean) => void;
  onPriceRangeChange: (priceRange: [string, string]) => void;
  onClearFilters: () => void;
  className?: string;
}

const swatchColors: Record<string, string> = {
  blanco: 'bg-white border border-gray-300',
  blanca: 'bg-white border border-gray-300',
  rosa: 'bg-pink-400',
  rosado: 'bg-pink-400',
  fucsia: 'bg-fuchsia-500',
  purpura: 'bg-purple-500',
  violeta: 'bg-violet-500',
  amarillo: 'bg-yellow-400',
  amarilla: 'bg-yellow-400',
  naranja: 'bg-orange-400',
  rojo: 'bg-red-500',
  roja: 'bg-red-500',
  verde: 'bg-emerald-500',
  negro: 'bg-gray-900',
  negra: 'bg-gray-900',
  gris: 'bg-gray-400',
  transparente: 'bg-white border border-dashed border-gray-400',
  variado: 'bg-gradient-to-br from-pink-400 via-yellow-300 to-emerald-400',
  mixto: 'bg-gradient-to-br from-pink-400 via-yellow-300 to-emerald-400',
  mixta: 'bg-gradient-to-br from-pink-400 via-yellow-300 to-emerald-400',
};

const normalizeColorLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getSwatchClass = (label: string) => swatchColors[normalizeColorLabel(label)] || 'bg-gray-200';

const formatMoney = (value: number) => `$${value.toLocaleString('es-AR')}`;

const Filters: React.FC<FiltersProps> = ({
  filters,
  filterGroups,
  priceBounds,
  priceError,
  onOptionToggle,
  onPriceRangeChange,
  onClearFilters,
  className = '',
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState(filters.priceRange[0]);
  const [maxPriceInput, setMaxPriceInput] = useState(filters.priceRange[1]);
  const hasPriceFilter = priceBounds.max > 0;
  const activeOptionCount = Object.values(filters.values).reduce((sum, values) => sum + values.length, 0);
  const hasTypedPrice = Boolean(minPriceInput || maxPriceInput);
  const activeFiltersCount = activeOptionCount + (hasTypedPrice ? 1 : 0);

  useEffect(() => {
    setMinPriceInput(filters.priceRange[0]);
    setMaxPriceInput(filters.priceRange[1]);
  }, [filters.priceRange]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (minPriceInput !== filters.priceRange[0] || maxPriceInput !== filters.priceRange[1]) {
        onPriceRangeChange([minPriceInput, maxPriceInput]);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [filters.priceRange, maxPriceInput, minPriceInput, onPriceRangeChange]);

  const updateMinPrice = (value: string) => {
    setMinPriceInput(sanitizePriceInput(value));
  };

  const updateMaxPrice = (value: string) => {
    setMaxPriceInput(sanitizePriceInput(value));
  };

  const clearAllFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    onClearFilters();
  };

  const renderFilterContent = () => (
    <>
      {filterGroups.map((group) => (
        <div key={group.key} className="mb-6">
          <h4 className="mb-3 font-medium text-[#2F3A35]">{group.label}</h4>
          <div className={group.display === 'swatch' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {group.options.map((option) => {
              const checked = filters.values[group.key]?.includes(option.value) ?? false;

              return (
                <label key={option.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onOptionToggle(group.key, option.value, event.target.checked)}
                    className={group.display === 'swatch' ? 'sr-only' : 'rounded text-[#5FAE9B] focus:ring-[#7FAF9B]'}
                  />
                  {group.display === 'swatch' && (
                    <span
                      className={`h-5 w-5 rounded-full ${getSwatchClass(option.label)} ${
                        checked ? 'ring-2 ring-[#7FAF9B] ring-offset-2' : ''
                      }`}
                    />
                  )}
                  <span className="min-w-0 flex-1 text-sm text-[#6B756F]">
                    {option.label}
                    <span className="ml-1 text-xs text-[#6B756F]/70">({option.count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {hasPriceFilter && (
        <div className="mb-6">
          <h4 className="mb-3 font-medium text-[#2F3A35]">Rango de precio</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={minPriceInput}
                onChange={(event) => updateMinPrice(event.target.value)}
                className="w-24 rounded border border-[#EADBC8] px-2 py-1 text-sm focus:border-[#7FAF9B] focus:ring-2 focus:ring-[#7FAF9B]"
                placeholder="Min"
              />
              <span className="text-gray-400">-</span>
              <input
                type="text"
                inputMode="numeric"
                value={maxPriceInput}
                onChange={(event) => updateMaxPrice(event.target.value)}
                className="w-28 rounded border border-[#EADBC8] px-2 py-1 text-sm focus:border-[#7FAF9B] focus:ring-2 focus:ring-[#7FAF9B]"
                placeholder="Max"
              />
            </div>
            <p className="text-xs text-[#6B756F]/75">
              Disponible: {formatMoney(priceBounds.min)} - {formatMoney(priceBounds.max)}
            </p>
            {priceError && <p className="text-xs font-medium text-red-600">{priceError}</p>}
          </div>
        </div>
      )}

      {filterGroups.length === 0 && !hasPriceFilter && (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          No hay filtros disponibles para estos productos.
        </p>
      )}

      <div className="lg:hidden">
        <button
          onClick={() => {
            clearAllFilters();
            setIsMobileDrawerOpen(false);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
        >
          <X className="h-4 w-4" />
          <span>Limpiar filtros</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="mb-4 lg:hidden">
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5FAE9B] px-4 py-3 font-medium text-white shadow-sm transition-all hover:bg-[#4D9A88]"
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-[#5FAE9B]">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      <div className={`hidden rounded-xl border border-[#EADBC8]/70 bg-white/90 p-6 shadow-sm lg:block lg:sticky lg:top-24 ${className}`}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#5FAE9B]" />
            <h3 className="text-lg font-semibold text-[#2F3A35]">Filtros</h3>
          </div>
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-sm text-[#6B756F] transition-colors hover:text-[#D96C9F]"
          >
            <X className="h-4 w-4" />
            <span>Limpiar</span>
          </button>
        </div>

        {renderFilterContent()}
      </div>

      {isMobileDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-[#FFF8EF] shadow-xl lg:hidden">
            <div className="flex items-center justify-between border-b border-[#EADBC8] p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#5FAE9B]" />
                <h3 className="text-lg font-semibold text-[#2F3A35]">Filtros</h3>
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-[#CFE3D4] px-2 py-1 text-xs font-bold text-[#2F3A35]">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="rounded-full p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="h-full overflow-y-auto p-4 pb-20">
              {renderFilterContent()}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Filters;
