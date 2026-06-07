import React, { useEffect, useState } from 'react';
import { ArrowLeft, PartyPopper, RefreshCw } from '../lib/icons';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { getActiveEvents } from '../services/eventService';
import type { StoreEvent } from '../types/event';

interface EventsPageProps {
  onBack: () => void;
}

const EventsSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm">
        <div className="aspect-[4/3] animate-pulse bg-[#F8EFE3]" />
        <div className="space-y-3 p-5">
          <div className="h-5 w-2/3 animate-pulse rounded bg-[#F1E3D4]" />
          <div className="h-3 w-full animate-pulse rounded bg-[#F1E3D4]" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-[#F1E3D4]" />
        </div>
      </div>
    ))}
  </div>
);

const EventsPage: React.FC<EventsPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvents = async () => {
    setIsLoading(true);
    setError('');

    try {
      const activeEvents = await getActiveEvents();
      setEvents(activeEvents);
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.error('Error cargando charlas:', loadError);
      }
      setError('No pudimos cargar las charlas. Intentá nuevamente.');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
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
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
            <PartyPopper className="h-4 w-4" />
            Encuentros y propuestas
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-[#16352B] sm:text-4xl">Charlas</h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#6B756F]">
            Actividades, talleres y propuestas especiales para conectar con las plantas y la naturaleza.
          </p>
        </section>

        {isLoading ? (
          <EventsSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-[#F1E3D4] bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#16352B]">{error}</h2>
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0F8F61] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0C7A52]"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onOpen={(selectedEvent) => navigate(`/eventos/${selectedEvent.slug}`)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#EADBC8] bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#16352B]">Todavía no hay charlas cargadas.</h2>
            <p className="mt-2 text-[#6B756F]">Pronto vamos a sumar nuevas propuestas de Modo Plantas.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default EventsPage;
