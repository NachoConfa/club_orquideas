import React, { useEffect, useState } from 'react';
import { ArrowLeft, Layers3, RefreshCw } from '../lib/icons';
import { useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { getActiveProductCollections } from '../services/collectionService';
import type { ProductCollection } from '../types/collection';

interface CollectionsPageProps {
  onBack: () => void;
}

const CollectionsPage: React.FC<CollectionsPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCollections = async () => {
    setIsLoading(true);
    setError('');

    try {
      setCollections(await getActiveProductCollections());
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Error cargando colecciones:', loadError);
      }
      setError('No pudimos cargar las colecciones. Intentá nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCollections();
  }, []);

  return (
    <main className="min-h-[70vh] bg-[#FFF8EF] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0F8F61] hover:text-[#0C7A52]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </button>

        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#D96C9F]">
            Selecciones especiales
          </p>
          <h1 className="text-3xl font-semibold text-[#16352B] sm:text-4xl">Colecciones especiales</h1>
          <p className="mt-3 leading-7 text-[#6B756F]">
            Ideas seleccionadas para regalos, ambientaciones, celebraciones y proyectos especiales.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm">
                <div className="h-56 animate-pulse bg-[#F8EFE3]" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
                  <div className="h-4 w-full animate-pulse rounded bg-[#F1E3D4]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#16352B]">{error}</h2>
            <button
              type="button"
              onClick={() => void loadCollections()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F8F61] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0C7A52]"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EADBC8] bg-white px-6 py-12 text-center shadow-sm">
            <Layers3 className="mx-auto h-12 w-12 text-[#0F8F61]" />
            <h2 className="mt-4 text-xl font-semibold text-[#16352B]">Todavía no hay colecciones activas.</h2>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => navigate(`/colecciones/${collection.slug}`)}
                className="group overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0F8F61]"
              >
                <div className="aspect-[4/3] bg-[#F8EFE3]">
                  <ProductImage
                    src={collection.image_url || ''}
                    alt={collection.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    fallbackClassName="aspect-[4/3]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="space-y-3 p-5">
                  <span className="rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
                    Colección
                  </span>
                  <h2 className="text-xl font-semibold text-[#16352B] group-hover:text-[#0F8F61]">
                    {collection.title}
                  </h2>
                  {(collection.subtitle || collection.description) && (
                    <p className="line-clamp-3 whitespace-pre-line leading-6 text-[#6B756F]">
                      {collection.subtitle || collection.description}
                    </p>
                  )}
                  <span className="inline-flex rounded-full bg-[#0F8F61] px-4 py-2 text-sm font-semibold text-white">
                    Ver colección
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default CollectionsPage;
