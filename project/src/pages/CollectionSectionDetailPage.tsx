import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CollectionProductCard from '../components/CollectionProductCard';
import LinkifiedText from '../components/LinkifiedText';
import ProductImage from '../components/ProductImage';
import { ArrowLeft, Layers3, RefreshCw } from '../lib/icons';
import { getActiveProductCollectionSectionBySlug } from '../services/collectionService';
import type {
  CollectionRelatedProduct,
  ProductCollection,
  ProductCollectionSection,
} from '../types/collection';

const createProductSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const CollectionSectionDetailPage = () => {
  const { collectionSlug, sectionSlug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<ProductCollection | null>(null);
  const [section, setSection] = useState<ProductCollectionSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSection = async () => {
    if (!collectionSlug || !sectionSlug) {
      setError('No encontramos esta sección.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await getActiveProductCollectionSectionBySlug(collectionSlug, sectionSlug);
      setCollection(result?.collection ?? null);
      setSection(result?.section ?? null);

      if (!result) {
        setError('No encontramos esta sección.');
      }
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Error cargando sección de colección:', loadError);
      }
      setError('No pudimos cargar esta sección. Intentá nuevamente.');
      setCollection(null);
      setSection(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSection();
  }, [collectionSlug, sectionSlug]);

  const openProduct = (product: CollectionRelatedProduct) => {
    const slug = product.slug?.trim() || createProductSlug(product.name) || `producto-${product.id}`;
    navigate(`/producto/${slug}`);
  };

  const products = (section?.products ?? [])
    .filter((relation) => relation.product)
    .map((relation) => relation.product!);
  const sectionImageUrl = section?.image_url?.trim() ?? '';
  const hasSectionImage = sectionImageUrl.length > 0;

  return (
    <main className="min-h-[70vh] bg-[#FFF8EF] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate(collection ? `/colecciones/${collection.slug}` : '/colecciones')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0F8F61] hover:text-[#0C7A52]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la colección
        </button>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-[4/3] animate-pulse rounded-[28px] bg-[#F8EFE3]" />
            <div className="space-y-4 rounded-[28px] border border-[#F1E3D4] bg-white p-6">
              <div className="h-8 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
              <div className="h-4 w-full animate-pulse rounded bg-[#F1E3D4]" />
            </div>
          </div>
        ) : error || !collection || !section ? (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white px-6 py-12 text-center shadow-sm">
            <Layers3 className="mx-auto h-12 w-12 text-[#0F8F61]" />
            <h1 className="mt-4 text-xl font-semibold text-[#16352B]">{error}</h1>
            <button
              type="button"
              onClick={() => void loadSection()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F8F61] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0C7A52]"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            <section
              className={[
                'rounded-[32px] border border-[#F1E3D4] bg-white shadow-sm',
                hasSectionImage
                  ? 'grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)] lg:items-start'
                  : 'p-6 sm:p-8 lg:p-10',
              ].join(' ')}
            >
              {hasSectionImage && (
                <div className="flex aspect-[4/3] items-center justify-center rounded-[24px] bg-[#F8EFE3] p-4">
                  <ProductImage
                    src={sectionImageUrl}
                    alt={section.title}
                    className="h-full w-full rounded-2xl object-contain object-center"
                    fallbackClassName="h-full rounded-2xl"
                    decoding="async"
                  />
                </div>
              )}
              <div className={hasSectionImage ? 'min-w-0 p-2 sm:p-4' : 'min-w-0'}>
                <span className="inline-flex rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
                  {collection.title}
                </span>
                <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#16352B] sm:text-5xl">
                  {section.title}
                </h1>
                {section.description && (
                  <LinkifiedText
                    as="div"
                    text={section.description}
                    className="mt-6 whitespace-pre-line text-base leading-8 text-[#4B5A52]"
                  />
                )}
              </div>
            </section>

            {products.length > 0 && (
              <section>
                <div className="mb-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0F8F61]">
                    Selección
                  </span>
                  <h2 className="mt-2 text-3xl font-semibold text-[#16352B]">Productos relacionados</h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <CollectionProductCard key={product.id} product={product} onOpen={openProduct} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default CollectionSectionDetailPage;
