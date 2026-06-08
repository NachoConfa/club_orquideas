import React, { useEffect, useMemo, useState } from 'react';
import {
  applyAdminBulkPriceUpdates,
  getAdminProducts,
  parseAdminMoneyValue,
  type AdminPriceMode,
  type AdminProduct,
  type AdminProductVariant,
} from '../../services/adminSupabaseService';
import { useConfirm } from '../feedback/ConfirmProvider';
import { useToast } from '../feedback/ToastProvider';
import { Loader2, RefreshCw, Search, SlidersHorizontal } from '../../lib/icons';

type ScopeType = 'all' | 'visible_store' | 'category' | 'occasion' | 'manual';
type CategoryScope = 'orchids' | 'arrangements' | 'pots' | 'interior' | 'exterior' | 'other';
type OperationType = 'increase_percent' | 'decrease_percent' | 'add_amount' | 'set_amount';
type RoundingOption = 0 | 100 | 500 | 1000;
type PreviewEntityType = 'product' | 'variant';

interface AdminPriceUpdatesProps {
  onPricesApplied?: () => void | Promise<void>;
}

interface PreviewRow {
  key: string;
  entityType: PreviewEntityType;
  id: string;
  productId: string;
  productName: string;
  variantLabel: string;
  category: string;
  priceMode: AdminPriceMode;
  currentPrice: number;
  newPrice: number;
  difference: number;
}

const CATEGORY_OPTIONS: Array<{ value: CategoryScope; label: string; tags: string[] }> = [
  { value: 'orchids', label: 'Orquídeas', tags: [] },
  { value: 'arrangements', label: 'Arreglos', tags: ['arreglo', 'arreglos', 'arrangement', 'arrangements'] },
  { value: 'pots', label: 'Macetas', tags: ['maceta', 'macetas', 'pot', 'pots'] },
  {
    value: 'interior',
    label: 'Plantas interior',
    tags: ['interior', 'planta de interior', 'plantas de interior', 'indoor'],
  },
  {
    value: 'exterior',
    label: 'Plantas exterior',
    tags: ['exterior', 'planta de exterior', 'plantas de exterior', 'outdoor'],
  },
  { value: 'other', label: 'Otros', tags: ['otro', 'otros', 'evento', 'eventos', 'accesorio', 'accesorios'] },
];

