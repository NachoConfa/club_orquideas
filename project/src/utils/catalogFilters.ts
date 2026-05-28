import type { Product } from '../types/product';

export type CatalogCategory = 'orchids' | 'pots' | 'arrangements' | 'interior' | 'exterior';

export interface CatalogFilterState {
  values: Record<string, string[]>;
  priceRange: [string, string];
}

export interface CatalogFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface CatalogFilterGroup {
  key: string;
  label: string;
  display: 'checkbox' | 'swatch';
  options: CatalogFilterOption[];
}

export interface PriceBounds {
  min: number;
  max: number;
}

type FilterConfig = {
  key: string;
  label: string;
  display?: 'checkbox' | 'swatch';
  sources: string[];
};

export const filterConfigByCategory: Record<CatalogCategory, FilterConfig[]> = {
  orchids: [
    {
      key: 'flowerColor',
      label: 'Color de flor',
      display: 'swatch',
      sources: ['attributes.flower_color', 'color', 'colors', 'variants.color'],
    },
    {
      key: 'size',
      label: 'Tamano',
      sources: ['attributes.size', 'size', 'variants.size'],
    },
    {
      key: 'orchidType',
      label: 'Tipo de orquidea',
      sources: ['attributes.orchid_type', 'type'],
    },
    {
      key: 'floweringStems',
      label: 'Varas florales',
      sources: ['floweringStems', 'attributes.flowering_stems'],
    },
    {
      key: 'environment',
      label: 'Interior / exterior',
      sources: ['attributes.environment', 'attributes.placement', 'attributes.location'],
    },
  ],
  pots: [
    {
      key: 'material',
      label: 'Material',
      sources: ['attributes.material', 'attributes.pot_material'],
    },
    {
      key: 'color',
      label: 'Color',
      display: 'swatch',
      sources: ['attributes.color', 'color', 'colors', 'variants.color'],
    },
    {
      key: 'size',
      label: 'Tamano',
      sources: ['attributes.size', 'size', 'variants.size'],
    },
    {
      key: 'diameter',
      label: 'Diametro',
      sources: ['attributes.diameter', 'attributes.diameter_cm', 'attributes.pot_diameter'],
    },
    {
      key: 'height',
      label: 'Alto',
      sources: ['attributes.height', 'attributes.height_cm', 'attributes.pot_height'],
    },
  ],
  arrangements: [
    {
      key: 'arrangementType',
      label: 'Tipo de arreglo',
      sources: ['attributes.arrangement_type', 'type'],
    },
    {
      key: 'size',
      label: 'Tamano',
      sources: ['attributes.size', 'size', 'variants.size'],
    },
    {
      key: 'mainColor',
      label: 'Color principal',
      display: 'swatch',
      sources: ['attributes.main_color', 'attributes.color', 'color', 'colors', 'variants.color'],
    },
    {
      key: 'plantCount',
      label: 'Cantidad de plantas',
      sources: ['attributes.plant_count', 'attributes.plants_count'],
    },
    {
      key: 'occasion',
      label: 'Ocasion',
      sources: ['attributes.occasion'],
    },
  ],
  interior: [
    {
      key: 'plantType',
      label: 'Tipo de planta',
      sources: ['attributes.plant_type', 'attributes.product_type', 'type'],
    },
    {
      key: 'size',
      label: 'Tamano',
      sources: ['attributes.size', 'size', 'variants.size'],
    },
    {
      key: 'color',
      label: 'Color',
      display: 'swatch',
      sources: ['attributes.color', 'color', 'colors', 'variants.color'],
    },
    {
      key: 'light',
      label: 'Luz',
      sources: ['attributes.light', 'attributes.light_requirement'],
    },
  ],
  exterior: [
    {
      key: 'plantType',
      label: 'Tipo de planta',
      sources: ['attributes.plant_type', 'attributes.product_type', 'type'],
    },
    {
      key: 'size',
      label: 'Tamano',
      sources: ['attributes.size', 'size', 'variants.size'],
    },
    {
      key: 'color',
      label: 'Color',
      display: 'swatch',
      sources: ['attributes.color', 'color', 'colors', 'variants.color'],
    },
    {
      key: 'sun',
      label: 'Sol',
      sources: ['attributes.sun', 'attributes.sun_exposure', 'attributes.light'],
    },
  ],
};

export const createEmptyCatalogFilters = (): CatalogFilterState => ({
  values: {},
  priceRange: ['', ''],
});

const normalizeFilterValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toTextValues = (value: unknown): string[] => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(toTextValues);
  }

  if (typeof value === 'boolean') {
    return [value ? 'Si' : 'No'];
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? [String(value)] : [];
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
};

const getSourceValues = (product: Product, source: string): string[] => {
  if (source.startsWith('attributes.')) {
    const key = source.replace('attributes.', '');
    return toTextValues(product.attributes?.[key]);
  }

  if (source.startsWith('variants.')) {
    const key = source.replace('variants.', '') as 'size' | 'color' | 'price' | 'stock';
    return (product.variants ?? []).flatMap((variant) => toTextValues(variant[key]));
  }

  if (source === 'colors') {
    return toTextValues(product.colors);
  }

  if (source === 'floweringStems') {
    return toTextValues(product.floweringStems);
  }

  return toTextValues(product[source as keyof Product]);
};

