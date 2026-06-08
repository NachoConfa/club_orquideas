import React, { useEffect, useMemo, useState } from 'react';
import { Check, Edit, Loader2, Plus, Save, Search, Trash2, Upload, X } from '../../lib/icons';
import type { AdminProduct } from '../../services/adminSupabaseService';
import { getAdminProducts } from '../../services/adminSupabaseService';
import {
  createProductCollection,
  deleteProductCollection,
  emptyProductCollectionInput,
  getAdminProductCollections,
  productCollectionToInput,
  updateProductCollection,
} from '../../services/collectionService';
import { uploadProductImage } from '../../services/productImageUploadService';
import type {
  ProductCollection,
  ProductCollectionInput,
  ProductCollectionSectionInput,
} from '../../types/collection';
import { useConfirm } from '../feedback/ConfirmProvider';
import { useToast } from '../feedback/ToastProvider';

const formatCurrency = (value: unknown) =>
  Number(value || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const normalizeSearchText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const createSectionSlug = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getProductSearchText = (product: AdminProduct) =>
  normalizeSearchText([product.name, product.orchid_type, product.color, product.size].filter(Boolean).join(' '));

const CollectionForm: React.FC<{
  form: ProductCollectionInput;
  title: string;
  isSaving: boolean;
  productOptions: AdminProduct[];
  onChange: React.Dispatch<React.SetStateAction<ProductCollectionInput>>;
  onCancel: () => void;
  onSubmit: () => void;
}> = ({ form, title, isSaving, productOptions, onChange, onCancel, onSubmit }) => {
  const toast = useToast();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [productSearchBySection, setProductSearchBySection] = useState<Record<number, string>>({});

  const updateField = <K extends keyof ProductCollectionInput>(key: K, value: ProductCollectionInput[K]) => {
    onChange((currentForm) => ({ ...currentForm, [key]: value }));
  };

  const updateSection = <K extends keyof ProductCollectionSectionInput>(
    index: number,
    key: K,
    value: ProductCollectionSectionInput[K]
  ) => {
    onChange((currentForm) => ({
      ...currentForm,
      sections: currentForm.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [key]: value } : section
      ),
    }));
  };

  const addSection = () => {
    onChange((currentForm) => ({
      ...currentForm,
      sections: [
        ...currentForm.sections,
        {
          title: '',
          slug: '',
          description: '',
          image_url: '',
          is_active: true,
          sort_order: currentForm.sections.length + 1,
          products: [],
        },
      ],
    }));
  };

  const updateSectionTitle = (index: number, title: string) => {
    onChange((currentForm) => ({
      ...currentForm,
      sections: currentForm.sections.map((section, sectionIndex) => {
        if (sectionIndex !== index) {
          return section;
        }

        const previousAutoSlug = createSectionSlug(section.title);
        const shouldUpdateSlug = !section.slug || section.slug === previousAutoSlug;

        return {
          ...section,
          title,
          slug: shouldUpdateSlug ? createSectionSlug(title) : section.slug,
        };
      }),
    }));
  };

  const removeSection = (index: number) => {
    onChange((currentForm) => {
      const section = currentForm.sections[index];

      return {
        ...currentForm,
        sections: currentForm.sections.filter((_, sectionIndex) => sectionIndex !== index),
        deletedSectionIds: section?.id
          ? [...(currentForm.deletedSectionIds ?? []), section.id]
          : currentForm.deletedSectionIds,
      };
    });
  };

  const addSectionProduct = (sectionIndex: number, product: AdminProduct) => {
    onChange((currentForm) => {
      const section = currentForm.sections[sectionIndex];
      const sectionProducts = Array.isArray(section?.products) ? section.products : [];

      if (!section || sectionProducts.some((relation) => relation.product_id === product.id)) {
        return currentForm;
      }

      return {
        ...currentForm,
        sections: currentForm.sections.map((currentSection, currentIndex) =>
          currentIndex === sectionIndex
            ? {
                ...currentSection,
                products: [
                  ...sectionProducts,
                  {
                    product_id: product.id,
                    sort_order: sectionProducts.length + 1,
                  },
                ],
              }
            : currentSection
        ),
      };
    });
    setProductSearchBySection((current) => ({ ...current, [sectionIndex]: '' }));
    toast.success(`"${product.name}" se agregó a la sección. Guardá la colección para confirmar.`);
  };

  const removeSectionProduct = (sectionIndex: number, productId: string) => {
    onChange((currentForm) => ({
      ...currentForm,
      sections: currentForm.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              products: (Array.isArray(section.products) ? section.products : []).filter(
                (relation) => relation.product_id !== productId
              ),
            }
          : section
      ),
    }));
  };

  const updateSectionProductOrder = (sectionIndex: number, productId: string, sortOrder: number) => {
    onChange((currentForm) => ({
      ...currentForm,
      sections: currentForm.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              products: (Array.isArray(section.products) ? section.products : []).map((relation) =>
                relation.product_id === productId ? { ...relation, sort_order: sortOrder } : relation
              ),
            }
          : section
      ),
    }));
  };

  const uploadImage = async (
    file: File | undefined,
    key: string,
    onUploaded: (url: string) => void
  ) => {
    if (!file) return;

    setUploadingKey(key);
    try {
      const publicUrl = await uploadProductImage(file, {
        folder: 'collections',
        productSlug: form.slug || form.title || 'coleccion',
      });
      onUploaded(publicUrl);
      toast.success('Imagen subida correctamente.');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.';
      toast.error(message);
    } finally {
      setUploadingKey(null);
    }
  };

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
        <label className="text-sm font-medium text-gray-700 md:col-span-2">
          Subtítulo
          <input
            value={form.subtitle}
            onChange={(event) => updateField('subtitle', event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <label className="text-sm font-medium text-gray-700 md:col-span-2">
          Descripción
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <div className="text-sm font-medium text-gray-700 md:col-span-2">
          <label>
            URL de imagen
            <input
              value={form.image_url}
              onChange={(event) => updateField('image_url', event.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              {uploadingKey === 'collection' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingKey === 'collection' ? 'Subiendo...' : 'Subir imagen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingKey === 'collection'}
                onChange={(event) => {
                  void uploadImage(event.target.files?.[0], 'collection', (url) => updateField('image_url', url));
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <span className="text-xs font-normal text-gray-500">JPG, PNG o WebP hasta 5 MB.</span>
          </div>
          {form.image_url && (
            <img
              src={form.image_url}
              alt="Vista previa de la colección"
              className="mt-3 h-28 w-28 rounded-lg border border-gray-200 object-cover"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
        <label className="text-sm font-medium text-gray-700">
          Orden
          <input
            type="number"
            value={form.sort_order}
            onChange={(event) => updateField('sort_order', Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField('is_active', event.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Activa
        </label>
      </div>

      <div className="mt-6 rounded-lg border border-emerald-100 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-semibold text-gray-800">Secciones de la colección</h4>
            <p className="text-xs text-gray-500">Cada sección puede tener productos existentes asociados.</p>
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
            Esta colección todavía no tiene secciones.
          </div>
        ) : (
          <div className="space-y-4">
            {form.sections.map((section, index) => {
              const productQuery = normalizeSearchText(productSearchBySection[index] ?? '');
              const relatedProductIds = new Set(section.products.map((relation) => relation.product_id));
              const productMatches = productOptions
                .filter((product) => !relatedProductIds.has(product.id))
                .filter((product) => !productQuery || getProductSearchText(product).includes(productQuery))
                .slice(0, 8);

              return (
                <div key={section.id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-700">Sección {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSection(index)}
                      className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                      title="Eliminar sección"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="text-xs font-medium text-gray-600">
                      Título
                      <input
                        value={section.title}
                        onChange={(event) => updateSectionTitle(index, event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Slug de sección
                      <input
                        value={section.slug || ''}
                        onChange={(event) => updateSection(index, 'slug', createSectionSlug(event.target.value))}
                        placeholder="se-genera-desde-el-titulo"
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
                    <label className="text-xs font-medium text-gray-600 md:col-span-2">
                      Descripción
                      <textarea
                        value={section.description}
                        onChange={(event) => updateSection(index, 'description', event.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                    <div className="text-xs font-medium text-gray-600 md:col-span-2">
                      <label>
                        URL de imagen
                        <input
                          value={section.image_url}
                          onChange={(event) => updateSection(index, 'image_url', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                          placeholder="https://..."
                        />
                      </label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                          {uploadingKey === `section-${index}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {uploadingKey === `section-${index}` ? 'Subiendo...' : 'Subir imagen'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={uploadingKey === `section-${index}`}
                            onChange={(event) => {
                              void uploadImage(event.target.files?.[0], `section-${index}`, (url) =>
                                updateSection(index, 'image_url', url)
                              );
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={section.is_active}
                        onChange={(event) => updateSection(index, 'is_active', event.target.checked)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Activa
                    </label>
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                    <h5 className="text-sm font-semibold text-gray-800">Productos de esta sección</h5>
                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        value={productSearchBySection[index] ?? ''}
                        onChange={(event) =>
                          setProductSearchBySection((current) => ({ ...current, [index]: event.target.value }))
                        }
                        placeholder="Buscar producto existente..."
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {productMatches.length > 0 && (
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {productMatches.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addSectionProduct(index, product)}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm hover:border-emerald-200 hover:bg-emerald-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-gray-800">{product.name}</span>
                              <span className="block truncate text-xs text-gray-500">
                                {product.price_mode === 'quote' ? 'A cotizar' : formatCurrency(product.price)} ·{' '}
                                {product.visible_in_store === false ? 'Solo colecciones' : 'Tienda'}
                              </span>
                            </span>
                            <Plus className="h-4 w-4 flex-shrink-0 text-emerald-700" />
                          </button>
                        ))}
                      </div>
                    )}
                    {section.products.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {section.products.map((relation) => {
                          const product = productOptions.find((option) => option.id === relation.product_id);

                          return (
                            <div
                              key={relation.product_id}
                              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-800">
                                  {product?.name ?? relation.product_id}
                                </p>
                                <p className="text-xs text-gray-500">{product?.orchid_type ?? 'Producto'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={relation.sort_order}
                                  onChange={(event) =>
                                    updateSectionProductOrder(index, relation.product_id, Number(event.target.value))
                                  }
                                  className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                                  aria-label="Orden"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSectionProduct(index, relation.product_id)}
                                  className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                  title="Quitar producto"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500">
                        No hay productos asociados a esta sección.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving || !form.title.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar colección
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

const AdminCollections: React.FC = () => {
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [productOptions, setProductOptions] = useState<AdminProduct[]>([]);
  const [form, setForm] = useState<ProductCollectionInput>(() => emptyProductCollectionInput());
  const [editingCollection, setEditingCollection] = useState<ProductCollection | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();
  const { confirm } = useConfirm();

  const filteredCollections = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return collections;

    return collections.filter((collection) =>
      normalizeSearchText([collection.title, collection.subtitle, collection.description].filter(Boolean).join(' ')).includes(query)
    );
  }, [collections, searchQuery]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [nextCollections, nextProducts] = await Promise.all([
        getAdminProductCollections(),
        getAdminProducts(500),
      ]);
      setCollections(nextCollections);
      setProductOptions(nextProducts);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudieron cargar las colecciones.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const startCreate = () => {
    setEditingCollection(null);
    setForm(emptyProductCollectionInput());
    setIsCreating(true);
  };

  const startEdit = (collection: ProductCollection) => {
    setEditingCollection(collection);
    setForm(productCollectionToInput(collection));
    setIsCreating(false);
  };

  const cancelForm = () => {
    setEditingCollection(null);
    setIsCreating(false);
    setForm(emptyProductCollectionInput());
  };

  const saveCollection = async () => {
    setIsSaving(true);
    setError('');

    try {
      if (editingCollection) {
        await updateProductCollection(editingCollection.id, form);
      } else {
        await createProductCollection(form);
      }

      cancelForm();
      await loadData();
      toast.success('Colección guardada correctamente.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'No se pudo guardar la colección.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeCollection = async (collection: ProductCollection) => {
    const confirmed = await confirm({
      title: 'Eliminar colección',
      message: `¿Querés eliminar "${collection.title}"? También se eliminarán sus secciones y relaciones con productos.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });

    if (!confirmed) return;

    setIsSaving(true);
    setError('');

    try {
      await deleteProductCollection(collection.id);
      await loadData();
      toast.success('Colección eliminada correctamente.');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la colección.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="h-16 animate-pulse bg-gray-100" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar colección..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Agregar colección
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(isCreating || editingCollection) && (
        <CollectionForm
          form={form}
          title={editingCollection ? `Editar ${editingCollection.title}` : 'Nueva colección'}
          isSaving={isSaving}
          productOptions={productOptions}
          onChange={setForm}
          onCancel={cancelForm}
          onSubmit={saveCollection}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Colección</th>
              <th className="px-4 py-3">Secciones</th>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCollections.map((collection) => (
              <tr key={collection.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{collection.title}</div>
                  <div className="max-w-md truncate text-xs text-gray-500">{collection.subtitle || collection.description}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{collection.sections?.length ?? 0}</td>
                <td className="px-4 py-3 text-gray-700">{collection.sort_order}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                      collection.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {collection.is_active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {collection.is_active ? 'Visible' : 'Oculta'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(collection)}
                      className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                      title="Editar colección"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeCollection(collection)}
                      disabled={isSaving}
                      className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      title="Eliminar colección"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCollections.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No hay colecciones para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCollections;
