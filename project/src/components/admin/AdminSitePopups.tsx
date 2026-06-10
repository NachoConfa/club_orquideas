import React, { useEffect, useState } from 'react';
import { Edit, Loader2, Plus, RefreshCw, Save, Trash2, Upload, X } from '../../lib/icons';
import {
  createSitePopup,
  deleteSitePopup,
  emptySitePopupInput,
  getAdminSitePopups,
  sitePopupToInput,
  updateSitePopup,
} from '../../services/sitePopupService';
import { uploadProductImage } from '../../services/productImageUploadService';
import type { SitePopup, SitePopupAcceptAction, SitePopupInput } from '../../types/sitePopup';
import { useConfirm } from '../feedback/ConfirmProvider';
import { useToast } from '../feedback/ToastProvider';

const toDateTimeLocalValue = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getCampaignStorageKey = (campaignKey: string) => `modo-plantas-popup-${campaignKey}`;

const PopupForm = ({
  form,
  title,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: SitePopupInput;
  title: string;
  isSaving: boolean;
  onChange: (form: SitePopupInput) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) => {
  const toast = useToast();
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const updateField = <K extends keyof SitePopupInput>(key: K, value: SitePopupInput[K]) => {
    onChange({ ...form, [key]: value });
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const publicUrl = await uploadProductImage(file, {
        folder: 'site-popups',
        productSlug: form.campaign_key || form.title || 'popup',
      });
      updateField('image_url', publicUrl);
      toast.success('Imagen subida correctamente.');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.';
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">
            Configura el mensaje que se muestra a los visitantes para novedades y avisos.
          </p>
        </div>
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
          Titulo
          <input
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            required
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Campaign key
          <input
            value={form.campaign_key}
            onChange={(event) => updateField('campaign_key', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            required
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            Cambiala para volver a mostrar el pop-up a quienes ya respondieron.
          </span>
        </label>

        <label className="text-sm font-medium text-gray-700 md:col-span-2">
          Descripcion
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Texto boton aceptar
          <input
            value={form.accept_label}
            onChange={(event) => updateField('accept_label', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Texto boton rechazar
          <input
            value={form.dismiss_label}
            onChange={(event) => updateField('dismiss_label', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <div className="text-sm font-medium text-gray-700 md:col-span-2">
          <label>
            URL de imagen opcional
            <input
              value={form.image_url}
              onChange={(event) => updateField('image_url', event.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <p className="mt-1 text-xs font-normal text-gray-500">Podes pegar una URL publica o subir una imagen.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label
              className={`inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 ${
                isUploadingImage ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              }`}
            >
              {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploadingImage ? 'Subiendo...' : 'Subir imagen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={isUploadingImage}
                onChange={(event) => void uploadImage(event.target.files?.[0])}
              />
            </label>
            <span className="text-xs font-normal text-gray-500">JPG, PNG o WebP hasta 5 MB.</span>
          </div>
          {form.image_url && (
            <div className="mt-3 w-fit rounded-xl border border-gray-200 bg-white p-2">
              <img
                src={form.image_url}
                alt={form.title || 'Imagen del pop-up'}
                className="h-24 w-36 rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </div>

        <label className="text-sm font-medium text-gray-700">
          Link secundario en el cuerpo del pop-up (opcional)
          <input
            value={form.link_url}
            onChange={(event) => updateField('link_url', event.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            Aparece en el cuerpo del pop-up, independiente del botón aceptar.
          </span>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Texto del link secundario
          <input
            value={form.link_label}
            onChange={(event) => updateField('link_label', event.target.value)}
            placeholder="Ver mas"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <div className="text-sm font-medium text-gray-700 md:col-span-2">
          <p className="mb-2">Acción del botón aceptar</p>
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Modo
              <select
                value={form.accept_action}
                onChange={(event) => updateField('accept_action', event.target.value as SitePopupAcceptAction)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="dismiss">Solo cerrar (aviso informativo)</option>
                <option value="link">Abrir link</option>
                <option value="whatsapp">Abrir WhatsApp</option>
              </select>
            </label>
            {form.accept_action === 'link' && (
              <label className="block text-sm font-medium text-gray-700">
                URL o ruta
                <input
                  value={form.accept_link_url}
                  onChange={(event) => updateField('accept_link_url', event.target.value)}
                  placeholder="https://... o /colecciones/..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  URL completa (https://...) o ruta interna (/colecciones/...).
                </span>
              </label>
            )}
            {form.accept_action === 'whatsapp' && (
              <label className="block text-sm font-medium text-gray-700">
                Mensaje prefijado de WhatsApp
                <textarea
                  value={form.accept_whatsapp_message}
                  onChange={(event) => updateField('accept_whatsapp_message', event.target.value)}
                  rows={3}
                  placeholder="Hola! Quiero recibir novedades de Modo Plantas para sumarme a la lista de difusión. Gracias!"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
              </label>
            )}
          </div>
        </div>

        <label className="text-sm font-medium text-gray-700">
          Inicio opcional
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(event) => updateField('starts_at', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Fin opcional
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={(event) => updateField('ends_at', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Orden
          <input
            type="number"
            value={form.sort_order}
            onChange={(event) => updateField('sort_order', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <div className="flex flex-col justify-end gap-3 text-sm font-medium text-gray-700 sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateField('is_active', event.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Habilitado
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.show_once}
              onChange={(event) => updateField('show_once', event.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Mostrar una vez por campana
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar pop-up
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

const AdminSitePopups = () => {
  const [popups, setPopups] = useState<SitePopup[]>([]);
  const [form, setForm] = useState<SitePopupInput>(() => emptySitePopupInput());
  const [editingPopup, setEditingPopup] = useState<SitePopup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const { confirm } = useConfirm();

  const loadPopups = async () => {
    setIsLoading(true);
    setError('');
    try {
      setPopups(await getAdminSitePopups());
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudieron cargar los pop-ups.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPopups();
  }, []);

  const startCreate = () => {
    setEditingPopup(null);
    setIsCreating(true);
    setForm(emptySitePopupInput());
  };

  const startEdit = (popup: SitePopup) => {
    setEditingPopup(popup);
    setIsCreating(false);
    setForm({
      ...sitePopupToInput(popup),
      starts_at: toDateTimeLocalValue(popup.starts_at),
      ends_at: toDateTimeLocalValue(popup.ends_at),
    });
  };

  const cancelForm = () => {
    setEditingPopup(null);
    setIsCreating(false);
    setForm(emptySitePopupInput());
  };

  const savePopup = async () => {
    setIsSaving(true);
    setError('');
    try {
      if (editingPopup) {
        await updateSitePopup(editingPopup.id, form);
        toast.success('Pop-up actualizado correctamente.');
      } else {
        await createSitePopup(form);
        toast.success('Pop-up creado correctamente.');
      }

      cancelForm();
      await loadPopups();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'No se pudo guardar el pop-up.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const removePopup = async (popup: SitePopup) => {
    const accepted = await confirm({
      title: 'Eliminar pop-up',
      message: 'Esta accion elimina la configuracion del pop-up. Las respuestas guardadas en localStorage de usuarios no se modifican.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!accepted) {
      return;
    }

    try {
      await deleteSitePopup(popup.id);
      toast.success('Pop-up eliminado correctamente.');
      await loadPopups();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el pop-up.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pop-up de novedades</h2>
          <p className="text-sm text-gray-500">
            Configura el aviso que aparece al entrar al sitio. El usuario no vuelve a verlo para la misma campana.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadPopups()}
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
            Crear pop-up
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {(isCreating || editingPopup) && (
        <PopupForm
          form={form}
          title={editingPopup ? `Editar ${editingPopup.title}` : 'Crear pop-up'}
          isSaving={isSaving}
          onChange={setForm}
          onCancel={cancelForm}
          onSubmit={() => void savePopup()}
        />
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-600" />
          Cargando pop-ups...
        </div>
      ) : popups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          Todavia no hay pop-ups configurados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {popups.map((popup) => (
            <article key={popup.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {popup.image_url && (
                <img
                  src={popup.image_url}
                  alt={popup.title}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      popup.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {popup.is_active ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {popup.campaign_key}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    Orden {popup.sort_order}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      popup.accept_action === 'whatsapp'
                        ? 'bg-green-100 text-green-700'
                        : popup.accept_action === 'link'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {popup.accept_action === 'whatsapp'
                      ? 'WhatsApp'
                      : popup.accept_action === 'link'
                        ? 'Link'
                        : 'Cerrar'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{popup.title}</h3>
                {popup.description && <p className="mt-2 line-clamp-3 text-sm text-gray-600">{popup.description}</p>}
                <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-gray-700">Inicio</dt>
                    <dd>{formatDateTime(popup.starts_at)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-700">Fin</dt>
                    <dd>{formatDateTime(popup.ends_at)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-gray-700">LocalStorage</dt>
                    <dd className="break-all">{getCampaignStorageKey(popup.campaign_key)}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => startEdit(popup)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void removePopup(popup)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSitePopups;
