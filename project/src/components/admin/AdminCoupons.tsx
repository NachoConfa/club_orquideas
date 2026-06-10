import { useEffect, useState } from 'react';
import { Banknote, Edit, Loader2, Plus, RefreshCw, Save, Trash2, X } from '../../lib/icons';
import {
  couponToInput,
  createCoupon,
  deleteCoupon,
  emptyCouponInput,
  getAdminCoupons,
  updateCoupon,
} from '../../services/couponService';
import type { Coupon, CouponInput } from '../../types/coupon';
import { useConfirm } from '../feedback/ConfirmProvider';
import { useToast } from '../feedback/ToastProvider';

const formatMoney = (value: number) =>
  value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sin límite';

const getDiscountLabel = (coupon: Coupon) => {
  if (coupon.discount_type === 'free_shipping') return 'Envío gratis';
  if (coupon.discount_type === 'fixed_amount') return formatMoney(coupon.discount_value);
  return `${coupon.discount_value}%`;
};

const CouponForm = ({
  coupon,
  title,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: {
  coupon: CouponInput;
  title: string;
  isSaving: boolean;
  onChange: (coupon: CouponInput) => void;
  onCancel: () => void;
  onSave: () => void;
}) => {
  const updateField = <K extends keyof CouponInput>(key: K, value: CouponInput[K]) => {
    onChange({ ...coupon, [key]: value });
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">
            El código se normaliza en mayúsculas y se valida nuevamente al crear el pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-700"
          aria-label="Cerrar formulario"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">
          Código
          <input
            value={coupon.code}
            onChange={(event) => updateField('code', event.target.value.toUpperCase())}
            placeholder="ORQUIDEA10"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Tipo de descuento
          <select
            value={coupon.discount_type}
            onChange={(event) =>
              updateField(
                'discount_type',
                event.target.value === 'fixed_amount'
                  ? 'fixed_amount'
                  : event.target.value === 'free_shipping'
                    ? 'free_shipping'
                    : 'percent'
              )
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="percent">Porcentaje</option>
            <option value="fixed_amount">Monto fijo</option>
            <option value="free_shipping">Envío gratis</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Valor
          <input
            type="number"
            min="0"
            max={coupon.discount_type === 'percent' ? 100 : undefined}
            step="1"
            value={coupon.discount_type === 'free_shipping' ? 0 : coupon.discount_value}
            disabled={coupon.discount_type === 'free_shipping'}
            onChange={(event) => updateField('discount_value', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Fecha de inicio
          <input
            type="datetime-local"
            value={coupon.starts_at}
            onChange={(event) => updateField('starts_at', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Fecha de fin
          <input
            type="datetime-local"
            value={coupon.ends_at}
            onChange={(event) => updateField('ends_at', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Monto mínimo
          <input
            type="number"
            min="0"
            step="1"
            value={coupon.min_order_amount}
            onChange={(event) => updateField('min_order_amount', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Máximo de usos globales
          <input
            type="number"
            min="1"
            step="1"
            value={coupon.max_uses}
            onChange={(event) => updateField('max_uses', event.target.value)}
            placeholder="Sin límite"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Máximo por usuario
          <input
            type="number"
            min="1"
            step="1"
            value={coupon.max_uses_per_user}
            onChange={(event) => updateField('max_uses_per_user', event.target.value)}
            placeholder="Sin límite"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <div className="flex flex-col justify-end gap-3 pb-1">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={coupon.is_active}
              onChange={(event) => updateField('is_active', event.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Cupón activo
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={coupon.requires_login}
              onChange={(event) => updateField('requires_login', event.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Requiere usuario identificado
          </label>
        </div>

        <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">
          Descripción
          <textarea
            value={coupon.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">
          Notas internas
          <textarea
            value={coupon.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Guardando...' : 'Guardar cupón'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponInput>(() => emptyCouponInput());
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const { confirm } = useConfirm();

  const loadCoupons = async () => {
    setIsLoading(true);
    setError('');
    try {
      setCoupons(await getAdminCoupons());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los cupones.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCoupons();
  }, []);

  const resetForm = () => {
    setEditingCoupon(null);
    setIsCreating(false);
    setForm(emptyCouponInput());
  };

  const saveCoupon = async () => {
    setIsSaving(true);
    setError('');
    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, form);
        toast.success('Cupón actualizado correctamente.');
      } else {
        await createCoupon(form);
        toast.success('Cupón creado correctamente.');
      }

      resetForm();
      await loadCoupons();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'No se pudo guardar el cupón.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.id, {
        ...couponToInput(coupon),
        is_active: !coupon.is_active,
      });
      toast.success(coupon.is_active ? 'Cupón desactivado.' : 'Cupón activado.');
      await loadCoupons();
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : 'No se pudo cambiar el estado.';
      setError(message);
      toast.error(message);
    }
  };

  const removeCoupon = async (coupon: Coupon) => {
    const accepted = await confirm({
      title: 'Eliminar cupón',
      message: `Se eliminará "${coupon.code}". Los cupones con usos registrados solo pueden desactivarse.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!accepted) return;

    try {
      await deleteCoupon(coupon.id);
      toast.success('Cupón eliminado correctamente.');
      await loadCoupons();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el cupón.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cupones</h2>
          <p className="mt-1 text-sm text-gray-500">
            Administrá descuentos manuales. Los límites incluyen reservas de pedidos pendientes para evitar sobreuso.
          </p>
          <p className="mt-1 text-sm font-medium text-amber-700">
            Los cupones usados no conviene borrarlos; mejor desactivarlos.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadCoupons()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingCoupon(null);
              setIsCreating(true);
              setForm(emptyCouponInput());
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Crear cupón
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {(isCreating || editingCoupon) && (
        <CouponForm
          coupon={form}
          title={editingCoupon ? `Editar ${editingCoupon.code}` : 'Crear cupón'}
          isSaving={isSaving}
          onChange={setForm}
          onCancel={resetForm}
          onSave={() => void saveCoupon()}
        />
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-600" />
          Cargando cupones...
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          Todavía no hay cupones configurados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {coupons.map((coupon) => (
            <article key={coupon.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        coupon.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {coupon.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      {getDiscountLabel(coupon)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      {coupon.usage_count ?? 0} usos
                    </span>
                  </div>
                  <h3 className="mt-3 font-mono text-lg font-bold tracking-wide text-gray-900">{coupon.code}</h3>
                  {coupon.description && <p className="mt-2 text-sm leading-6 text-gray-600">{coupon.description}</p>}
                  <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-gray-700">Vigencia</dt>
                      <dd>{formatDate(coupon.starts_at)} - {formatDate(coupon.ends_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-700">Compra mínima</dt>
                      <dd>{coupon.min_order_amount > 0 ? formatMoney(coupon.min_order_amount) : 'Sin mínimo'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-700">Límite global</dt>
                      <dd>{coupon.max_uses ?? 'Sin límite'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-700">Límite por usuario</dt>
                      <dd>{coupon.max_uses_per_user ?? 'Sin límite'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCoupon(coupon);
                    setIsCreating(false);
                    setForm(couponToInput(coupon));
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void toggleCoupon(coupon)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {coupon.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  onClick={() => void removeCoupon(coupon)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
