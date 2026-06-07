import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Edit, Loader2, Plus, RefreshCw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import {
  createEvent,
  deleteEvent,
  duplicateEvent,
  emptyEventInput,
  eventToInput,
  getAdminEvents,
  updateEvent,
} from '../../services/eventService';
import { getAdminProducts, type AdminProduct } from '../../services/adminSupabaseService';
import { deleteUnusedProductImageByPublicUrl, uploadProductImage } from '../../services/productImageUploadService';
import type { EventInput, EventSectionInput, EventSectionProductInput, EventStatus, StoreEvent } from '../../types/event';
import { useConfirm } from '../feedback/ConfirmProvider';
import { useToast } from '../feedback/ToastProvider';

const toSafeText = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const errorRecord = error as { message?: unknown; details?: unknown; hint?: unknown };
    const message = [errorRecord.message, errorRecord.details, errorRecord.hint]
      .map((value) => toSafeText(value))
      .filter(Boolean)
      .join(' · ');

    if (message) {
      return message;
    }
  }

  return fallback;
};

const getUniqueImageUrls = (urls: Array<string | null | undefined>) =>
  Array.from(new Set(urls.map((url) => toSafeText(url)).filter(Boolean)));

const getEventImageUrls = (event: StoreEvent) =>
  getUniqueImageUrls([event.image_url, ...(event.sections ?? []).map((section) => section.image_url)]);

const getDeletedSectionImageUrls = (event: StoreEvent, form: EventInput) => {
  const deletedSectionIds = new Set(form.deletedSectionIds ?? []);

  return getUniqueImageUrls(
    (event.sections ?? [])
      .filter((section) => deletedSectionIds.has(section.id))
      .map((section) => section.image_url)
  );
};

const getUploadKey = (form: EventInput) => toSafeText(form.slug) || toSafeText(form.title) || 'evento';

const getStatusLabel = (status: string | null | undefined) => {
  if (status === 'available') return 'Disponible';
  if (status === 'finished') return 'Finalizado';
  return 'Próximamente';
};

const formatCurrency = (value: unknown) =>
  Number(value || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const getProductSearchText = (product: AdminProduct) =>
  [product.name, product.orchid_type, product.color, product.size, product.slug]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

interface EventImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  previewAlt: string;
}

