import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock, MapPin, MessageCircle, PartyPopper, RefreshCw, Users } from '../lib/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getEventStatusLabel } from '../components/EventCard';
import ProductImage from '../components/ProductImage';
import { getActiveEventBySlug } from '../services/eventService';
import type { EventRelatedProduct, EventSection, StoreEvent } from '../types/event';

interface EventDetailPageProps {
  onBack: () => void;
}

const WHATSAPP_NUMBER = '5491122906442';

const formatEventDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const buildWhatsAppUrl = (event: StoreEvent) => {
  const message =
    event.whatsapp_message?.trim() ||
    `Hola, quiero consultar por este evento: ${event.title}${event.event_date ? ` (${formatEventDate(event.event_date)})` : ''}`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

const createProductSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getRelatedProductSlug = (product: EventRelatedProduct) =>
  product.slug?.trim() || createProductSlug(product.name) || `producto-${product.id}`;

const getRelatedProductPrice = (product: EventRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);
  const prices = activeVariants
    .filter((variant) => variant.price_mode !== 'quote')
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price));

  return prices.length > 0 ? Math.min(...prices) : Number(product.price || 0);
};

const getRelatedProductPriceLabel = (product: EventRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);
  const requiresQuote =
    activeVariants.length > 0
      ? activeVariants.every((variant) => variant.price_mode === 'quote')
      : product.price_mode === 'quote';

  return requiresQuote ? 'A cotizar' : formatPrice(getRelatedProductPrice(product));
};

const getRelatedProductImage = (product: EventRelatedProduct) =>
  product.image_url || (product.variants ?? []).find((variant) => variant.image_url)?.image_url || '';

const getRelatedProductAvailabilityLabel = (product: EventRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);

  if (activeVariants.length > 0) {
    const allQuote = activeVariants.every((variant) => variant.price_mode === 'quote');
    if (allQuote) return 'Cotización personalizada';

    const allConsult = activeVariants.every((variant) => variant.stock_mode === 'consult');
    if (allConsult) return 'Consultar disponibilidad';

    const hasStock = activeVariants.some((variant) => variant.stock_mode !== 'consult' && Number(variant.stock) > 0);
    return hasStock ? 'Disponible' : 'Sin stock';
  }

  if (product.price_mode === 'quote') return 'Cotización personalizada';
  if (product.stock_mode === 'consult') return 'Consultar disponibilidad';
  return Number(product.stock) > 0 ? 'Disponible' : 'Sin stock';
};

const formatPrice = (value: number) => `$${value.toLocaleString('es-AR')}`;

const EventDetailSkeleton = () => (
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

const EventRelatedProductCard: React.FC<{
  product: EventRelatedProduct;
  onOpen: (product: EventRelatedProduct) => void;
}> = ({ product, onOpen }) => {
  const imageUrl = getRelatedProductImage(product);
  const availabilityLabel = getRelatedProductAvailabilityLabel(product);

  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="group overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0F8F61]"
    >
      <div className="relative aspect-[4/3] bg-[#F8EFE3]">
        <ProductImage
          src={imageUrl}
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
          <span className="text-xs text-[#6B756F]">{availabilityLabel}</span>
        </div>
      </div>
    </button>
  );
};

