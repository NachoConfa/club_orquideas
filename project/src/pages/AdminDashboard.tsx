import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Check,
  ClipboardList,
  CreditCard,
  Edit,
  LineChart,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  AdminProduct,
  AdminProductInput,
  AdminProductVariantInput,
  AdminRecord,
  AdminDashboardSummary,
  AnalyticsRange,
  AnalyticsReportData,
  cancelAdminPendingOrder,
  confirmAdminOrderPayment,
  createAdminProduct,
  deleteAdminProduct,
  getAnalyticsReport,
  emptyAdminProductInput,
  getAdminOrders,
  getAdminDashboardData,
  getAdminPayments,
  getAdminProfiles,
  getAdminProducts,
  productToInput,
  updateAdminOrderStatus,
  updateAdminProduct,
} from '../services/adminSupabaseService';
import { deleteUnusedProductImageByPublicUrl, uploadProductImage } from '../services/productImageUploadService';
import { useConfirm } from '../components/feedback/ConfirmProvider';
import { useToast } from '../components/feedback/ToastProvider';

interface AdminDashboardProps {
  user: { name: string; email: string; isAdmin?: boolean } | null;
  onBack: () => void;
  onProductsChanged: () => void;
}

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'payments' | 'analytics';

const formatCurrency = (value: unknown) =>
  Number(value || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const formatDate = (value: unknown) => {
  if (!value || typeof value !== 'string') {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getRecordId = (record: AdminRecord) => String(record.id ?? '');

const getAmount = (record: AdminRecord) =>
  Number(record.total_amount ?? record.total ?? record.amount ?? record.price ?? 0);

const getStatus = (record: AdminRecord) => String(record.status ?? record.payment_status ?? 'sin_estado');

const getPaymentStatusValue = (record: AdminRecord) =>
  String(record.payment_status ?? record.status ?? '').toLowerCase();

const PAID_PAYMENT_STATUSES = new Set(['paid', 'approved', 'confirmed']);
const PENDING_PAYMENT_STATUSES = new Set([
  'pending',
  'awaiting_transfer',
  'pending_cash_payment',
  'awaiting_payment',
  'payment_pending',
  'received',
]);
const BLOCKED_ORDER_STATUSES = new Set(['confirmed', 'paid', 'approved', 'processing', 'completed', 'delivered']);

const isConfirmedPayment = (record: AdminRecord) => PAID_PAYMENT_STATUSES.has(getPaymentStatusValue(record));
const isPendingPayment = (record: AdminRecord) => PENDING_PAYMENT_STATUSES.has(getPaymentStatusValue(record));
const hasStockDeducted = (record: AdminRecord) => record.stock_deducted === true || record.stock_deducted === 'true';
const isOrderFullyConfirmed = (record: AdminRecord) => isConfirmedPayment(record) && hasStockDeducted(record);
const isOrderCancelled = (record: AdminRecord) =>
  getStatus(record).toLowerCase() === 'cancelled' || getPaymentStatusValue(record) === 'cancelled';
const isOrderCancelable = (record: AdminRecord) => {
  const status = getStatus(record).toLowerCase();
  const paymentStatus = getPaymentStatusValue(record);

  if (isOrderCancelled(record) || hasStockDeducted(record)) {
    return false;
  }

  if (BLOCKED_ORDER_STATUSES.has(status) || BLOCKED_ORDER_STATUSES.has(paymentStatus)) {
    return false;
  }

  return PENDING_PAYMENT_STATUSES.has(status) || PENDING_PAYMENT_STATUSES.has(paymentStatus);
};

const getUniqueImageUrls = (urls: Array<string | null | undefined>) =>
  Array.from(new Set(urls.map((url) => url?.trim()).filter((url): url is string => Boolean(url))));

const getProductImageUrls = (product: AdminProduct) =>
  getUniqueImageUrls([product.image_url, ...(product.variants ?? []).map((variant) => variant.image_url)]);

const getDeletedVariantImageUrls = (product: AdminProduct, form: AdminProductInput) => {
  const deletedVariantIds = new Set(form.deletedVariantIds ?? []);

  return getUniqueImageUrls(
    (product.variants ?? [])
      .filter((variant) => deletedVariantIds.has(variant.id))
      .map((variant) => variant.image_url)
  );
};

const getPaymentStatusLabel = (record: AdminRecord) => {
  const status = getPaymentStatusValue(record);

  switch (status) {
    case 'pending_cash_payment':
      return 'Pendiente efectivo';
    case 'awaiting_transfer':
      return 'Pendiente transferencia';
    case 'awaiting_payment':
    case 'pending':
      return 'Pendiente';
    case 'paid':
      return 'Pagado';
    case 'approved':
      return 'Aprobado';
    case 'confirmed':
      return 'Confirmado';
    case 'failed':
      return 'Fallido';
    case 'rejected':
      return 'Rechazado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return stringifyValue(record.payment_status ?? record.status);
  }
};

const stringifyValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const getAnalyticsEventLabel = (eventType: unknown) => {
  switch (String(eventType)) {
    case 'product_view':
      return 'Visita producto';
    case 'add_to_cart':
      return 'Agrego al carrito';
    case 'add_to_favorite':
      return 'Agrego favorito';
    case 'remove_from_favorite':
      return 'Quito favorito';
    case 'checkout_started':
      return 'Inicio checkout';
    case 'order_created':
      return 'Pedido creado';
    case 'payment_confirmed':
      return 'Pago confirmado';
    default:
      return stringifyValue(eventType);
  }
};

const getAnalyticsRangeLabel = (range: AnalyticsRange) => {
  switch (range) {
    case 'today':
      return 'Hoy';
    case '7d':
      return 'Ultimos 7 dias';
    case '30d':
      return 'Ultimos 30 dias';
    case 'all':
      return 'Todo';
    default:
      return 'Ultimos 30 dias';
  }
};

const RecordTable = ({
  records,
  columns,
  emptyMessage,
}: {
  records: AdminRecord[];
  columns: Array<{ key: string; label: string; render?: (record: AdminRecord) => React.ReactNode }>;
  emptyMessage: string;
}) => {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((record) => (
            <tr key={getRecordId(record) || JSON.stringify(record)} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="max-w-[260px] truncate px-4 py-3 text-gray-700">
                  {column.render ? column.render(record) : stringifyValue(record[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminTableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div className="grid grid-cols-4 gap-4 border-b border-gray-100 bg-gray-50 px-4 py-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-3 rounded bg-gray-200" />
      ))}
    </div>
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 px-4 py-4">
          {Array.from({ length: 4 }).map((__, columnIndex) => (
            <div key={columnIndex} className="h-4 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const AdminDashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 h-8 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
    <AdminTableSkeleton rows={5} />
  </div>
);

const ProductForm = ({
  form,
  title,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: AdminProductInput;
  title: string;
  isSaving: boolean;
  onChange: (form: AdminProductInput) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) => {
  const toast = useToast();
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [uploadingVariantImageIndex, setUploadingVariantImageIndex] = useState<number | null>(null);

  const updateField = <K extends keyof AdminProductInput>(key: K, value: AdminProductInput[K]) => {
    onChange({ ...form, [key]: value });
  };
  const updateVariant = <K extends keyof AdminProductVariantInput>(
    index: number,
    key: K,
    value: AdminProductVariantInput[K]
  ) => {
    onChange({
      ...form,
      variants: form.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant
      ),
    });
  };
  const addVariant = () => {
    onChange({
      ...form,
      variants: [
        ...form.variants,
        {
          color: form.color || 'Variado',
          size: form.size || 'Mediana',
          flowering_stems: Number(form.flowering_stems || 0) > 0 ? Number(form.flowering_stems) : '',
          price: form.price || '',
          stock: Number(form.stock || 0),
          stock_mode: form.stock_mode || 'quantity',
          image_url: form.image_url || '',
          is_active: true,
          sort_order: form.variants.length + 1,
        },
      ],
    });
  };
  const removeVariant = (index: number) => {
    const variant = form.variants[index];
    onChange({
      ...form,
      variants: form.variants.filter((_, variantIndex) => variantIndex !== index),
      deletedVariantIds: variant?.id ? [...(form.deletedVariantIds ?? []), variant.id] : form.deletedVariantIds,
    });
  };

  const getUploadProductKey = () => form.slug?.trim() || form.name.trim() || 'producto';

  const handleProductImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploadingProductImage(true);

    try {
      const publicUrl = await uploadProductImage(file, { productSlug: getUploadProductKey() });
      updateField('image_url', publicUrl);
      toast.success('Imagen subida correctamente.');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.';
      toast.error(message);
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleVariantImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploadingVariantImageIndex(index);

    try {
      const publicUrl = await uploadProductImage(file, {
        productSlug: getUploadProductKey(),
        variant: true,
      });
      updateVariant(index, 'image_url', publicUrl);
      toast.success('Imagen de variante subida correctamente.');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.';
      toast.error(message);
    } finally {
      setUploadingVariantImageIndex(null);
    }
  };

  const hasPriceValue = /\d/.test(String(form.price ?? ''));

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-700"
          aria-label="Cancelar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Nombre
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            required
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Slug
          <input
            value={form.slug || ''}
            onChange={(event) => updateField('slug', event.target.value)}
            placeholder="se-genera-si-lo-dejas-vacio"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Tipo / categoría
          <input
            list="admin-product-type-options"
            value={form.orchid_type}
            onChange={(event) => updateField('orchid_type', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            required
          />
          <datalist id="admin-product-type-options">
            <option value="Phalaenopsis" />
            <option value="Cattleya" />
            <option value="Dendrobium" />
            <option value="Oncidium" />
            <option value="Vanda" />
            <option value="interior" label="Plantas de interior" />
            <option value="exterior" label="Plantas de exterior" />
            <option value="Arreglos" />
            <option value="Macetas" />
            <option value="Otros" />
          </datalist>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Tamano
          <input
            value={form.size}
            onChange={(event) => updateField('size', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Color
          <input
            value={form.color}
            onChange={(event) => updateField('color', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Varas florales
          <input
            type="number"
            min="0"
            value={form.flowering_stems}
            onChange={(event) => updateField('flowering_stems', Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Precio
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder="56000"
              required
            />
          </div>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Modo de stock
          <select
            value={form.stock_mode}
            onChange={(event) => updateField('stock_mode', event.target.value as AdminProductInput['stock_mode'])}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="quantity">Stock con cantidad</option>
            <option value="consult">Consultar disponibilidad</option>
          </select>
          {form.stock_mode === 'consult' && (
            <span className="mt-1 block text-xs font-normal text-gray-500">
              El stock numérico queda como respaldo, pero este producto no se venderá directo.
            </span>
          )}
        </label>

        <label className="text-sm font-medium text-gray-700">
          Stock
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) => updateField('stock', Number(event.target.value))}
            disabled={form.stock_mode === 'consult'}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-500"
            required
          />
        </label>

        <div className="text-sm font-medium text-gray-700 md:col-span-2">
          <label>
            URL de imagen
            <input
              value={form.image_url}
              onChange={(event) => updateField('image_url', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder="https://..."
            />
          </label>
          <p className="mt-1 text-xs font-normal text-gray-500">Podés pegar una URL pública o subir una imagen.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label
              className={`inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 ${
                uploadingProductImage ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              }`}
            >
              {uploadingProductImage && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploadingProductImage ? 'Subiendo...' : 'Subir imagen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingProductImage}
                onChange={handleProductImageUpload}
              />
            </label>
            <span className="text-xs font-normal text-gray-500">JPG, PNG o WebP hasta 5 MB.</span>
          </div>
          {form.image_url && (
            <div className="mt-3 w-fit rounded-xl border border-gray-200 bg-white p-2">
              <img
                src={form.image_url}
                alt="Vista previa del producto"
                className="h-28 w-28 rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </div>

        <label className="text-sm font-medium text-gray-700 md:col-span-2">
          Descripcion
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(event) => updateField('is_featured', event.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Destacado
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField('is_active', event.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Visible en tienda
        </label>
      </div>

      <div className="mt-6 rounded-lg border border-emerald-100 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-semibold text-gray-800">Variantes del producto</h4>
            <p className="text-xs text-gray-500">
              Producto principal = contenedor general. Variantes = opciones reales vendibles.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <Plus className="h-4 w-4" />
            Agregar variante
          </button>
        </div>

        {form.variants.length > 0 && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Este producto usa variantes. En la página del producto se usará el precio, stock e imagen de la variante
            seleccionada. El precio y stock principal quedan como respaldo para productos sin variantes.
          </div>
        )}

        {form.variants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            Este producto no tiene variantes. Se usan precio, stock e imagen del producto principal.
          </div>
        ) : (
          <div className="space-y-3">
            {form.variants.map((variant, index) => (
              <div key={variant.id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-700">Variante {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                    title="Eliminar variante"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="text-xs font-medium text-gray-600">
                    Color
                    <input
                      value={variant.color}
                      onChange={(event) => updateVariant(index, 'color', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Tamano
                    <input
                      value={variant.size}
                      onChange={(event) => updateVariant(index, 'size', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Varas
                    <input
                      type="number"
                      min="1"
                      value={variant.flowering_stems}
                      onChange={(event) =>
                        updateVariant(index, 'flowering_stems', event.target.value === '' ? '' : Number(event.target.value))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: 1"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Precio
                    <input
                      type="text"
                      inputMode="decimal"
                      value={variant.price}
                      onChange={(event) => updateVariant(index, 'price', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Modo de stock
                    <select
                      value={variant.stock_mode}
                      onChange={(event) =>
                        updateVariant(index, 'stock_mode', event.target.value as AdminProductVariantInput['stock_mode'])
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="quantity">Stock con cantidad</option>
                      <option value="consult">Consultar disponibilidad</option>
                    </select>
                    {variant.stock_mode === 'consult' && (
                      <span className="mt-1 block font-normal text-gray-500">No se venderá directo desde la tienda.</span>
                    )}
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Stock
                    <input
                      type="number"
                      min="0"
                      value={variant.stock}
                      onChange={(event) => updateVariant(index, 'stock', Number(event.target.value))}
                      disabled={variant.stock_mode === 'consult'}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Orden
                    <input
                      type="number"
                      min="0"
                      value={variant.sort_order}
                      onChange={(event) => updateVariant(index, 'sort_order', Number(event.target.value))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <div className="text-xs font-medium text-gray-600 md:col-span-2">
                    <label>
                      URL de imagen
                      <input
                        value={variant.image_url}
                        onChange={(event) => updateVariant(index, 'image_url', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://..."
                      />
                    </label>
                    <p className="mt-1 font-normal text-gray-500">Podés pegar una URL pública o subir una imagen.</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label
                        className={`inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 ${
                          uploadingVariantImageIndex === index ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                        }`}
                      >
                        {uploadingVariantImageIndex === index && <Loader2 className="h-4 w-4 animate-spin" />}
                        {uploadingVariantImageIndex === index ? 'Subiendo...' : 'Subir imagen'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={uploadingVariantImageIndex === index}
                          onChange={(event) => handleVariantImageUpload(index, event)}
                        />
                      </label>
                      <span className="font-normal text-gray-500">JPG, PNG o WebP hasta 5 MB.</span>
                    </div>
                    {variant.image_url && (
                      <div className="mt-2 w-fit rounded-lg border border-gray-200 bg-white p-1.5">
                        <img
                          src={variant.image_url}
                          alt={`Vista previa de variante ${index + 1}`}
                          className="h-20 w-20 rounded-md object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 pt-6 text-xs font-medium text-gray-600">
                    <input
                      type="checkbox"
                      checked={variant.is_active}
                      onChange={(event) => updateVariant(index, 'is_active', event.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Activa
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving || !form.name.trim() || !hasPriceValue}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar producto
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onBack, onProductsChanged }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminRecord[]>([]);
  const [payments, setPayments] = useState<AdminRecord[]>([]);
  const [profiles, setProfiles] = useState<AdminRecord[]>([]);
  const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReportData | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('30d');
  const [dashboardSummary, setDashboardSummary] = useState<AdminDashboardSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Record<AdminTab, boolean>>({
    dashboard: false,
    products: false,
    orders: false,
    customers: false,
    payments: false,
    analytics: false,
  });
  const [tabErrors, setTabErrors] = useState<Partial<Record<AdminTab, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productForm, setProductForm] = useState<AdminProductInput>(() => emptyAdminProductInput());
  const { confirm } = useConfirm();
  const toast = useToast();

  const isAdmin = Boolean(user?.isAdmin);

  const cleanupUnusedProductImages = async (imageUrls: string[]) => {
    const uniqueImageUrls = getUniqueImageUrls(imageUrls);

    if (uniqueImageUrls.length === 0) {
      return false;
    }

    const results = await Promise.allSettled(
      uniqueImageUrls.map((imageUrl) => deleteUnusedProductImageByPublicUrl(imageUrl))
    );
    const failedResults = results.filter((result) => result.status === 'rejected');

    if (failedResults.length > 0 && import.meta.env.DEV) {
      console.warn('No se pudieron limpiar algunas imagenes de producto:', failedResults);
    }

    return failedResults.length > 0;
  };

  const setTabError = (tab: AdminTab, message = '') => {
    setTabErrors((currentErrors) => ({ ...currentErrors, [tab]: message }));
  };

  const markTabLoaded = (tab: AdminTab) => {
    setLoadedTabs((currentTabs) => ({ ...currentTabs, [tab]: true }));
  };

  const loadDashboardData = async () => {
    setIsLoadingDashboard(true);
    setError('');
    setTabError('dashboard');

    try {
      const data = await getAdminDashboardData();
      setProducts(data.products);
      setOrders(data.orders);
      setPayments(data.payments);
      setDashboardSummary(data.summary ?? null);
      markTabLoaded('dashboard');
      setTabError(
        'dashboard',
        data.loadErrors?.length ? `Algunas secciones no cargaron: ${data.loadErrors.join(' | ')}` : ''
      );
    } catch (loadError) {
      setTabError('dashboard', loadError instanceof Error ? loadError.message : 'No se pudo cargar el panel.');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    setError('');
    setTabError('products');

    try {
      const adminProducts = await getAdminProducts();
      setProducts(adminProducts);
      markTabLoaded('products');
    } catch (loadError) {
      setTabError('products', loadError instanceof Error ? loadError.message : 'No se pudieron cargar los productos.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    setError('');
    setTabError('orders');

    try {
      const adminOrders = await getAdminOrders();
      setOrders(adminOrders);
      markTabLoaded('orders');
    } catch (loadError) {
      setTabError('orders', loadError instanceof Error ? loadError.message : 'No se pudieron cargar los pedidos.');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadPayments = async () => {
    setIsLoadingPayments(true);
    setError('');
    setTabError('payments');

    try {
      const adminPayments = await getAdminPayments();
      setPayments(adminPayments);
      markTabLoaded('payments');
    } catch (loadError) {
      setTabError('payments', loadError instanceof Error ? loadError.message : 'No se pudieron cargar los pagos.');
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const loadProfiles = async () => {
    setIsLoadingProfiles(true);
    setError('');
    setTabError('customers');

    try {
      const adminProfiles = await getAdminProfiles();
      setProfiles(adminProfiles);
      markTabLoaded('customers');
    } catch (loadError) {
      setTabError('customers', loadError instanceof Error ? loadError.message : 'No se pudieron cargar los clientes.');
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const loadAnalytics = async (range = analyticsRange) => {
    setIsLoadingAnalytics(true);
    setError('');
    setTabError('analytics');

    try {
      const report = await getAnalyticsReport(range);
      setAnalyticsReport(report);
      markTabLoaded('analytics');
    } catch (loadError) {
      setTabError('analytics', loadError instanceof Error ? loadError.message : 'No se pudieron cargar las analiticas.');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const loadTabData = (tab: AdminTab, force = false) => {
    if (!force && loadedTabs[tab]) {
      return;
    }

    if (tab === 'dashboard') void loadDashboardData();
    if (tab === 'products') void loadProducts();
    if (tab === 'orders') void loadOrders();
    if (tab === 'customers') void loadProfiles();
    if (tab === 'payments') void loadPayments();
    if (tab === 'analytics') void loadAnalytics();
  };

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    loadTabData(tab);
  };

  const changeAnalyticsRange = (range: AnalyticsRange) => {
    setAnalyticsRange(range);
    if (activeTab === 'analytics') {
      void loadAnalytics(range);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadDashboardData();
    } else {
      setIsLoadingDashboard(false);
    }
  }, [isAdmin]);

  const stats = useMemo(() => {
    if (dashboardSummary) {
      return dashboardSummary;
    }

    const activeProducts = products.filter((product) => product.is_active).length;
    const lowStockProducts = products.filter((product) => product.stock_mode !== 'consult' && Number(product.stock) <= 3).length;
    const pendingOrders = orders.filter(
      (order) => ['pending', 'pendiente', 'awaiting_payment', 'received'].includes(getStatus(order)) || isPendingPayment(order)
    ).length;
    const revenue = payments.filter(isConfirmedPayment).reduce((sum, payment) => sum + getAmount(payment), 0);
    const pendingPayments = payments.filter(isPendingPayment).reduce((sum, payment) => sum + getAmount(payment), 0);

    return { activeProducts, lowStockProducts, pendingOrders, revenue, pendingPayments };
  }, [dashboardSummary, orders, payments, products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.orchid_type, product.color, product.size]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const startCreateProduct = () => {
    setEditingProduct(null);
    setIsCreatingProduct(true);
    setProductForm(emptyAdminProductInput());
    setActiveTab('products');
    loadTabData('products');
  };

  const startEditProduct = (product: AdminProduct) => {
    setEditingProduct(product);
    setIsCreatingProduct(false);
    setProductForm(productToInput(product));
  };

  const cancelProductForm = () => {
    setEditingProduct(null);
    setIsCreatingProduct(false);
    setProductForm(emptyAdminProductInput());
  };

  const saveProduct = async () => {
    const deletedVariantImageUrls = editingProduct ? getDeletedVariantImageUrls(editingProduct, productForm) : [];

    setIsSaving(true);
    setError('');

    try {
      if (editingProduct) {
        await updateAdminProduct(editingProduct.id, productForm);
      } else {
        await createAdminProduct(productForm);
      }

      const cleanupFailed = await cleanupUnusedProductImages(deletedVariantImageUrls);

      cancelProductForm();
      await loadProducts();
      await loadDashboardData();
      onProductsChanged();

      if (cleanupFailed) {
        toast.warning('El producto se guardó, pero no pudimos borrar una o más imágenes del almacenamiento.');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeProduct = async (product: AdminProduct) => {
    const confirmed = await confirm({
      title: 'Eliminar producto',
      message: `¿Querés eliminar "${product.name}"? También se intentarán borrar sus imágenes asociadas del almacenamiento si no están siendo usadas por otro producto.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const imageUrls = getProductImageUrls(product);
      await deleteAdminProduct(product.id);
      const cleanupFailed = await cleanupUnusedProductImages(imageUrls);
      await loadProducts();
      await loadDashboardData();
      onProductsChanged();
      toast.success('Producto eliminado correctamente.');
      if (cleanupFailed) {
        toast.warning('El producto se eliminó, pero no pudimos borrar una o más imágenes del almacenamiento.');
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el producto.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const changeOrderStatus = async (order: AdminRecord, status: string) => {
    const id = getRecordId(order);
    if (!id) {
      return;
    }

    if ((status === 'confirmed' || status === 'paid') && !isOrderFullyConfirmed(order)) {
      await confirmOrderPayment(order);
      return;
    }

    if (status === 'cancelled') {
      await cancelPendingOrder(order);
      return;
    }

    setError('');

    try {
      await updateAdminOrderStatus(id, status);
      await loadOrders();
      await loadDashboardData();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'No se pudo actualizar el pedido.');
    }
  };

  const confirmOrderPayment = async (order: AdminRecord) => {
    const id = getRecordId(order);
    if (!id) {
      return;
    }

    const confirmed = await confirm({
      title: 'Confirmar pago',
      message: 'Se va a confirmar el pago y descontar el stock correspondiente.',
      confirmLabel: 'Confirmar pago',
    });
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await confirmAdminOrderPayment(id);
      await loadOrders();
      await loadDashboardData();
      if (loadedTabs.payments) {
        await loadPayments();
      }
      onProductsChanged();
      toast.success('Pago confirmado correctamente.');
    } catch (confirmError) {
      await loadOrders();
      await loadDashboardData();
      const message = confirmError instanceof Error ? confirmError.message : 'No se pudo confirmar el pago.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelPendingOrder = async (order: AdminRecord) => {
    const id = getRecordId(order);
    if (!id) {
      return;
    }

    if (!isOrderCancelable(order)) {
      setError('Este pedido ya fue confirmado y no puede cancelarse desde aca.');
      toast.warning('Este pedido ya fue confirmado y no puede cancelarse desde acá.');
      return;
    }

    const confirmed = await confirm({
      title: 'Cancelar pedido',
      message: '¿Seguro que querés cancelar este pedido?',
      confirmLabel: 'Cancelar pedido',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await cancelAdminPendingOrder(id);
      await loadOrders();
      await loadDashboardData();
      if (loadedTabs.payments) {
        await loadPayments();
      }
      toast.success('Pedido cancelado correctamente.');
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar el pedido.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-emerald-700">
          <ArrowLeft className="h-5 w-5" />
          Volver
        </button>
        <div className="rounded-lg border border-red-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Acceso requerido</h1>
          <p className="mt-2 text-gray-600">Iniciá sesión con una cuenta administradora.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-emerald-700">
          <ArrowLeft className="h-5 w-5" />
          Volver
        </button>
        <div className="rounded-lg border border-red-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Acceso denegado</h1>
          <p className="mt-2 text-gray-600">Tu perfil no tiene rol de administrador.</p>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'products', label: 'Productos', icon: <Boxes className="h-4 w-4" /> },
    { id: 'orders', label: 'Pedidos', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'customers', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { id: 'payments', label: 'Pagos', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analiticas', icon: <LineChart className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
              <ArrowLeft className="h-4 w-4" />
              Volver a la tienda
            </button>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Panel administrador</h1>
            <p className="mt-1 text-gray-600">Gestioná productos, pedidos, clientes y pagos.</p>
          </div>
          <button
            onClick={startCreateProduct}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Agregar producto
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-gray-200 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {tabErrors[activeTab] && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{tabErrors[activeTab]}</span>
            <button
              type="button"
              onClick={() => loadTabData(activeTab, true)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && isLoadingDashboard && !loadedTabs.dashboard ? (
          <AdminDashboardSkeleton />
        ) : (
          activeTab === 'dashboard' && loadedTabs.dashboard && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-5">
                    <p className="text-sm font-medium text-gray-500">Productos activos</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stats.activeProducts}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-5">
                    <p className="text-sm font-medium text-gray-500">Stock bajo</p>
                    <p className="mt-2 text-3xl font-bold text-orange-600">{stats.lowStockProducts}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-5">
                    <p className="text-sm font-medium text-gray-500">Pedidos pendientes</p>
                    <p className="mt-2 text-3xl font-bold text-blue-600">{stats.pendingOrders}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-5">
                    <p className="text-sm font-medium text-gray-500">Total cobrado</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">{formatCurrency(stats.revenue)}</p>
                    <p className="mt-1 text-xs text-gray-500">Pendiente: {formatCurrency(stats.pendingPayments)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Pedidos recientes</h2>
                    <RecordTable
                      records={orders.slice(0, 6)}
                      emptyMessage="Todavia no hay pedidos registrados."
                      columns={[
                        { key: 'id', label: 'ID', render: (record) => getRecordId(record).slice(0, 8) || '-' },
                        { key: 'status', label: 'Estado', render: (record) => getStatus(record) },
                        { key: 'total', label: 'Total', render: (record) => formatCurrency(getAmount(record)) },
                        { key: 'created_at', label: 'Fecha', render: (record) => formatDate(record.created_at) },
                      ]}
                    />
                  </div>
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Stock bajo</h2>
                    <RecordTable
                      records={products.filter((product) => product.stock_mode !== 'consult' && Number(product.stock) <= 3).slice(0, 6) as unknown as AdminRecord[]}
                      emptyMessage="No hay productos con stock bajo."
                      columns={[
                        { key: 'name', label: 'Producto' },
                        { key: 'orchid_type', label: 'Tipo' },
                        { key: 'stock', label: 'Stock' },
                        { key: 'price', label: 'Precio', render: (record) => formatCurrency(record.price) },
                      ]}
                    />
                  </div>
                </div>
              </div>
          )
        )}

        {activeTab === 'products' && isLoadingProducts && !loadedTabs.products ? (
          <AdminTableSkeleton rows={6} />
        ) : (
          activeTab === 'products' && loadedTabs.products && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Buscar producto..."
                      className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={startCreateProduct}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar producto
                  </button>
                </div>

                {(isCreatingProduct || editingProduct) && (
                  <ProductForm
                    form={productForm}
                    title={editingProduct ? `Editar ${editingProduct.name}` : 'Nuevo producto'}
                    isSaving={isSaving}
                    onChange={setProductForm}
                    onCancel={cancelProductForm}
                    onSubmit={saveProduct}
                  />
                )}

                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Precio</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="max-w-md truncate text-xs text-gray-500">{product.description}</div>
                            {product.variants && product.variants.length > 0 && (
                              <div className="mt-1 text-xs font-semibold text-emerald-700">
                                {product.variants.length} variantes configuradas
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{product.orchid_type}</td>
                          <td className="px-4 py-3 text-gray-700">{formatCurrency(product.price)}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {product.stock_mode === 'consult' ? 'Consultar disponibilidad' : product.stock}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                                product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {product.is_active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {product.is_active ? 'Visible' : 'Oculto'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditProduct(product)}
                                className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                                title="Editar producto"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeProduct(product)}
                                disabled={isSaving}
                                className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                title="Eliminar producto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          )
        )}

        {activeTab === 'orders' && isLoadingOrders && !loadedTabs.orders ? (
          <AdminTableSkeleton rows={6} />
        ) : (
          activeTab === 'orders' && loadedTabs.orders && (
              <RecordTable
                records={orders}
                emptyMessage="Todavia no hay pedidos registrados."
                columns={[
                  { key: 'id', label: 'ID', render: (record) => getRecordId(record).slice(0, 8) || '-' },
                  {
                    key: 'status',
                    label: 'Estado',
                    render: (record) => (
                      <select
                        value={getStatus(record)}
                        onChange={(event) => changeOrderStatus(record, event.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="processing">Preparando</option>
                        <option value="paid">Pagado</option>
                        <option value="requires_review">Requiere revisión</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    ),
                  },
                  {
                    key: 'items_summary',
                    label: 'Productos',
                    render: (record) => (
                      <span title={String(record.items_summary || '')}>
                        {stringifyValue(record.items_summary)}
                      </span>
                    ),
                  },
                  { key: 'total', label: 'Total', render: (record) => formatCurrency(getAmount(record)) },
                  {
                    key: 'payment_fee',
                    label: 'Recargo',
                    render: (record) => {
                      const fee = Number(record.payment_fee ?? 0);
                      return fee > 0 ? formatCurrency(fee) : '-';
                    },
                  },
                  { key: 'payment_status', label: 'Pago', render: (record) => getPaymentStatusLabel(record) },
                  {
                    key: 'stock_deducted',
                    label: 'Stock',
                    render: (record) => (isOrderFullyConfirmed(record) ? 'Descontado' : 'Pendiente'),
                  },
                  {
                    key: 'actions',
                    label: 'Acciones',
                    render: (record) => {
                      if (isOrderCancelled(record)) {
                        return <span className="text-xs font-semibold text-red-700">Cancelado</span>;
                      }

                      if (isOrderFullyConfirmed(record)) {
                        return (
                        <span className="text-xs font-semibold text-emerald-700">Confirmado</span>
                        );
                      }

                      return (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => confirmOrderPayment(record)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            Confirmar pago
                          </button>

                          {isOrderCancelable(record) && (
                            <button
                              type="button"
                              onClick={() => cancelPendingOrder(record)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                              Cancelar
                            </button>
                          )}
                        </div>
                      );
                    },
                  },
                  { key: 'created_at', label: 'Fecha', render: (record) => formatDate(record.created_at) },
                ]}
              />
          )
        )}

        {activeTab === 'customers' && (
          isLoadingProfiles && !loadedTabs.customers ? (
                <AdminTableSkeleton rows={6} />
              ) : loadedTabs.customers ? (
                <RecordTable
                  records={profiles}
                  emptyMessage="Todavia no hay clientes registrados."
                  columns={[
                    { key: 'full_name', label: 'Nombre' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Teléfono' },
                    { key: 'role', label: 'Rol' },
                    { key: 'address', label: 'Dirección' },
                    { key: 'created_at', label: 'Alta', render: (record) => formatDate(record.created_at) },
                  ]}
                />
              ) : null
        )}

        {activeTab === 'payments' && isLoadingPayments && !loadedTabs.payments ? (
          <AdminTableSkeleton rows={6} />
        ) : (
          activeTab === 'payments' && loadedTabs.payments && (
              <RecordTable
                records={payments}
                emptyMessage="Todavia no hay pagos registrados."
                columns={[
                  { key: 'id', label: 'ID', render: (record) => getRecordId(record).slice(0, 8) || '-' },
                  { key: 'status', label: 'Estado', render: (record) => getPaymentStatusLabel(record) },
                  { key: 'amount', label: 'Importe', render: (record) => formatCurrency(getAmount(record)) },
                  { key: 'method', label: 'Método', render: (record) => stringifyValue(record.method ?? record.payment_method) },
                  { key: 'created_at', label: 'Fecha', render: (record) => formatDate(record.created_at) },
                ]}
              />
          )
        )}

        {activeTab === 'analytics' && isLoadingAnalytics && !loadedTabs.analytics ? (
          <AdminDashboardSkeleton />
        ) : (
          activeTab === 'analytics' && loadedTabs.analytics && analyticsReport && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Analiticas</h2>
                  <p className="text-sm text-gray-500">Rango actual: {getAnalyticsRangeLabel(analyticsRange)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={analyticsRange}
                    onChange={(event) => changeAnalyticsRange(event.target.value as AnalyticsRange)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="today">Hoy</option>
                    <option value="7d">Ultimos 7 dias</option>
                    <option value="30d">Ultimos 30 dias</option>
                    <option value="all">Todo</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => loadTabData('analytics', true)}
                    disabled={isLoadingAnalytics}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-sm font-medium text-gray-500">Producto mas visitado</p>
                  <p className="mt-2 truncate text-xl font-bold text-gray-900">
                    {analyticsReport.summary.topViewedProduct?.productName ?? '-'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{analyticsReport.summary.totalProductViews} visitas</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-sm font-medium text-gray-500">Mas agregado al carrito</p>
                  <p className="mt-2 truncate text-xl font-bold text-gray-900">
                    {analyticsReport.summary.topCartProduct?.productName ?? '-'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{analyticsReport.summary.totalAddToCart} agregados</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-sm font-medium text-gray-500">Producto con mas favoritos</p>
                  <p className="mt-2 truncate text-xl font-bold text-gray-900">
                    {analyticsReport.summary.topFavoriteProduct?.productName ?? '-'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{analyticsReport.summary.totalFavorites} favoritos</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <p className="text-sm font-medium text-gray-500">Producto mas comprado</p>
                  <p className="mt-2 truncate text-xl font-bold text-gray-900">
                    {analyticsReport.summary.topPurchasedProduct?.productName ?? '-'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{analyticsReport.summary.totalOrders} compras confirmadas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Productos mas visitados</h3>
                  <RecordTable
                    records={analyticsReport.topViewedProducts}
                    emptyMessage="Todavia no hay visitas registradas."
                    columns={[
                      { key: 'productName', label: 'Producto' },
                      { key: 'category', label: 'Tipo' },
                      { key: 'count', label: 'Visitas' },
                      { key: 'lastInteraction', label: 'Ultima visita', render: (record) => formatDate(record.lastInteraction) },
                    ]}
                  />
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Productos mas agregados al carrito</h3>
                  <RecordTable
                    records={analyticsReport.topCartProducts}
                    emptyMessage="Todavia no hay agregados al carrito."
                    columns={[
                      { key: 'productName', label: 'Producto' },
                      { key: 'count', label: 'Veces' },
                      { key: 'quantity', label: 'Cantidad total' },
                      { key: 'lastInteraction', label: 'Ultima interaccion', render: (record) => formatDate(record.lastInteraction) },
                    ]}
                  />
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Productos con mas favoritos</h3>
                  <RecordTable
                    records={analyticsReport.topFavoriteProducts}
                    emptyMessage="Todavia no hay favoritos registrados."
                    columns={[
                      { key: 'productName', label: 'Producto' },
                      { key: 'category', label: 'Tipo' },
                      { key: 'count', label: 'Favoritos' },
                      { key: 'lastInteraction', label: 'Ultima interaccion', render: (record) => formatDate(record.lastInteraction) },
                    ]}
                  />
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Productos mas comprados</h3>
                  <RecordTable
                    records={analyticsReport.topPurchasedProducts}
                    emptyMessage="Todavia no hay compras confirmadas."
                    columns={[
                      { key: 'productName', label: 'Producto' },
                      { key: 'quantity', label: 'Unidades' },
                      { key: 'revenue', label: 'Facturacion', render: (record) => formatCurrency(record.revenue) },
                    ]}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Usuarios mas activos</h3>
                <RecordTable
                  records={analyticsReport.topUsers}
                  emptyMessage="Todavia no hay actividad de usuarios registrados."
                  columns={[
                    { key: 'userLabel', label: 'Usuario' },
                    { key: 'visits', label: 'Visitas' },
                    { key: 'cartAdds', label: 'Carrito' },
                    { key: 'favorites', label: 'Favoritos' },
                    { key: 'orders', label: 'Pedidos' },
                    { key: 'totalPurchased', label: 'Total comprado', render: (record) => formatCurrency(record.totalPurchased) },
                  ]}
                />
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Actividad reciente</h3>
                <RecordTable
                  records={analyticsReport.recentActivity}
                  emptyMessage="Todavia no hay actividad registrada."
                  columns={[
                    { key: 'eventType', label: 'Evento', render: (record) => getAnalyticsEventLabel(record.eventType) },
                    { key: 'productName', label: 'Producto' },
                    { key: 'userLabel', label: 'Usuario' },
                    { key: 'createdAt', label: 'Fecha', render: (record) => formatDate(record.createdAt) },
                  ]}
                />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
