import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Leaf, MessageCircle, RefreshCw } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getActiveCareGuideBySlug } from '../services/careGuideService';
import type { CareGuide, CareGuideVariant } from '../types/careGuide';

interface CareGuideDetailPageProps {
  onBack: () => void;
}

const WHATSAPP_NUMBER = '5491122906442';

const careDetailFields: Array<{ key: keyof CareGuide; label: string }> = [
  { key: 'light', label: 'Iluminación' },
  { key: 'watering', label: 'Riego' },
  { key: 'temperature', label: 'Temperatura' },
  { key: 'humidity', label: 'Humedad' },
  { key: 'fertilization', label: 'Fertilización' },
  { key: 'transplant', label: 'Trasplante' },
  { key: 'flowering', label: 'Floración' },
];

const getVariantValue = (guide: CareGuide, variant: CareGuideVariant | null, key: keyof CareGuide) => {
  if (!variant) {
    return guide[key];
  }

  const variantValue = variant[key as keyof CareGuideVariant];
  return variantValue || guide[key];
};

const buildWhatsAppUrl = (guide: CareGuide, variant: CareGuideVariant | null) => {
  const message = [
    `Hola, quiero consultar sobre este cuidado: ${guide.title}`,
    variant ? `Sección: ${variant.title}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

const CareGuideDetailSkeleton = () => (
  <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.75fr)]">
    <div className="aspect-[4/3] animate-pulse rounded-3xl bg-[#F8EFE3]" />
    <div className="space-y-4 rounded-3xl border border-[#F1E3D4] bg-white p-6">
      <div className="h-4 w-24 animate-pulse rounded bg-[#E8F7EF]" />
      <div className="h-8 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
      <div className="h-4 w-full animate-pulse rounded bg-[#F1E3D4]" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-[#F1E3D4]" />
    </div>
  </div>
);

const CareGuideDetailPage: React.FC<CareGuideDetailPageProps> = ({ onBack }) => {
  const { slug } = useParams();
  const [guide, setGuide] = useState<CareGuide | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedVariant = useMemo(
    () => guide?.variants?.find((variant) => variant.id === selectedVariantId) ?? null,
    [guide, selectedVariantId]
  );

  const activeImage = selectedVariant?.image_url || guide?.image_url || '';
  const activeTitle = selectedVariant?.title || guide?.title || '';
  const activeSubtitle = selectedVariant?.subtitle || guide?.subtitle || guide?.category || '';
  const activeDescription = selectedVariant?.description || guide?.description || '';
  const activeTips = selectedVariant?.special_tips?.length ? selectedVariant.special_tips : guide?.special_tips ?? [];

  const loadGuide = async () => {
    if (!slug) {
      setError('No encontramos este cuidado.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const careGuide = await getActiveCareGuideBySlug(slug);
      setGuide(careGuide);
      setSelectedVariantId(careGuide?.variants?.[0]?.id ?? null);
      if (!careGuide) {
        setError('No encontramos este cuidado.');
      }
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Error cargando cuidado:', loadError);
      }
      setError('No pudimos cargar este cuidado. Intentá nuevamente.');
      setGuide(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGuide();
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
          Volver a cuidados
        </button>

        {isLoading ? (
          <CareGuideDetailSkeleton />
        ) : error || !guide ? (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white px-6 py-12 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-[#16352B]">{error || 'No encontramos este cuidado.'}</h1>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadGuide()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F8F61] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0C7A52]"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </button>
              <button
                type="button"
                onClick={onBack}
                className="rounded-full border border-[#F1E3D4] bg-white px-5 py-2 text-sm font-semibold text-[#16352B] hover:bg-[#E8F7EF]"
              >
                Volver a cuidados
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
            <section className="min-w-0">
              <div className="overflow-hidden rounded-3xl border border-[#F1E3D4] bg-[#F8EFE3] shadow-sm">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={activeTitle}
                    className="max-h-[70vh] w-full object-contain"
                    decoding="async"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-[#0F8F61]">
                    <Leaf className="h-16 w-16" />
                  </div>
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-3xl border border-[#F1E3D4] bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {guide.category && (
                  <span className="rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
                    {guide.category}
                  </span>
                )}
                {guide.difficulty && (
                  <span className="rounded-full border border-[#F1E3D4] px-3 py-1 text-xs font-semibold text-[#6B756F]">
                    {guide.difficulty}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-semibold leading-tight text-[#16352B] sm:text-4xl">{guide.title}</h1>
              {guide.subtitle && (
                <p className="mt-3 whitespace-pre-line leading-7 text-[#6B756F]">{guide.subtitle}</p>
              )}

              {guide.variants && guide.variants.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-[#16352B]">Secciones del cuidado</h2>
                  <div className="mt-3 grid gap-2">
                    {guide.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                          selectedVariant?.id === variant.id
                            ? 'border-[#0F8F61] bg-[#E8F7EF] text-[#16352B]'
                            : 'border-[#F1E3D4] bg-white text-[#6B756F] hover:border-[#0F8F61]/50'
                        }`}
                      >
                        <span className="font-semibold">{variant.title}</span>
                        {variant.subtitle && (
                          <span className="block whitespace-pre-line text-sm">{variant.subtitle}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-7 rounded-2xl bg-[#FFF8EF] p-5">
                <h2 className="text-xl font-semibold text-[#16352B]">{activeTitle}</h2>
                {activeSubtitle && <p className="mt-1 text-sm font-medium text-[#0F8F61]">{activeSubtitle}</p>}
                {activeDescription && (
                  <p className="mt-4 whitespace-pre-line leading-7 text-[#4B5A52]">{activeDescription}</p>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {careDetailFields.map(({ key, label }) => {
                  const value = getVariantValue(guide, selectedVariant, key);
                  if (!value || Array.isArray(value)) {
                    return null;
                  }

                  return (
                    <div key={key} className="rounded-2xl border border-[#F1E3D4] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0F8F61]">{label}</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#4B5A52]">
                        {String(value)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {activeTips.length > 0 && (
                <div className="mt-6 rounded-2xl border border-[#D2EBDD] bg-[#E8F7EF] p-5">
                  <h2 className="font-semibold text-[#16352B]">Consejos especiales</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4B5A52]">
                    {activeTips.map((tip) => (
                      <li key={tip} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0F8F61]" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href={buildWhatsAppUrl(guide, selectedVariant)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F8F61] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#0C7A52]"
              >
                <MessageCircle className="h-5 w-5" />
                Consultar sobre este cuidado
              </a>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default CareGuideDetailPage;
