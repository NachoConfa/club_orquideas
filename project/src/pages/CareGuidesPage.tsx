import React, { useEffect, useState } from 'react';
import { ArrowLeft, Leaf, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CareGuideCard from '../components/CareGuideCard';
import { getActiveCareGuides } from '../services/careGuideService';
import type { CareGuide } from '../types/careGuide';

interface CareGuidesPageProps {
  onBack: () => void;
}

const CareGuidesSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm">
        <div className="aspect-[4/3] animate-pulse bg-[#F8EFE3]" />
        <div className="space-y-3 p-5">
          <div className="h-3 w-24 animate-pulse rounded bg-[#E8F7EF]" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
          <div className="h-3 w-full animate-pulse rounded bg-[#F1E3D4]" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-[#F1E3D4]" />
        </div>
      </div>
    ))}
  </div>
);

const CareGuidesPage: React.FC<CareGuidesPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [guides, setGuides] = useState<CareGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGuides = async () => {
    setIsLoading(true);
    setError('');

    try {
      const activeGuides = await getActiveCareGuides();
      setGuides(activeGuides);
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Error cargando cuidados:', loadError);
      }
      setError('No pudimos cargar los cuidados. Intentá nuevamente.');
      setGuides([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGuides();
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

        <section className="mb-8 rounded-3xl border border-[#F1E3D4] bg-white/80 px-6 py-8 shadow-sm sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
                <Leaf className="h-4 w-4" />
                Guías prácticas
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-[#16352B] sm:text-4xl">Cuidados</h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#6B756F]">
                Consejos simples para acompañar tus plantas, entender sus necesidades y mantenerlas saludables.
              </p>
            </div>
          </div>
        </section>

        {isLoading ? (
          <CareGuidesSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#16352B]">{error}</h2>
            <button
              type="button"
              onClick={() => void loadGuides()}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0F8F61] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0C7A52]"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        ) : guides.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <CareGuideCard
                key={guide.id}
                guide={guide}
                onOpen={(selectedGuide) => navigate(`/cuidados/${selectedGuide.slug}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#EADBC8] bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#16352B]">Todavía no hay cuidados cargados.</h2>
            <p className="mt-2 text-[#6B756F]">Pronto vamos a sumar guías para ayudarte a cuidar tus plantas.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default CareGuidesPage;
