import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Layers3, RefreshCw } from '../lib/icons';
import LinkifiedText from '../components/LinkifiedText';
import ProductImage from '../components/ProductImage';
import { getActiveProductCollectionBySlug } from '../services/collectionService';
import type { ProductCollection } from '../types/collection';

interface CollectionDetailPageProps {
  onBack: () => void;
}

const CollectionDetailPage: React.FC<CollectionDetailPageProps> = ({ onBack }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<ProductCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-[4/3] animate-pulse rounded-[28px] bg-[#F8EFE3]" />
            <div className="space-y-4 rounded-[28px] border border-[#F1E3D4] bg-white p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-[#E8F7EF]" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
              <div className="h-4 w-full animate-pulse rounded bg-[#F1E3D4]" />
            </div>
          </div>
        ) : error || !collection ? (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white px-6 py-12 text-center shadow-sm">
            <Layers3 className="mx-auto h-12 w-12 text-[#0F8F61]" />
            <h1 className="mt-4 text-xl font-semibold text-[#16352B]">{error}</h1>
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
                  href="#secciones-coleccion"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0F8F61] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0C7A52]"
                >
                  Ver secciones
                </a>
              </div>
            </section>

            <section id="secciones-coleccion" className="scroll-mt-28">
              <div className="mb-6">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0F8F61]">
                  Propuestas
                </span>
                <h2 className="mt-2 text-3xl font-semibold text-[#16352B]">Secciones de esta colección</h2>
              </div>

              {(collection.sections ?? []).length > 0 ? (
                <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {(collection.sections ?? []).map((section) => {
                    const productCount = (section.products ?? []).filter((relation) => relation.product).length;
                    const sectionImageUrl = section.image_url?.trim() ?? '';
                    const hasSectionImage = sectionImageUrl.length > 0;

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => navigate(`/colecciones/${collection.slug}/${section.slug}`)}
                        className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0F8F61]"
                      >
                        {hasSectionImage && (
                          <div className="aspect-[4/3] w-full overflow-hidden bg-[#F8EFE3] p-3">
                            <ProductImage
                              src={sectionImageUrl}
                              alt={section.title}
                              className="h-full w-full rounded-xl object-contain object-center transition-transform duration-500 group-hover:scale-[1.02]"
                              fallbackClassName="h-full rounded-xl"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        )}
                        <div className={`flex flex-col gap-3 ${hasSectionImage ? 'p-5' : 'p-5 sm:p-6'}`}>
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#0F8F61]">
                            {productCount === 1 ? '1 producto' : `${productCount} productos`}
                          </span>
                          <h3 className="text-xl font-semibold leading-tight text-[#16352B]">{section.title}</h3>
                          {section.description && (
                            <p className="line-clamp-3 whitespace-pre-line text-sm leading-6 text-[#6B756F]">
                              {section.description}
                            </p>
                          )}
                          <span className="inline-flex items-center gap-2 pt-1 text-sm font-semibold text-[#0F8F61]">
                            Ver sección
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-[#EADBC8] bg-white px-6 py-12 text-center shadow-sm">
                  <Layers3 className="mx-auto h-12 w-12 text-[#0F8F61]" />
                  <h3 className="mt-4 text-xl font-semibold text-[#16352B]">
                    Todavía no hay secciones publicadas en esta colección.
                  </h3>
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
