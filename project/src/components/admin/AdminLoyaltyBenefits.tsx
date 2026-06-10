import { useEffect, useMemo, useState } from 'react';
import { Edit, Loader2, Plus, RefreshCw, Save, Search, Star, Trash2, X } from '../../lib/icons';
import {
  createLoyaltyBenefit,
  deleteLoyaltyBenefit,
  emptyLoyaltyBenefitInput,
  getAdminLoyaltyBenefits,
  loyaltyBenefitToInput,
  updateLoyaltyBenefit,
} from '../../services/loyaltyService';
import { getAdminCoupons } from '../../services/couponService';
import type { Coupon } from '../../types/coupon';
import type { LoyaltyBenefit, LoyaltyBenefitInput } from '../../types/loyalty';
import { useConfirm } from '../feedback/ConfirmProvider';
import { useToast } from '../feedback/ToastProvider';

const BenefitForm = ({
  benefit,
  title,
  isSaving,
  coupons,
  onChange,
  onCancel,
  onSave,
}: {
  benefit: LoyaltyBenefitInput;
  title: string;
  isSaving: boolean;
  coupons: Coupon[];
  onChange: (benefit: LoyaltyBenefitInput) => void;
  onCancel: () => void;
  onSave: () => void;
}) => {
  const [couponSearch, setCouponSearch] = useState('');
  const updateField = <K extends keyof LoyaltyBenefitInput>(key: K, value: LoyaltyBenefitInput[K]) => {
    onChange({ ...benefit, [key]: value });
  };
  const filteredCoupons = useMemo(() => {
    const search = couponSearch.trim().toLocaleLowerCase('es');
    if (!search) return coupons;

    return coupons.filter((coupon) =>
      `${coupon.code} ${coupon.description ?? ''}`.toLocaleLowerCase('es').includes(search)
    );
  }, [couponSearch, coupons]);
  const selectedCoupon = coupons.find((coupon) => coupon.id === benefit.coupon_id) ?? null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">
            El beneficio se desbloquea cuando el socio alcanza la cantidad indicada de compras válidas.
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Título
          <input
            value={benefit.title}
            onChange={(event) => updateField('title', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            required
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Compras requeridas
          <input
            type="number"
            min="0"
            step="1"
            value={benefit.required_purchases}
            onChange={(event) => updateField('required_purchases', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Tipo de beneficio
          <select
            value={benefit.benefit_type}
            onChange={(event) => {
              const nextType =
                event.target.value === 'gift' || event.target.value === 'coupon'
                  ? event.target.value
                  : 'manual';
              onChange({
                ...benefit,
                benefit_type: nextType,
                coupon_id: nextType === 'coupon' ? benefit.coupon_id : '',
              });
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="manual">Beneficio manual</option>
            <option value="gift">Regalo</option>
            <option value="coupon">Cupón</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Orden
          <input
            type="number"
            step="1"
            value={benefit.sort_order}
            onChange={(event) => updateField('sort_order', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700 md:col-span-2">
          Descripción
          <textarea
            value={benefit.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        {benefit.benefit_type === 'coupon' ? (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4 md:col-span-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Cupón asociado</h4>
              <p className="mt-1 text-xs text-gray-500">
                El código se muestra en el perfil únicamente cuando el socio alcanza este beneficio.
              </p>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={couponSearch}
                onChange={(event) => setCouponSearch(event.target.value)}
                placeholder="Buscar por código o descripción"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <select
              value={benefit.coupon_id}
              onChange={(event) => updateField('coupon_id', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar cupón</option>
              {filteredCoupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.code} · {coupon.is_active ? 'Activo' : 'Inactivo'}
                </option>
              ))}
            </select>
            {selectedCoupon && (
              <div className="rounded-lg bg-[#FFF8EF] px-3 py-2 text-sm text-gray-600">
                <strong className="text-[#16352B]">{selectedCoupon.code}</strong>
                {selectedCoupon.description ? ` · ${selectedCoupon.description}` : ''}
                {!selectedCoupon.is_active && (
                  <span className="ml-2 font-semibold text-amber-700">Cupón inactivo</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <label className="text-sm font-medium text-gray-700 md:col-span-2">
            Detalle del regalo o beneficio
            <textarea
              value={benefit.gift_description}
              onChange={(event) => updateField('gift_description', event.target.value)}
              rows={2}
              placeholder="Ejemplo: regalo sorpresa a coordinar con Modo Plantas."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </label>
        )}

        <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 md:col-span-2">
          <input
            type="checkbox"
            checked={benefit.is_active}
            onChange={(event) => updateField('is_active', event.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Beneficio activo y visible en el carnet
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
          {isSaving ? 'Guardando...' : 'Guardar beneficio'}
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

const AdminLoyaltyBenefits = () => {
  const [benefits, setBenefits] = useState<LoyaltyBenefit[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<LoyaltyBenefitInput>(() => emptyLoyaltyBenefitInput());
  const [editingBenefit, setEditingBenefit] = useState<LoyaltyBenefit | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const { confirm } = useConfirm();

  const loadBenefits = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [loadedBenefits, loadedCoupons] = await Promise.all([
        getAdminLoyaltyBenefits(),
        getAdminCoupons(),
      ]);
      setBenefits(loadedBenefits);
      setCoupons(loadedCoupons);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudieron cargar los beneficios.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBenefits();
  }, []);

  const resetForm = () => {
    setEditingBenefit(null);
    setIsCreating(false);
    setForm(emptyLoyaltyBenefitInput());
  };

  const startCreate = () => {
    setEditingBenefit(null);
    setIsCreating(true);
    setForm(emptyLoyaltyBenefitInput());
  };

  const startEdit = (benefit: LoyaltyBenefit) => {
    setEditingBenefit(benefit);
    setIsCreating(false);
    setForm(loyaltyBenefitToInput(benefit));
  };

  const saveBenefit = async () => {
    setIsSaving(true);
    setError('');
    try {
      if (editingBenefit) {
        await updateLoyaltyBenefit(editingBenefit.id, form);
        toast.success('Beneficio actualizado correctamente.');
      } else {
        await createLoyaltyBenefit(form);
        toast.success('Beneficio creado correctamente.');
      }

      resetForm();
      await loadBenefits();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'No se pudo guardar el beneficio.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBenefit = async (benefit: LoyaltyBenefit) => {
    try {
      await updateLoyaltyBenefit(benefit.id, {
        ...loyaltyBenefitToInput(benefit),
        is_active: !benefit.is_active,
      });
      toast.success(benefit.is_active ? 'Beneficio desactivado.' : 'Beneficio activado.');
      await loadBenefits();
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : 'No se pudo cambiar el estado.';
      setError(message);
      toast.error(message);
    }
  };

  const removeBenefit = async (benefit: LoyaltyBenefit) => {
    const accepted = await confirm({
      title: 'Eliminar beneficio',
      message: `Se eliminará "${benefit.title}". Esta acción no modifica pedidos ni compras de clientes.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!accepted) return;

    try {
      await deleteLoyaltyBenefit(benefit.id);
      toast.success('Beneficio eliminado correctamente.');
      await loadBenefits();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el beneficio.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Carnet / Beneficios</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configurá beneficios por compras confirmadas y asociá cupones existentes cuando corresponda.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadBenefits()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Crear beneficio
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {(isCreating || editingBenefit) && (
        <BenefitForm
          benefit={form}
          title={editingBenefit ? `Editar ${editingBenefit.title}` : 'Crear beneficio'}
          isSaving={isSaving}
          coupons={coupons}
          onChange={setForm}
          onCancel={resetForm}
          onSave={() => void saveBenefit()}
        />
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-600" />
          Cargando beneficios...
        </div>
      ) : benefits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          Todavía no hay beneficios configurados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {benefits.map((benefit) => (
            <article key={benefit.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Star className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          benefit.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {benefit.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        {benefit.required_purchases} compras
                      </span>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        {benefit.benefit_type === 'gift'
                          ? 'Regalo'
                          : benefit.benefit_type === 'coupon'
                            ? 'Cupón'
                            : 'Manual'}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-gray-900">{benefit.title}</h3>
                    {benefit.description && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{benefit.description}</p>
                    )}
                    {benefit.gift_description && (
                      <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {benefit.gift_description}
                      </p>
                    )}
                    {benefit.benefit_type === 'coupon' && (
                      <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        Cupón asociado: <strong>{benefit.coupon_code ?? 'No disponible'}</strong>
                        {benefit.coupon_is_active === false && (
                          <span className="ml-2 text-amber-700">(inactivo)</span>
                        )}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-gray-500">Orden: {benefit.sort_order}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => startEdit(benefit)}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void toggleBenefit(benefit)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {benefit.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  onClick={() => void removeBenefit(benefit)}
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

export default AdminLoyaltyBenefits;