const OPERATION_LABELS: Record<OperationType, string> = {
  increase_percent: 'Aumento porcentual',
  decrease_percent: 'Descuento porcentual',
  add_amount: 'Aumento por monto fijo',
  set_amount: 'Reemplazar por monto fijo',
};

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const getProductSearchText = (product: AdminProduct) =>
  [
    product.name,
    product.description,
    product.orchid_type,
    product.color,
    product.size,
    ...(product.occasions ?? []),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');

const productHasAnyTag = (product: AdminProduct, tags: string[]) => {
  const searchText = getProductSearchText(product);
  return tags.some((tag) => searchText.includes(normalizeText(tag)));
};

const productMatchesCategory = (product: AdminProduct, category: CategoryScope) => {
  const categoryOption = CATEGORY_OPTIONS.find((option) => option.value === category);

  if (!categoryOption) {
    return true;
  }

  if (category !== 'orchids') {
    return productHasAnyTag(product, categoryOption.tags);
  }

  const nonOrchidTags = CATEGORY_OPTIONS.filter((option) => option.value !== 'orchids').flatMap((option) => option.tags);
  return !productHasAnyTag(product, nonOrchidTags);
};

const getVariantLabel = (variant: AdminProductVariant) =>
  [
    variant.color,
    variant.size,
    variant.flowering_stems ? `${variant.flowering_stems} varas` : '',
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' · ') || 'Variante';

const normalizePriceMode = (priceMode?: AdminPriceMode | null): AdminPriceMode =>
  priceMode === 'quote' ? 'quote' : 'fixed';

const roundPrice = (price: number, rounding: RoundingOption) => {
  if (!rounding) {
    return Math.round(price);
  }

  return Math.round(price / rounding) * rounding;
};

const calculateNewPrice = (
  currentPrice: number,
  operation: OperationType,
  value: number,
  rounding: RoundingOption
) => {
  let nextPrice = currentPrice;

  if (operation === 'increase_percent') {
    nextPrice = currentPrice * (1 + value / 100);
  }

  if (operation === 'decrease_percent') {
    nextPrice = currentPrice * (1 - value / 100);
  }

  if (operation === 'add_amount') {
    nextPrice = currentPrice + value;
  }

  if (operation === 'set_amount') {
    nextPrice = value;
  }

  if (!Number.isFinite(nextPrice) || nextPrice < 0) {
    throw new Error('La fórmula genera precios negativos o inválidos.');
  }

  return roundPrice(nextPrice, rounding);
};

const AdminPriceUpdates: React.FC<AdminPriceUpdatesProps> = ({ onPricesApplied }) => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [categoryScope, setCategoryScope] = useState<CategoryScope>('orchids');
  const [occasionScope, setOccasionScope] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [includeBaseProducts, setIncludeBaseProducts] = useState(true);
  const [includeVariants, setIncludeVariants] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [includeQuote, setIncludeQuote] = useState(false);
  const [operation, setOperation] = useState<OperationType>('increase_percent');
  const [operationValue, setOperationValue] = useState('');
  const [rounding, setRounding] = useState<RoundingOption>(0);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const { confirm } = useConfirm();
  const toast = useToast();

  const loadProducts = async () => {
    setIsLoading(true);
    setPreviewRows([]);

    try {
      const adminProducts = await getAdminProducts(2000);
      setProducts(adminProducts);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No pudimos cargar los productos para actualizar precios.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const occasionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .flatMap((product) => product.occasions ?? [])
            .map((occasion) => String(occasion).trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [products]
  );

  const manualProducts = useMemo(() => {
    const query = normalizeText(manualSearch);
    const filteredProducts = query
      ? products.filter((product) => getProductSearchText(product).includes(query))
      : products;

    return filteredProducts.slice(0, 80);
  }, [manualSearch, products]);

  const scopedProducts = useMemo(() => {
    const selectedIds = new Set(selectedProductIds);

    return products.filter((product) => {
      if (!includeInactive && !product.is_active) {
        return false;
      }

      if (scopeType === 'visible_store' && product.visible_in_store === false) {
        return false;
      }

      if (scopeType === 'category' && !productMatchesCategory(product, categoryScope)) {
        return false;
      }

      if (
        scopeType === 'occasion' &&
        !((product.occasions ?? []).map(normalizeText).includes(normalizeText(occasionScope)))
      ) {
        return false;
      }

      if (scopeType === 'manual' && !selectedIds.has(product.id)) {
        return false;
      }

      return true;
    });
  }, [categoryScope, includeInactive, occasionScope, products, scopeType, selectedProductIds]);

  const toggleManualProduct = (productId: string) => {
    setPreviewRows([]);
    setSelectedProductIds((currentIds) =>
      currentIds.includes(productId)
        ? currentIds.filter((currentId) => currentId !== productId)
        : [...currentIds, productId]
    );
  };

  const buildPreview = () => {
    try {
      if (!includeBaseProducts && !includeVariants) {
        throw new Error('Elegí si querés actualizar precio base, variantes o ambos.');
      }

      if (scopeType === 'occasion' && !occasionScope) {
        throw new Error('Elegí una ocasión para calcular la vista previa.');
      }

      if (scopeType === 'manual' && selectedProductIds.length === 0) {
        throw new Error('Seleccioná al menos un producto manualmente.');
      }

      const value = parseAdminMoneyValue(operationValue, 'valor de actualización');

      if (operation === 'decrease_percent' && value > 100) {
        throw new Error('El descuento porcentual no puede superar el 100%.');
      }

      const rows: PreviewRow[] = [];

      scopedProducts.forEach((product) => {
        const productPriceMode = normalizePriceMode(product.price_mode);

        if (includeBaseProducts && (includeQuote || productPriceMode !== 'quote')) {
          const currentPrice = Number(product.price || 0);
          const newPrice = calculateNewPrice(currentPrice, operation, value, rounding);

          rows.push({
            key: `product-${product.id}`,
            entityType: 'product',
            id: product.id,
            productId: product.id,
            productName: product.name,
            variantLabel: 'Precio base',
            category: product.orchid_type || 'Producto',
            priceMode: productPriceMode,
            currentPrice,
            newPrice,
            difference: newPrice - currentPrice,
          });
        }

        if (includeVariants) {
          (product.variants ?? []).forEach((variant) => {
            if (!includeInactive && !variant.is_active) {
              return;
            }

            const variantPriceMode = normalizePriceMode(variant.price_mode);
            if (!includeQuote && variantPriceMode === 'quote') {
              return;
            }

            const currentPrice = Number(variant.price || 0);
            const newPrice = calculateNewPrice(currentPrice, operation, value, rounding);

            rows.push({
              key: `variant-${variant.id}`,
              entityType: 'variant',
              id: variant.id,
              productId: product.id,
              productName: product.name,
              variantLabel: getVariantLabel(variant),
              category: product.orchid_type || 'Producto',
              priceMode: variantPriceMode,
              currentPrice,
              newPrice,
              difference: newPrice - currentPrice,
            });
          });
        }
      });

      if (rows.length === 0) {
        throw new Error('No hay precios que coincidan con el alcance elegido.');
      }

      setPreviewRows(rows);
      toast.info(`Vista previa lista para ${rows.length} precios.`, 'Actualizar precios');
    } catch (error) {
      setPreviewRows([]);
      toast.error(error instanceof Error ? error.message : 'No pudimos calcular la vista previa.');
    }
  };

  const applyPreview = async () => {
    if (previewRows.length === 0) {
      toast.warning('Primero calculá una vista previa.');
      return;
    }

    const productRows = previewRows.filter((row) => row.entityType === 'product');
    const variantRows = previewRows.filter((row) => row.entityType === 'variant');
    const confirmed = await confirm({
      title: 'Actualizar precios',
      message: `Vas a actualizar ${previewRows.length} precios: ${productRows.length} productos y ${variantRows.length} variantes. Esta acción modificará los precios actuales. ¿Confirmás?`,
      confirmLabel: 'Aplicar cambios',
      cancelLabel: 'Cancelar',
    });

    if (!confirmed) {
      return;
    }

    setIsApplying(true);

    try {
      const result = await applyAdminBulkPriceUpdates({
        productUpdates: productRows.map((row) => ({ id: row.id, price: row.newPrice })),
        variantUpdates: variantRows.map((row) => ({ id: row.id, price: row.newPrice })),
      });

      toast.success(
        `Se actualizaron ${result.affectedProducts} productos y ${result.affectedVariants} variantes.`,
        'Precios actualizados'
      );
      setPreviewRows([]);
      await loadProducts();
      await onPricesApplied?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos aplicar la actualización de precios.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Actualización masiva
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-[#16352B]">Actualizar precios</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280]">
              Calculá una vista previa y confirmá antes de modificar precios. No se alteran pedidos históricos,
              stock ni métodos de pago.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={isLoading || isApplying}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#F1E3D4] bg-white px-4 py-2 text-sm font-semibold text-[#16352B] hover:bg-[#FFF8EF] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar productos
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
        <section className="rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[#16352B]">1. Alcance</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-gray-700">
              Aplicar a
              <select
                value={scopeType}
                onChange={(event) => {
                  setScopeType(event.target.value as ScopeType);
                  setPreviewRows([]);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos los productos</option>
                <option value="visible_store">Solo visibles en tienda general</option>
                <option value="category">Solo una categoría</option>
                <option value="occasion">Solo una ocasión</option>
                <option value="manual">Productos seleccionados manualmente</option>
              </select>
            </label>

            {scopeType === 'category' && (
              <label className="block text-sm font-semibold text-gray-700">
                Categoría
                <select
                  value={categoryScope}
                  onChange={(event) => {
                    setCategoryScope(event.target.value as CategoryScope);
                    setPreviewRows([]);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {scopeType === 'occasion' && (
              <label className="block text-sm font-semibold text-gray-700">
                Ocasión
                <select
                  value={occasionScope}
                  onChange={(event) => {
                    setOccasionScope(event.target.value);
                    setPreviewRows([]);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Elegir ocasión</option>
                  {occasionOptions.map((occasion) => (
                    <option key={occasion} value={occasion}>
                      {occasion}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              {
                checked: includeBaseProducts,
                onChange: setIncludeBaseProducts,
                label: 'Actualizar precio base del producto',
              },
              { checked: includeVariants, onChange: setIncludeVariants, label: 'Actualizar variantes' },
              { checked: includeInactive, onChange: setIncludeInactive, label: 'Incluir productos/variantes inactivos' },
              {
                checked: includeQuote,
                onChange: setIncludeQuote,
                label: 'Incluir productos “A cotizar”',
                helper: 'Apagado por defecto.',
              },
            ].map((item) => (
              <label key={item.label} className="flex items-start gap-3 rounded-xl border border-[#F1E3D4] bg-[#FFF8EF] p-3 text-sm">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => {
                    item.onChange(event.target.checked);
                    setPreviewRows([]);
                  }}
                  className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="font-semibold text-[#16352B]">{item.label}</span>
                  {item.helper && <span className="block text-xs text-[#6B7280]">{item.helper}</span>}
                </span>
              </label>
            ))}
          </div>

          {scopeType === 'manual' && (
            <div className="mt-5 rounded-2xl border border-[#F1E3D4] bg-[#FFF8EF] p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={manualSearch}
                  onChange={(event) => setManualSearch(event.target.value)}
                  placeholder="Buscar productos para seleccionar..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-[#F1E3D4] bg-white">
                {manualProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-start gap-3 border-b border-[#F1E3D4] px-3 py-2 text-sm last:border-b-0 hover:bg-[#F8EFE3]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => toggleManualProduct(product.id)}
                      className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="font-semibold text-[#16352B]">{product.name}</span>
                      <span className="block text-xs text-[#6B7280]">
                        {product.orchid_type || 'Producto'} · {formatCurrency(Number(product.price || 0))}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-[#6B7280]">{selectedProductIds.length} productos seleccionados.</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[#16352B]">2. Fórmula</h3>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Tipo de actualización
              <select
                value={operation}
                onChange={(event) => {
                  setOperation(event.target.value as OperationType);
                  setPreviewRows([]);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              Valor
              <input
                value={operationValue}
                onChange={(event) => {
                  setOperationValue(event.target.value);
                  setPreviewRows([]);
                }}
                placeholder={operation.includes('percent') ? 'Ej: 15' : 'Ej: 5000'}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              Redondeo
              <select
                value={rounding}
                onChange={(event) => {
                  setRounding(Number(event.target.value) as RoundingOption);
                  setPreviewRows([]);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              >
                <option value={0}>Sin redondeo</option>
                <option value={100}>Redondear a 100</option>
                <option value={500}>Redondear a 500</option>
                <option value={1000}>Redondear a 1.000</option>
              </select>
            </label>

            <button
              type="button"
              onClick={buildPreview}
              disabled={isLoading || isApplying}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#0F8F61] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0C7A52] disabled:opacity-60"
            >
              Calcular vista previa
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#16352B]">3. Vista previa</h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Alcance actual: {scopedProducts.length} productos. Vista previa: {previewRows.length} precios.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void applyPreview()}
            disabled={previewRows.length === 0 || isApplying}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#16352B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#10251E] disabled:opacity-60"
          >
            {isApplying && <Loader2 className="h-4 w-4 animate-spin" />}
            Aplicar cambios
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Variante</th>
                <th className="px-4 py-3">Precio actual</th>
                <th className="px-4 py-3">Precio nuevo</th>
                <th className="px-4 py-3">Diferencia</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">price_mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {previewRows.length > 0 ? (
                previewRows.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.productName}</td>
                    <td className="px-4 py-3 text-gray-700">{row.variantLabel}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(row.currentPrice)}</td>
                    <td className="px-4 py-3 font-semibold text-[#16352B]">{formatCurrency(row.newPrice)}</td>
                    <td className={`px-4 py-3 font-semibold ${row.difference >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {row.difference >= 0 ? '+' : ''}
                      {formatCurrency(row.difference)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.priceMode === 'quote'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {row.priceMode}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#6B7280]">
                    Calculá una vista previa antes de aplicar cambios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminPriceUpdates;