const EventSectionCard: React.FC<{
  section: EventSection;
  onOpenProduct: (product: EventRelatedProduct) => void;
}> = ({ section, onOpenProduct }) => (
  <article className="overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm">
    {section.image_url && (
      <img src={section.image_url} alt={section.title} className="h-52 w-full object-cover" loading="lazy" decoding="async" />
    )}
    <div className="p-5">
      <h3 className="text-lg font-semibold text-[#16352B]">{section.title}</h3>
      {section.description && (
        <p className="mt-2 whitespace-pre-line leading-7 text-[#6B756F]">{section.description}</p>
      )}
      {section.products && section.products.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {section.products.map((relation) =>
            relation.product ? (
              <EventRelatedProductCard
                key={relation.id}
                product={relation.product}
                onOpen={onOpenProduct}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  </article>
);

const EventDetailPage: React.FC<EventDetailPageProps> = ({ onBack }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<StoreEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const activeSections = useMemo(() => event?.sections ?? [], [event]);

  const openRelatedProduct = (product: EventRelatedProduct) => {
    navigate(`/producto/${getRelatedProductSlug(product)}`);
  };

  const loadEvent = async () => {
    if (!slug) {
      setError('No encontramos este evento.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const activeEvent = await getActiveEventBySlug(slug);
      setEvent(activeEvent);
      if (!activeEvent) {
        setError('No encontramos este evento.');
      }
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Error cargando evento:', loadError);
      }
      setError('No pudimos cargar esta charla. Intentá nuevamente.');
      setEvent(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
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
          Volver a charlas
        </button>

        {isLoading ? (
          <EventDetailSkeleton />
        ) : error || !event ? (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white px-6 py-12 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-[#16352B]">{error || 'No encontramos este evento.'}</h1>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadEvent()}
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
                Volver a charlas
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
              <section className="min-w-0">
                <div className="overflow-hidden rounded-3xl border border-[#F1E3D4] bg-[#F8EFE3] shadow-sm">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="max-h-[70vh] w-full object-contain" decoding="async" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-[#0F8F61]">
                      <PartyPopper className="h-16 w-16" />
                    </div>
                  )}
                </div>
              </section>

              <section className="min-w-0 rounded-3xl border border-[#F1E3D4] bg-white p-6 shadow-sm sm:p-8">
                <span className="inline-flex rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
                  {getEventStatusLabel(event.status)}
                </span>
                <h1 className="mt-5 text-3xl font-semibold leading-tight text-[#16352B] sm:text-4xl">{event.title}</h1>
                {event.short_description && (
                  <p className="mt-3 whitespace-pre-line leading-7 text-[#6B756F]">
                    {event.short_description}
                  </p>
                )}

                <div className="mt-6 grid gap-3">
                  {event.event_date && (
                    <div className="flex items-center gap-3 rounded-2xl border border-[#F1E3D4] bg-[#FFF8EF] p-4">
                      <CalendarDays className="h-5 w-5 text-[#0F8F61]" />
                      <span>{formatEventDate(event.event_date)}</span>
                    </div>
                  )}
                  {event.event_time && (
                    <div className="flex items-center gap-3 rounded-2xl border border-[#F1E3D4] bg-[#FFF8EF] p-4">
                      <Clock className="h-5 w-5 text-[#0F8F61]" />
                      <span>{event.event_time}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-3 rounded-2xl border border-[#F1E3D4] bg-[#FFF8EF] p-4">
                      <MapPin className="h-5 w-5 text-[#0F8F61]" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {(event.modality || event.capacity) && (
                    <div className="flex items-center gap-3 rounded-2xl border border-[#F1E3D4] bg-[#FFF8EF] p-4">
                      <Users className="h-5 w-5 text-[#0F8F61]" />
                      <span>{[event.modality, event.capacity].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                </div>

                {event.description && (
                  <div className="mt-6 whitespace-pre-line rounded-2xl bg-[#FFF8EF] p-5 leading-7 text-[#4B5A52]">
                    {event.description}
                  </div>
                )}

                <a
                  href={buildWhatsAppUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F8F61] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#0C7A52]"
                >
                  <MessageCircle className="h-5 w-5" />
                  Consultar por este evento
                </a>
              </section>
            </div>

            {activeSections.length > 0 && (
              <section>
                <h2 className="mb-4 text-2xl font-semibold text-[#16352B]">Más información</h2>
                <div className="grid gap-5">
                  {activeSections.map((section) => (
                    <EventSectionCard key={section.id} section={section} onOpenProduct={openRelatedProduct} />
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

export default EventDetailPage;