const EventImageUploadField: React.FC<EventImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  onUpload,
  isUploading,
  previewAlt,
}) => (
  <div className="text-sm font-medium text-gray-700">
    <label>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
        placeholder="https://..."
      />
    </label>
    <p className="mt-1 text-xs font-normal text-gray-500">Podés pegar una URL pública o subir una imagen.</p>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label
        className={`inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 ${
          isUploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
        }`}
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {isUploading ? 'Subiendo...' : 'Subir imagen'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={isUploading}
          onChange={onUpload}
        />
      </label>
      <span className="text-xs font-normal text-gray-500">JPG, PNG o WebP hasta 5 MB.</span>
    </div>
    {value && (
      <div className="mt-3 w-fit rounded-xl border border-gray-200 bg-white p-2">
        <img src={value} alt={previewAlt} className="h-24 w-24 rounded-lg object-cover" loading="lazy" decoding="async" />
      </div>
    )}
  </div>
);

interface EventFormProps {
  form: EventInput;
  title: string;
  isSaving: boolean;
  productOptions: AdminProduct[];
  onChange: (form: EventInput) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const EventForm: React.FC<EventFormProps> = ({
  form,
  title,
  isSaving,
  productOptions,
  onChange,
  onCancel,
  onSubmit,
}) => {
  const toast = useToast();
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadingSectionImageIndex, setUploadingSectionImageIndex] = useState<number | null>(null);
  const [productSearchBySection, setProductSearchBySection] = useState<Record<number, string>>({});

  const updateField = <K extends keyof EventInput>(key: K, value: EventInput[K]) => {
    onChange({ ...form, [key]: value });
  };

  const updateSection = <K extends keyof EventSectionInput>(index: number, key: K, value: EventSectionInput[K]) => {
    onChange({
      ...form,
      sections: form.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [key]: value } : section
      ),
    });
  };

  const updateSectionProducts = (index: number, products: EventSectionProductInput[]) => {
    updateSection(index, 'products', products);
  };

  const getSectionProducts = (section: EventSectionInput) =>
    Array.isArray(section.products) ? section.products : [];

  const getSectionProduct = (productId: unknown) =>
    productOptions.find((product) => product.id === toSafeText(productId));

  const getAvailableProducts = (section: EventSectionInput, index: number) => {
    const selectedProductIds = new Set(getSectionProducts(section).map((product) => toSafeText(product.product_id)));
    const query = (productSearchBySection[index] ?? '').trim().toLowerCase();

    return productOptions
      .filter((product) => product.is_active)
      .filter((product) => !selectedProductIds.has(product.id))
      .filter((product) => !query || getProductSearchText(product).includes(query))
      .slice(0, 8);
  };

  const addSectionProduct = (sectionIndex: number, product: AdminProduct) => {
    const section = form.sections[sectionIndex];
    const sectionProducts = section ? getSectionProducts(section) : [];

    if (!section || sectionProducts.some((relation) => toSafeText(relation.product_id) === product.id)) {
      return;
    }

    updateSectionProducts(sectionIndex, [
      ...sectionProducts,
      {
        product_id: product.id,
        sort_order: sectionProducts.length + 1,
      },
    ]);
    setProductSearchBySection((currentSearch) => ({ ...currentSearch, [sectionIndex]: '' }));
  };

  const removeSectionProduct = (sectionIndex: number, productIndex: number) => {
    const section = form.sections[sectionIndex];
    if (!section) return;

    updateSectionProducts(
      sectionIndex,
      getSectionProducts(section).filter((_, currentIndex) => currentIndex !== productIndex)
    );
  };

  const updateSectionProductOrder = (sectionIndex: number, productIndex: number, sortOrder: number) => {
    const section = form.sections[sectionIndex];
    if (!section) return;

    updateSectionProducts(
      sectionIndex,
      getSectionProducts(section).map((product, currentIndex) =>
        currentIndex === productIndex ? { ...product, sort_order: sortOrder } : product
      )
    );
  };

  const addSection = () => {
    onChange({
      ...form,
      sections: [
        ...form.sections,
        {
          title: 'Nueva sección',
          description: '',
          image_url: '',
          sort_order: form.sections.length + 1,
          is_active: true,
          products: [],
        },
      ],
    });
  };

  const removeSection = (index: number) => {
    const section = form.sections[index];
    onChange({
      ...form,
      sections: form.sections.filter((_, sectionIndex) => sectionIndex !== index),
      deletedSectionIds: section?.id ? [...(form.deletedSectionIds ?? []), section.id] : form.deletedSectionIds,
    });
  };

  const uploadImage = async (
    file: File,
    options: { section?: boolean },
    onUploaded: (publicUrl: string) => void
  ) => {
    const publicUrl = await uploadProductImage(file, {
      productSlug: getUploadKey(form),
      folder: 'events',
      variant: options.section,
    });
    onUploaded(publicUrl);
  };

  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingMainImage(true);
    try {
      await uploadImage(file, {}, (publicUrl) => updateField('image_url', publicUrl));
      toast.success('Imagen subida correctamente.');
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.');
    } finally {
      setUploadingMainImage(false);
    }
  };

  const handleSectionImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingSectionImageIndex(index);
    try {
      await uploadImage(file, { section: true }, (publicUrl) => updateSection(index, 'image_url', publicUrl));
      toast.success('Imagen de sección subida correctamente.');
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.');
    } finally {
      setUploadingSectionImageIndex(null);
    }
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button type="button" onClick={onCancel} className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Título
          <input
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
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
          Fecha
          <input
            type="date"
            value={form.event_date}
            onChange={(event) => updateField('event_date', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Horario
          <input
            value={form.event_time}
            onChange={(event) => updateField('event_time', event.target.value)}
            placeholder="Ej: 18:00 a 20:00"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Ubicación
          <input
            value={form.location}
            onChange={(event) => updateField('location', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Modalidad
          <input
            value={form.modality}
            onChange={(event) => updateField('modality', event.target.value)}
            placeholder="Presencial, online, mixto"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Estado
          <select
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as EventStatus)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="upcoming">Próximamente</option>
            <option value="available">Disponible</option>
            <option value="finished">Finalizado</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Cupos
          <input
            value={form.capacity}
            onChange={(event) => updateField('capacity', event.target.value)}
            placeholder="Ej: Cupos limitados"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Orden
          <input
            type="number"
            value={form.sort_order}
            onChange={(event) => updateField('sort_order', Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700 md:col-span-2">
          Descripción corta
          <textarea
            value={form.short_description}
            onChange={(event) => updateField('short_description', event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700 md:col-span-2">
          Descripción completa
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm font-medium text-gray-700 md:col-span-2">
          Mensaje de WhatsApp
          <textarea
            value={form.whatsapp_message}
            onChange={(event) => updateField('whatsapp_message', event.target.value)}
            rows={2}
            placeholder="Si lo dejás vacío, se arma automáticamente."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <div className="md:col-span-2">
          <EventImageUploadField
            label="Imagen principal"
            value={form.image_url}
            onChange={(value) => updateField('image_url', value)}
            onUpload={handleMainImageUpload}
            isUploading={uploadingMainImage}
            previewAlt="Vista previa del evento"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
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
            <h4 className="font-semibold text-gray-800">Secciones del evento</h4>
            <p className="text-xs text-gray-500">Agregá información adicional o galería del evento.</p>
          </div>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <Plus className="h-4 w-4" />
            Agregar sección
          </button>
        </div>

        {form.sections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            Este evento no tiene secciones adicionales.
          </div>
        ) : (
          <div className="space-y-3">
            {form.sections.map((section, index) => (
              <div key={section.id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-700">Sección {index + 1}</span>
                  <button type="button" onClick={() => removeSection(index)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium text-gray-600">
                    Título
                    <input
                      value={section.title}
                      onChange={(event) => updateSection(index, 'title', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Orden
                    <input
                      type="number"
                      value={section.sort_order}
                      onChange={(event) => updateSection(index, 'sort_order', Number(event.target.value))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-xs font-medium text-gray-600">
                    <input
                      type="checkbox"
                      checked={section.is_active}
                      onChange={(event) => updateSection(index, 'is_active', event.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Activa
                  </label>
                  <label className="text-xs font-medium text-gray-600 md:col-span-2">
                    Descripción
                    <textarea
                      value={section.description}
                      onChange={(event) => updateSection(index, 'description', event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <div className="md:col-span-2">
                    <EventImageUploadField
                      label="Imagen de sección"
                      value={section.image_url}
                      onChange={(value) => updateSection(index, 'image_url', value)}
                      onUpload={(uploadEvent) => handleSectionImageUpload(index, uploadEvent)}
                      isUploading={uploadingSectionImageIndex === index}
                      previewAlt={`Vista previa de sección ${index + 1}`}
                    />
                  </div>
                  <div className="md:col-span-2 rounded-lg border border-emerald-100 bg-white p-3">
                    <div className="mb-3">
                      <h5 className="text-sm font-semibold text-gray-800">Productos de esta sección</h5>
                      <p className="text-xs text-gray-500">
                        Asociá productos existentes. El precio, stock y variantes se editan desde Productos.
                      </p>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        value={productSearchBySection[index] ?? ''}
                        onChange={(searchEvent) =>
                          setProductSearchBySection((currentSearch) => ({
                            ...currentSearch,
                            [index]: searchEvent.target.value,
                          }))
                        }
                        placeholder="Buscar producto para agregar..."
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {getAvailableProducts(section, index).map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addSectionProduct(index, product)}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50"
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-emerald-50" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-gray-800">{product.name}</span>
                            <span className="block text-xs text-gray-500">
                              {product.price_mode === 'quote' ? 'A cotizar' : formatCurrency(product.price)}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>

                    {getSectionProducts(section).length === 0 ? (
                      <div className="mt-3 rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500">
                        Todavía no hay productos asociados a esta sección.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {getSectionProducts(section).map((relation, productIndex) => {
                          const product = getSectionProduct(relation.product_id);

                          return (
                            <div
                              key={`${relation.product_id}-${productIndex}`}
                              className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                {product?.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-12 w-12 rounded-lg object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-emerald-50" />
                                )}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-gray-800">
                                    {product?.name ?? 'Producto no encontrado'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {product
                                      ? `${product.price_mode === 'quote' ? 'A cotizar' : formatCurrency(product.price)} · ${product.orchid_type || 'Producto'}`
                                      : relation.product_id}
                                  </div>
                                </div>
                              </div>
                              <label className="text-xs font-medium text-gray-600">
                                Orden
                                <input
                                  type="number"
                                  value={relation.sort_order}
                                  onChange={(orderEvent) =>
                                    updateSectionProductOrder(index, productIndex, Number(orderEvent.target.value))
                                  }
                                  className="mt-1 w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeSectionProduct(index, productIndex)}
                                className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                title="Quitar producto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
          disabled={isSaving || !toSafeText(form.title)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar evento
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </div>
  );
};

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [productOptions, setProductOptions] = useState<AdminProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingEvent, setEditingEvent] = useState<StoreEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [form, setForm] = useState<EventInput>(() => emptyEventInput());
  const { confirm } = useConfirm();
  const toast = useToast();

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return events;

    return events.filter((event) =>
      [event.title, event.short_description, event.location, event.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  const loadEvents = async () => {
    setIsLoading(true);
    setError('');
    try {
      setEvents(await getAdminEvents());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los eventos.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductOptions = async () => {
    try {
      setProductOptions(await getAdminProducts());
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.warn('No se pudieron cargar productos para asociar a eventos:', loadError);
      }
    }
  };

  useEffect(() => {
    void loadEvents();
    void loadProductOptions();
  }, []);

  const cleanupUnusedImages = async (imageUrls: string[]) => {
    const uniqueImageUrls = getUniqueImageUrls(imageUrls);
    if (uniqueImageUrls.length === 0) return false;

    const results = await Promise.allSettled(
      uniqueImageUrls.map((imageUrl) => deleteUnusedProductImageByPublicUrl(imageUrl))
    );
    return results.some((result) => result.status === 'rejected');
  };

  const startCreateEvent = () => {
    setEditingEvent(null);
    setIsCreatingEvent(true);
    setForm(emptyEventInput());
  };

  const startEditEvent = (event: StoreEvent) => {
    setEditingEvent(event);
    setIsCreatingEvent(false);
    setForm(eventToInput(event));
  };

  const cancelForm = () => {
    setEditingEvent(null);
    setIsCreatingEvent(false);
    setForm(emptyEventInput());
  };

  const saveEvent = async () => {
    const deletedSectionImageUrls = editingEvent ? getDeletedSectionImageUrls(editingEvent, form) : [];

    setIsSaving(true);
    setError('');

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, form);
      } else {
        await createEvent(form);
      }

      const cleanupFailed = await cleanupUnusedImages(deletedSectionImageUrls);
      cancelForm();
      await loadEvents();
      toast.success('Evento guardado correctamente.');
      if (cleanupFailed) {
        toast.warning('El evento se guardó, pero no pudimos borrar una o más imágenes sin uso.');
      }
    } catch (saveError) {
      const message = getErrorMessage(saveError, 'No se pudo guardar el evento.');
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeEvent = async (event: StoreEvent) => {
    const confirmed = await confirm({
      title: 'Eliminar evento',
      message: `¿Querés eliminar "${event.title}"? También se intentarán borrar sus imágenes asociadas si no están siendo usadas en otro contenido.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });

    if (!confirmed) return;

    setIsSaving(true);
    setError('');

    try {
      const imageUrls = getEventImageUrls(event);
      await deleteEvent(event.id);
      const cleanupFailed = await cleanupUnusedImages(imageUrls);
      await loadEvents();
      toast.success('Evento eliminado correctamente.');
      if (cleanupFailed) {
        toast.warning('El evento se eliminó, pero no pudimos borrar una o más imágenes del almacenamiento.');
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el evento.');
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateSelectedEvent = async (event: StoreEvent) => {
    setIsSaving(true);
    setError('');

    try {
      await duplicateEvent(event);
      await loadEvents();
      toast.success(`Se duplicó "${event.title}" como borrador oculto.`);
    } catch (duplicateError) {
      if (import.meta.env.DEV) {
        console.error('No se pudo duplicar el evento:', duplicateError);
      }
      const message = 'No se pudo duplicar el evento. Intentá nuevamente.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar evento..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadEvents()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={startCreateEvent}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Agregar evento
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {(isCreatingEvent || editingEvent) && (
        <EventForm
          form={form}
          title={editingEvent ? `Editar ${editingEvent.title}` : 'Nuevo evento'}
          isSaving={isSaving}
          productOptions={productOptions}
          onChange={setForm}
          onCancel={cancelForm}
          onSubmit={saveEvent}
        />
      )}

      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">Cargando eventos...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Visible</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{event.title}</div>
                    <div className="max-w-md truncate text-xs text-gray-500">{event.short_description}</div>
                    {event.sections && event.sections.length > 0 && (
                      <div className="mt-1 text-xs font-semibold text-emerald-700">
                        {event.sections.length} secciones configuradas
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{event.event_date || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{event.location || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{getStatusLabel(event.status)}</td>
                  <td className="px-4 py-3 text-gray-700">{event.sort_order}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        event.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {event.is_active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {event.is_active ? 'Visible' : 'Oculto'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEditEvent(event)}
                        className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                        title="Editar evento"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void duplicateSelectedEvent(event)}
                        disabled={isSaving}
                        className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        title="Duplicar evento"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEvent(event)}
                        disabled={isSaving}
                        className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
                        title="Eliminar evento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                    Todavía no hay eventos cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
