import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Leaf, MessageCircle, RefreshCw } from '../lib/icons';
import { useNavigate, useParams } from 'react-router-dom';
import LinkifiedText from '../components/LinkifiedText';
import { getActiveCareGuideBySlug } from '../services/careGuideService';
import type { CareGuide, CareGuideVariant } from '../types/careGuide';

interface CareGuideDetailPageProps {
  onBack: () => void;
}

const WHATSAPP_NUMBER = '5491122906442';

const careDetailFields: Array<{ key: keyof CareGuide; label: string; icon: string }> = [
  { key: 'light', label: 'Iluminación', icon: '☀️' },
  { key: 'watering', label: 'Riego', icon: '💧' },
  { key: 'temperature', label: 'Temperatura', icon: '🌡️' },
  { key: 'humidity', label: 'Humedad', icon: '🌿' },
  { key: 'fertilization', label: 'Fertilización', icon: '🌱' },
  { key: 'transplant', label: 'Trasplante', icon: '🪴' },
  { key: 'flowering', label: 'Floración', icon: '🌸' },
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
  <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
    <div className="aspect-[4/3] animate-pulse rounded-[28px] bg-[#F8EFE3]" />
    <div className="space-y-4 rounded-[28px] border border-[#F1E3D4] bg-white p-6">
      <div className="h-4 w-24 animate-pulse rounded bg-[#E8F7EF]" />
      <div className="h-9 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
      <div className="h-4 w-full animate-pulse rounded bg-[#F1E3D4]" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-[#F1E3D4]" />
    </div>
  </div>
);

const CareGuideDetailPage: React.FC<CareGuideDetailPageProps> = ({ onBack }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<CareGuide | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedVariant = useMemo(
    () => guide?.variants?.find((variant) => variant.id === selectedVariantId) ?? null,
    [guide, selectedVariantId]
  );

  const activeImage = selectedVariant?.image_url || guide?.image_url || '';
  const activeTitle = selectedVariant?.title || guide?.title || 'Orquídeas Phalaenopsis';
  const activeSubtitle =
    selectedVariant?.subtitle ||
    guide?.subtitle ||
    guide?.category ||
    'Cuidados esenciales para que vuelvan a florecer';
  const activeDescription =
    selectedVariant?.description ||
    guide?.description ||
    'Una guía práctica para entender la luz, el riego, la humedad y los pequeños detalles que ayudan a que tus orquídeas se mantengan sanas.';
  const activeTips = selectedVariant?.special_tips?.length ? selectedVariant.special_tips : guide?.special_tips ?? [];
  const detailCards = guide
    ? careDetailFields
        .map((field) => ({ ...field, value: getVariantValue(guide, selectedVariant, field.key) }))
        .filter((field) => field.value && !Array.isArray(field.value))
    : [];

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
    <main className="min-h-[70vh] overflow-x-hidden bg-[#FFF8EF] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1240px]">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0F8F61] transition-colors hover:text-[#0C7A52]"
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
          <div className="space-y-8 sm:space-y-10">
            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-start">
              <div className="min-w-0 self-start rounded-[28px] border border-[#F1E3D4] bg-[#F8EFE3] p-3 shadow-sm sm:p-4">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={activeTitle}
                    className="mx-auto block h-auto w-full max-w-full rounded-[22px] object-contain"
                    decoding="async"
                  />
                ) : (
                  <div className="flex aspect-[4/3] min-h-[300px] items-center justify-center rounded-[22px] bg-white/50 text-[#0F8F61]">
                    <Leaf className="h-16 w-16" />
                  </div>
                )}
              </div>

              <article className="flex min-w-0 flex-col justify-between rounded-[28px] border border-[#F1E3D4] bg-white/95 p-6 shadow-sm sm:p-8">
                <div>
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

                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider sm:tracking-[0.24em] text-[#0F8F61]">
                    Guía de cuidados
                  </p>
                  <h1 className="text-3xl font-semibold leading-tight text-[#16352B] sm:text-4xl lg:text-5xl">
                    {guide.title || 'Orquídeas Phalaenopsis'}
                  </h1>
                  <LinkifiedText
                    as="p"
                    text={guide.subtitle || 'Cuidados esenciales para que vuelvan a florecer'}
                    className="mt-4 text-lg leading-7 text-[#4B5A52]"
                  />

                  <div className="mt-6 rounded-2xl border border-[#F1E3D4] bg-[#FFF8EF] p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0F8F61]">
                      Cómo acompañarlas
                    </h2>
                    <LinkifiedText
                      as="p"
                      text={activeDescription}
                      className="mt-3 text-base leading-7 text-[#4B5A52]"
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[#D2EBDD] bg-[#E8F7EF] p-5">
                  <p className="text-sm font-semibold uppercase tracking-wider sm:tracking-[0.16em] text-[#0F8F61]">Confianza</p>
                  <p className="mt-2 text-lg font-semibold leading-7 text-[#16352B]">
                    Más de 10 años acompañando a amantes de las orquídeas en Nordelta y Buenos Aires.
                  </p>
                </div>
              </article>
            </section>

            {guide.variants && guide.variants.length > 0 && (
              <section className="rounded-[28px] border border-[#F1E3D4] bg-white/90 p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider sm:tracking-[0.18em] text-[#0F8F61]">
                      Secciones
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-[#16352B]">Elegí el tema que querés leer</h2>
                  </div>
                  <p className="text-sm text-[#6B756F]">La imagen y la descripción se actualizan según la sección.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {guide.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                        selectedVariant?.id === variant.id
                          ? 'border-[#0F8F61] bg-[#E8F7EF] text-[#16352B] shadow-sm'
                          : 'border-[#F1E3D4] bg-[#FFFCF7] text-[#4B5A52] hover:border-[#0F8F61]/50 hover:bg-[#F4FBF7]'
                      }`}
                    >
                      <span className="font-semibold">{variant.title}</span>
                      {variant.subtitle && (
                        <LinkifiedText
                          as="span"
                          text={variant.subtitle}
                          className="mt-1 block text-sm leading-6 text-[#6B756F]"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider sm:tracking-[0.18em] text-[#0F8F61]">
                  Cuidados esenciales
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[#16352B]">Qué necesita tu orquídea</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {detailCards.map(({ key, label, icon, value }) => (
                  <article
                    key={key}
                    className="flex h-full flex-col rounded-[22px] border border-[#F1E3D4] bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F7EF] text-xl">
                        {icon}
                      </span>
                      <h3 className="text-lg font-semibold text-[#16352B]">{label}</h3>
                    </div>
                    <LinkifiedText as="p" text={String(value)} className="text-sm leading-7 text-[#4B5A52]" />
                  </article>
                ))}
              </div>
            </section>

            {activeTips.length > 0 && (
              <section className="rounded-[28px] border border-[#D2EBDD] bg-[#E8F7EF] p-6 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider sm:tracking-[0.18em] text-[#0F8F61]">
                  Consejos especiales
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#16352B]">Detalles que hacen la diferencia</h2>
                <ul className="mt-5 grid gap-3 text-sm leading-6 text-[#4B5A52] md:grid-cols-2">
                  {activeTips.map((tip) => (
                    <li key={tip} className="flex gap-3 rounded-2xl bg-white/70 p-4">
                      <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#0F8F61]" />
                      <LinkifiedText as="span" text={tip} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-[30px] border border-[#F1E3D4] bg-[#16352B] p-6 text-white shadow-sm sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wider sm:tracking-[0.18em] text-[#CFE3D4]">
                  Acompañamiento personalizado
                </p>
                <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                  ¿Querés aprender a cuidar tu orquídea según tu casa y tu clima?
                </h2>
                <p className="mt-3 leading-7 text-[#FFF8EF]/80">
                  Podemos orientarte con una charla de cuidados o recomendarte productos adecuados para tu espacio.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-shrink-0">
                <a
                  href={buildWhatsAppUrl(guide, selectedVariant)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F8F61] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#0C7A52]"
                >
                  <MessageCircle className="h-5 w-5" />
                  Consultar charla de cuidados
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/orquideas')}
                  className="rounded-full border border-white/25 bg-white/10 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Ver productos recomendados
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default CareGuideDetailPage;
