import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Layers3, RefreshCw } from '../lib/icons';
import { useNavigate, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { getActiveProductCollectionBySlug } from '../services/collectionService';
import type {
  CollectionRelatedProduct,
  ProductCollection,
  ProductCollectionSection,
} from '../types/collection';

interface CollectionDetailPageProps {
  onBack: () => void;
}

const createProductSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getRelatedProductSlug = (product: CollectionRelatedProduct) =>
  product.slug?.trim() || createProductSlug(product.name) || `producto-${product.id}`;

const formatPrice = (value: number) => `$${value.toLocaleString('es-AR')}`;

const getRelatedProductPrice = (product: CollectionRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);
  const prices = activeVariants
    .filter((variant) => variant.price_mode !== 'quote')
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price));

  return prices.length > 0 ? Math.min(...prices) : Number(product.price || 0);
};

const getRelatedProductPriceLabel = (product: CollectionRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);
  const requiresQuote =
    activeVariants.length > 0
      ? activeVariants.every((variant) => variant.price_mode === 'quote')
      : product.price_mode === 'quote';

  return requiresQuote ? 'A cotizar' : formatPrice(getRelatedProductPrice(product));
};

const getRelatedProductImage = (product: CollectionRelatedProduct) =>
  product.image_url || (product.variants ?? []).find((variant) => variant.image_url)?.image_url || '';

const getRelatedProductAvailabilityLabel = (product: CollectionRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);

  if (activeVariants.length > 0) {
    if (activeVariants.every((variant) => variant.price_mode === 'quote')) return 'Cotización personalizada';
    if (activeVariants.every((variant) => variant.stock_mode === 'consult')) return 'Consultar disponibilidad';
    return activeVariants.some((variant) => variant.stock_mode !== 'consult' && Number(variant.stock) > 0)
      ? 'Disponible'
      : 'Sin stock';
  }

  if (product.price_mode === 'quote') return 'Cotización personalizada';
  if (product.stock_mode === 'consult') return 'Consultar disponibilidad';
  return Number(product.stock) > 0 ? 'Disponible' : 'Sin stock';
};

const CollectionProductCard: React.FC<{
  product: CollectionRelatedProduct;
  onOpen: (product: CollectionRelatedProduct) => void;
}> = ({ product, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(product)}
    className="group overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0F8F61]"
  >
    <div className="relative aspect-[4/3] bg-[#F8EFE3]">
      <ProductImage
        src={getRelatedProductImage(product)}
        alt={product.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        fallbackClassName="aspect-[4/3]"
        loading="lazy"
        decoding="async"
      />
    </div>
    <div className="space-y-2 p-4">
      <span className="rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
        {product.orchid_type || 'Producto'}
      </span>
      <h4 className="line-clamp-2 text-base font-semibold text-[#16352B] group-hover:text-[#0F8F61]">
        {product.name}
      </h4>
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-bold text-[#16352B]">{getRelatedProductPriceLabel(product)}</span>
        <span className="text-xs text-[#6B756F]">{getRelatedProductAvailabilityLabel(product)}</span>
      </div>
    </div>
  </button>
);

const CollectionSectionCard: React.FC<{
  section: ProductCollectionSection;
  onOpenProduct: (product: CollectionRelatedProduct) => void;
}> = ({ section, onOpenProduct }) => (
  <article className="overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm">
    {section.image_url && (
      <img
        src={section.image_url}
        alt={section.title}
        className="h-52 w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    )}
    <div className="p-5">
      <h3 className="text-xl font-semibold text-[#16352B]">{section.title}</h3>
      {section.description && (
        <p className="mt-2 whitespace-pre-line leading-7 text-[#6B756F]">{section.description}</p>
      )}
      {section.products && section.products.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {section.products.map((relation) =>
            relation.product ? (
              <CollectionProductCard key={relation.id} product={relation.product} onOpen={onOpenProduct} />
            ) : null
          )}
        </div>
      )}
    </div>
  </article>
);

const CollectionDetailPage: React.FC<CollectionDetailPageProps> = ({ onBack }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<ProductCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const activeSections = useMemo(() => collection?.sections ?? [], [collection]);

  const loadCollection = async () => {
    if (!slug) {
      setError('No encontramos esta colección.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const activeCollection = await getActiveProductCollectionBySlug(slug);
      setCollection(activeCollection);
      if (!activeCollection) {
        setError('No encontramos esta colección.');
      }
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Error cargando colección:', loadError);
      }
      setError('No pudimos cargar esta colección. Intentá nuevamente.');
      setCollection(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCollection();
  }, [slug]);

  const openRelatedProduct = (product: CollectionRelatedProduct) => {
    navigate(`/producto/${getRelatedProductSlug(product)}`);
  };

  return (
    <main className="min-h-[70vh] bg-[#FFF8EF] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0F8F61] hover:text-[#0C7A52]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a colecciones
        </button>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.75fr)]">
            <div className="aspect-[4/3] animate-pulse rounded-3xl bg-[#F8EFE3]" />
            <div className="space-y-4 rounded-3xl border border-[#F1E3D4] bg-white p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-[#E8F7EF]" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
              <div className="h-4 w-full animate-pulse rounded bg-[#F1E3D4]" />
            </div>
          </div>
        ) : error || !collection ? (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white px-6 py-12 text-center shadow-sm">
            <Layers3 className="mx-auto h-12 w-12 text-[#0F8F61]" />
            <h1 className="mt-4 text-xl font-semibold text-[#16352B]">
              {error || 'No encontramos esta colección.'}
            </h1>
            <button
              type="button"
              onClick={() => void loadCollection()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F8F61] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0C7A52]"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
              <div className="overflow-hidden rounded-3xl border border-[#F1E3D4] bg-[#F8EFE3] shadow-sm">
                <ProductImage
                  src={collection.image_url || ''}
                  alt={collection.title}
                  className="max-h-[70vh] w-full object-contain"
                  fallbackClassName="aspect-[4/3]"
                  decoding="async"
                />
              </div>

              <div className="rounded-3xl border border-[#F1E3D4] bg-white p-6 shadow-sm sm:p-8">
                <span className="inline-flex rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
                  Colección especial
                </span>
                <h1 className="mt-5 text-3xl font-semibold leading-tight text-[#16352B] sm:text-4xl">
                  {collection.title}
                </h1>
                {collection.subtitle && (
                  <p className="mt-3 whitespace-pre-line leading-7 text-[#6B756F]">{collection.subtitle}</p>
                )}
                {collection.description && (
                  <div className="mt-6 whitespace-pre-line rounded-2xl bg-[#FFF8EF] p-5 leading-7 text-[#4B5A52]">
                    {collection.description}
                  </div>
                )}
              </div>
            </section>

            {activeSections.length > 0 ? (
              <section>
                <h2 className="mb-4 text-2xl font-semibold text-[#16352B]">Productos de esta colección</h2>
                <div className="grid gap-5">
                  {activeSections.map((section) => (
                    <CollectionSectionCard key={section.id} section={section} onOpenProduct={openRelatedProduct} />
                  ))}
                </div>
              </section>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#EADBC8] bg-white px-6 py-10 text-center text-[#6B756F]">
                Esta colección todavía no tiene secciones activas.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default CollectionDetailPage;
