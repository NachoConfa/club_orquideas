import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Layers3, RefreshCw } from '../lib/icons';
import LinkifiedText from '../components/LinkifiedText';
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

const getRelatedProductDescription = (product: CollectionRelatedProduct) =>
  (product.description ?? '').trim();

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
}> = ({ product, onOpen }) => {
  const description = getRelatedProductDescription(product);

  return (
    <article className="group flex h-full w-full max-w-[390px] flex-col overflow-hidden rounded-[22px] border border-[#F1E3D4] bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#16352B]/10">
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="block text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0F8F61]"
        aria-label={`Ver producto ${product.name}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-[22px] bg-[#F8EFE3]">
          <ProductImage
            src={getRelatedProductImage(product)}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            fallbackClassName="h-full"
            loading="lazy"
            decoding="async"
          />
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <span className="inline-flex rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
            {product.orchid_type || 'Producto'}
          </span>
          <h4 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug text-[#16352B] transition-colors group-hover:text-[#0F8F61]">
            {product.name}
          </h4>
        </div>

        {description && (
          <LinkifiedText as="p" text={description} className="line-clamp-3 text-sm leading-6 text-[#6B756F]" />
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#F1E3D4] pt-3">
          <div>
            <span className="block text-xs font-medium text-[#6B756F]">Precio</span>
            <span className="text-xl font-bold text-[#16352B]">{getRelatedProductPriceLabel(product)}</span>
          </div>
          <span className="rounded-full bg-[#FFF8EF] px-3 py-1 text-xs font-semibold text-[#6B756F]">
            {getRelatedProductAvailabilityLabel(product)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpen(product)}
          className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-[#0F8F61] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0C7A52] focus:outline-none focus:ring-2 focus:ring-[#0F8F61] focus:ring-offset-2"
        >
          Ver producto
        </button>
      </div>
    </article>
  );
};

const CollectionSectionCard: React.FC<{
  section: ProductCollectionSection;
  onOpenProduct: (product: CollectionRelatedProduct) => void;
}> = ({ section, onOpenProduct }) => {
  const sectionProducts = (section.products ?? []).filter((relation) => relation.product);

  return (
    <section className="rounded-[28px] border border-[#F1E3D4] bg-white/80 p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0F8F61]">
            Selección
          </span>
          <h3 className="mt-2 text-2xl font-semibold text-[#16352B]">{section.title}</h3>
          {section.description && (
            <LinkifiedText
              as="p"
              text={section.description}
              className="mt-2 max-w-3xl leading-7 text-[#6B756F]"
            />
          )}
        </div>
        {section.image_url && (
          <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-[#F1E3D4] bg-[#F8EFE3] sm:w-36">
            <img
              src={section.image_url}
              alt={section.title}
              className="aspect-[4/3] h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
      </div>

      {sectionProducts.length > 0 && (
        <div className="grid justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sectionProducts.map((relation) => (
            <CollectionProductCard key={relation.id} product={relation.product!} onOpen={onOpenProduct} />
          ))}
        </div>
      )}
    </section>
  );
};

const CollectionDetailPage: React.FC<CollectionDetailPageProps> = ({ onBack }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<ProductCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const activeSections = useMemo(() => collection?.sections ?? [], [collection]);
  const hasProducts = useMemo(
    () => activeSections.some((section) => (section.products ?? []).some((relation) => relation.product)),
    [activeSections]
  );

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
            <div className="aspect-[4/3] animate-pulse rounded-[28px] bg-[#F8EFE3]" />
            <div className="space-y-4 rounded-[28px] border border-[#F1E3D4] bg-white p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-[#E8F7EF]" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
              <div className="h-4 w-full animate-pulse rounded bg-[#F1E3D4]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[#F1E3D4]" />
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
          <div className="space-y-10">
            <section className="grid gap-6 rounded-[32px] border border-[#F1E3D4] bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-center">
              <div className="overflow-hidden rounded-[24px] bg-[#F8EFE3]">
                <ProductImage
                  src={collection.image_url || ''}
                  alt={collection.title}
                  className="aspect-[4/3] h-full w-full object-cover object-center"
                  fallbackClassName="aspect-[4/3]"
                  decoding="async"
                />
              </div>

              <div className="min-w-0 p-2 sm:p-5">
                <span className="inline-flex rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
                  Colección especial
                </span>
                <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#16352B] sm:text-5xl">
                  {collection.title}
                </h1>
                {collection.subtitle && (
                  <LinkifiedText
                    as="p"
                    text={collection.subtitle}
                    className="mt-4 text-lg leading-8 text-[#4B5A52]"
                  />
                )}
                {collection.description && (
                  <LinkifiedText
                    as="div"
                    text={collection.description}
                    className="mt-6 rounded-2xl border border-[#F1E3D4] bg-[#FFF8EF] p-5 leading-7 text-[#4B5A52]"
                  />
                )}
                <a
                  href="#productos-coleccion"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0F8F61] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0C7A52] focus:outline-none focus:ring-2 focus:ring-[#0F8F61] focus:ring-offset-2"
                >
                  Ver productos
                </a>
              </div>
            </section>

            <section id="productos-coleccion" className="scroll-mt-28">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0F8F61]">
                    Catálogo
                  </span>
                  <h2 className="mt-2 text-3xl font-semibold text-[#16352B]">
                    Productos de esta colección
                  </h2>
                </div>
                {hasProducts && (
                  <p className="text-sm text-[#6B756F]">
                    Selecciones pensadas para esta propuesta.
                  </p>
                )}
              </div>

              {hasProducts ? (
                <div className="space-y-6">
                  {activeSections.map((section) =>
                    (section.products ?? []).some((relation) => relation.product) ? (
                      <CollectionSectionCard
                        key={section.id}
                        section={section}
                        onOpenProduct={openRelatedProduct}
                      />
                    ) : null
                  )}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-[#EADBC8] bg-white px-6 py-12 text-center shadow-sm">
                  <Layers3 className="mx-auto h-12 w-12 text-[#0F8F61]" />
                  <h3 className="mt-4 text-xl font-semibold text-[#16352B]">
                    Todavía no hay productos publicados en esta colección.
                  </h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6B756F]">
                    Mientras tanto, podés recorrer el catálogo general de Modo Plantas.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0F8F61] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0C7A52]"
                  >
                    Ver todos los productos
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default CollectionDetailPage;
