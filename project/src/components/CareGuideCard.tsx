import React from 'react';
import { ArrowRight, Leaf } from 'lucide-react';
import type { CareGuide } from '../types/careGuide';

interface CareGuideCardProps {
  guide: CareGuide;
  onOpen: (guide: CareGuide) => void;
}

const CareGuideCard: React.FC<CareGuideCardProps> = ({ guide, onOpen }) => {
  return (
    <article className="group overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <button type="button" onClick={() => onOpen(guide)} className="block w-full text-left">
        <div className="relative aspect-[4/3] bg-[#F8EFE3]">
          {guide.image_url ? (
            <img
              src={guide.image_url}
              alt={guide.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#0F8F61]">
              <Leaf className="h-12 w-12" />
            </div>
          )}
          {guide.difficulty && (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#0F8F61] shadow-sm">
              {guide.difficulty}
            </span>
          )}
        </div>

        <div className="space-y-3 p-5">
          {guide.category && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F8F61]">{guide.category}</p>
          )}
          <div>
            <h2 className="text-xl font-semibold leading-tight text-[#16352B]">{guide.title}</h2>
            {guide.subtitle && <p className="mt-1 text-sm text-[#6B756F]">{guide.subtitle}</p>}
          </div>
          {guide.short_description && (
            <p className="line-clamp-3 text-sm leading-6 text-[#6B756F]">{guide.short_description}</p>
          )}
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F8F61]">
            Ver cuidado
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </button>
    </article>
  );
};

export default CareGuideCard;
