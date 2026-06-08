import { useEffect, useState } from 'react';
import { ExternalLink, Leaf, X } from './SitePopupIcons';
import {
  getActiveSitePopup,
  hasSitePopupPreference,
  saveSitePopupPreference,
} from '../services/sitePopupService';
import type { SitePopup as SitePopupConfig, SitePopupResponse } from '../types/sitePopup';

const HIDDEN_PATH_PREFIXES = ['/checkout', '/admin', '/reset-password'];

const isHiddenPath = (pathname: string) =>
  HIDDEN_PATH_PREFIXES.some((pathPrefix) => pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`));

const normalizeExternalUrl = (url: string | null) => {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
};

const SitePopup = ({ pathname }: { pathname: string }) => {
  const [popup, setPopup] = useState<SitePopupConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (isHiddenPath(pathname)) {
      setIsVisible(false);
      return () => {
        isMounted = false;
      };
    }

    const loadPopup = async () => {
      try {
        const activePopup = await getActiveSitePopup();
        if (!isMounted || !activePopup || hasSitePopupPreference(activePopup)) {
          return;
        }

        setPopup(activePopup);
        setIsVisible(true);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('No se pudo cargar el pop-up del sitio:', error);
        }
      }
    };

    const timeoutId = window.setTimeout(loadPopup, 900);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup('closed');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const closePopup = (response: SitePopupResponse) => {
    if (popup) {
      saveSitePopupPreference(popup, response);
    }

    setIsVisible(false);
  };

  if (!popup || !isVisible || isHiddenPath(pathname)) {
    return null;
  }

  const linkUrl = normalizeExternalUrl(popup.link_url);

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#16352B]/45 px-4 py-6 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-popup-title"
        className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-[#F1E3D4] bg-[#FFF8EF] text-[#1F2933] shadow-2xl shadow-[#16352B]/20"
      >
        <button
          type="button"
          onClick={() => closePopup('closed')}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#6B7280] shadow-sm transition-colors hover:bg-white hover:text-[#16352B]"
          aria-label="Cerrar pop-up"
        >
          <X className="h-4 w-4" />
        </button>

        {popup.image_url && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-[#E8F7EF]">
            <img
              src={popup.image_url}
              alt={popup.title}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        <div className="p-6 sm:p-7">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0F8F61]">
            <Leaf className="h-4 w-4" />
            Novedades
          </div>

          <h2 id="site-popup-title" className="text-2xl font-semibold leading-tight text-[#16352B] sm:text-3xl">
            {popup.title}
          </h2>

          {popup.description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#4B5563] sm:text-base">
              {popup.description}
            </p>
          )}

          {linkUrl && popup.link_label && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0F8F61] underline decoration-[#0F8F61]/30 underline-offset-4 transition-colors hover:text-[#0B6F4A]"
            >
              {popup.link_label}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => closePopup('accepted')}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-[#0F8F61] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0B6F4A]"
            >
              {popup.accept_label}
            </button>
            <button
              type="button"
              onClick={() => closePopup('dismissed')}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-[#F1E3D4] bg-white px-5 py-3 text-sm font-semibold text-[#16352B] transition-colors hover:bg-[#E8F7EF]"
            >
              {popup.dismiss_label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SitePopup;
