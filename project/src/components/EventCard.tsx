import React from 'react';
import { ArrowRight, CalendarDays, MapPin, PartyPopper } from 'lucide-react';
import type { StoreEvent } from '../types/event';

interface EventCardProps {
  event: StoreEvent;
  onOpen: (event: StoreEvent) => void;
}

export const getEventStatusLabel = (status?: string | null) => {
  if (status === 'available') return 'Disponible';
  if (status === 'finished') return 'Finalizado';
  return 'Próximamente';
};

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

const EventCard: React.FC<EventCardProps> = ({ event, onOpen }) => {
  const statusLabel = getEventStatusLabel(event.status);

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <button type="button" onClick={() => onOpen(event)} className="block w-full text-left">
        <div className="relative aspect-[4/3] bg-[#F8EFE3]">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#0F8F61]">
              <PartyPopper className="h-12 w-12" />
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#0F8F61] shadow-sm">
            {statusLabel}
          </span>
        </div>

        <div className="space-y-3 p-5">
          <h2 className="text-xl font-semibold leading-tight text-[#16352B]">{event.title}</h2>
          {event.short_description && (
            <p className="line-clamp-3 text-sm leading-6 text-[#6B756F]">{event.short_description}</p>
          )}
          <div className="space-y-2 text-sm text-[#6B756F]">
            {event.event_date && (
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#0F8F61]" />
                {formatEventDate(event.event_date)}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#0F8F61]" />
                {event.location}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F8F61]">
            Ver evento
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </button>
    </article>
  );
};

export default EventCard;