const getProductFilterValues = (product: Product, config: FilterConfig) => {
  const values = config.sources.flatMap((source) => getSourceValues(product, source));
  const byNormalizedValue = new Map<string, string>();

  values.forEach((value) => {
    const normalizedValue = normalizeFilterValue(value);
    if (!normalizedValue) return;
    byNormalizedValue.set(normalizedValue, value.trim());
  });

  return Array.from(byNormalizedValue.entries()).map(([value, label]) => ({ value, label }));
};

export const getProductPrices = (product: Product) => {
  const variantPrices = (product.variants ?? [])
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price >= 0);
  const productPrice = Number(product.price);

  return Array.from(
    new Set([
      ...(Number.isFinite(productPrice) && productPrice >= 0 ? [productPrice] : []),
      ...variantPrices,
    ])
  );
};

export const productHasAvailableStock = (product: Product) => {
  const quantityVariantStock = (product.variants ?? [])
    .filter((variant) => variant.stockMode !== 'consult')
    .map((variant) => Number(variant.stock));

  if (quantityVariantStock.length > 0) {
    return quantityVariantStock.some((stock) => Number.isFinite(stock) && stock > 0);
  }

  if (product.stockMode === 'consult') {
    return false;
  }

  return Boolean(product.inStock) || Number(product.stock ?? 0) > 0;
};

const getPriceBounds = (products: Product[]): PriceBounds => {
  const prices = products.flatMap(getProductPrices);

  if (prices.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.floor(Math.min(...prices)),
    max: Math.ceil(Math.max(...prices)),
  };
};

export const getAvailableFilters = (category: CatalogCategory, products: Product[]) => {
  const groups = filterConfigByCategory[category]
    .map<CatalogFilterGroup>((config) => {
      const optionsByValue = new Map<string, CatalogFilterOption>();

      products.forEach((product) => {
        const productValues = getProductFilterValues(product, config);
        const seenValues = new Set<string>();

        productValues.forEach(({ value, label }) => {
          if (seenValues.has(value)) return;
          seenValues.add(value);

          const currentOption = optionsByValue.get(value);
          optionsByValue.set(value, {
            value,
            label: currentOption?.label || label,
            count: (currentOption?.count ?? 0) + 1,
          });
        });
      });

      return {
        key: config.key,
        label: config.label,
        display: config.display || 'checkbox',
        options: Array.from(optionsByValue.values()).sort((first, second) =>
          first.label.localeCompare(second.label, 'es')
        ),
      };
    })
    .filter((group) => group.options.length > 1);

  const inStockCount = products.filter(productHasAvailableStock).length;
  if (inStockCount > 0 && inStockCount < products.length) {
    groups.push({
      key: 'stock',
      label: 'Stock disponible',
      display: 'checkbox',
      options: [{ value: 'available', label: 'Solo disponibles', count: inStockCount }],
    });
  }

  return {
    groups,
    priceBounds: getPriceBounds(products),
  };
};

export const sanitizePriceInput = (value: string) => value.replace(/\D/g, '');

export const parsePriceInput = (value: string) => {
  const sanitizedValue = sanitizePriceInput(value);

  if (!sanitizedValue) {
    return null;
  }

  const parsedValue = Number(sanitizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const getPriceRangeError = (priceRange: [string, string]) => {
  const minPrice = parsePriceInput(priceRange[0]);
  const maxPrice = parsePriceInput(priceRange[1]);

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return 'El precio minimo no puede ser mayor al maximo.';
  }

  return '';
};

const matchesPriceRange = (product: Product, priceRange: [string, string]) => {
  if (getPriceRangeError(priceRange)) {
    return true;
  }

  const minPrice = parsePriceInput(priceRange[0]);
  const maxPrice = parsePriceInput(priceRange[1]);

  if (minPrice === null && maxPrice === null) {
    return true;
  }

  return getProductPrices(product).some((price) => {
    if (minPrice !== null && price < minPrice) return false;
    if (maxPrice !== null && price > maxPrice) return false;
    return true;
  });
};

export const applyCatalogFilters = (
  products: Product[],
  category: CatalogCategory,
  filters: CatalogFilterState
) =>
  products.filter((product) => {
    const configByKey = new Map(filterConfigByCategory[category].map((config) => [config.key, config]));

    for (const [filterKey, selectedValues] of Object.entries(filters.values)) {
      if (selectedValues.length === 0) continue;

      if (filterKey === 'stock') {
        if (selectedValues.includes('available') && !productHasAvailableStock(product)) {
          return false;
        }
        continue;
      }

      const config = configByKey.get(filterKey);
      if (!config) continue;

      const productValues = new Set(getProductFilterValues(product, config).map((option) => option.value));
      if (!selectedValues.some((selectedValue) => productValues.has(selectedValue))) {
        return false;
      }
    }

    return matchesPriceRange(product, filters.priceRange);
  });

export const pruneUnavailableFilters = (
  filters: CatalogFilterState,
  availableGroups: CatalogFilterGroup[]
): CatalogFilterState => {
  const availableValuesByKey = new Map(
    availableGroups.map((group) => [group.key, new Set(group.options.map((option) => option.value))])
  );
  const nextValues = Object.entries(filters.values).reduce<Record<string, string[]>>(
    (filteredValues, [filterKey, selectedValues]) => {
      const availableValues = availableValuesByKey.get(filterKey);
      if (!availableValues) return filteredValues;

      const nextSelectedValues = selectedValues.filter((value) => availableValues.has(value));
      if (nextSelectedValues.length > 0) {
        filteredValues[filterKey] = nextSelectedValues;
      }

      return filteredValues;
    },
    {}
  );

  return {
    ...filters,
    values: nextValues,
  };
};
