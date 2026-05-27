import React from 'react';
import { Instagram, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: 'home' | 'accessories' | 'care' | 'orchids' | 'interior' | 'exterior' | 'arrangements' | 'pots' | 'checkout' | 'terms' | 'privacy') => void;
}

const footerLinkClass = 'text-left text-[#FFF8EF]/75 transition-colors hover:text-white';

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#16352B] text-[#FFF8EF]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF8EF] ring-1 ring-white/30">
                <img
                  src="/modo-plantas-logo-icono-512.png"
                  alt="Modo Plantas"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Modo Plantas</h3>
                <p className="text-[#CFE3D4]">Pasión por la naturaleza</p>
              </div>
            </div>

            <p className="mb-6 max-w-2xl leading-relaxed text-[#FFF8EF]/75">
              Plantas, macetas y otros productos para llenar tus espacios de naturaleza. Seleccionamos cada
              producto con una mirada cálida, simple y cuidada para acompañar hogares, regalos y momentos especiales.
            </p>

            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/modoplantas/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#0F8F61] p-2 transition-colors hover:bg-[#0C7A52]"
                aria-label="Instagram de Modo Plantas"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/5491122906442"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#E8F7EF] p-2 text-[#16352B] transition-colors hover:bg-white"
                aria-label="WhatsApp de Modo Plantas"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-[#CFE3D4]">Enlaces rápidos</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('home')} className={footerLinkClass}>Inicio</button></li>
              <li><button onClick={() => onNavigate('orchids')} className={footerLinkClass}>Orquídeas</button></li>
              <li><button onClick={() => onNavigate('interior')} className={footerLinkClass}>Plantas de interior</button></li>
              <li><button onClick={() => onNavigate('exterior')} className={footerLinkClass}>Plantas de exterior</button></li>
              <li><button onClick={() => onNavigate('arrangements')} className={footerLinkClass}>Arreglos</button></li>
              <li><button onClick={() => onNavigate('pots')} className={footerLinkClass}>Macetas</button></li>
              <li><button onClick={() => onNavigate('accessories')} className={footerLinkClass}>Otros</button></li>
              <li><button onClick={() => onNavigate('care')} className={footerLinkClass}>Cuidados</button></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-[#CFE3D4]">Contacto</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#CFE3D4]" />
                <div>
                  <p className="text-[#FFF8EF]/75">Av. De los Lagos 7000</p>
                  <p className="text-[#FFF8EF]/75">Nordelta, CP 1670</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-[#CFE3D4]" />
                <p className="text-[#FFF8EF]/75">WhatsApp: +54 9 11 2290 6442</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <h5 className="mb-2 font-semibold text-[#CFE3D4]">Horarios de atención</h5>
              <p className="text-sm text-[#FFF8EF]/75">Lunes a Viernes: 9:00 AM - 7:00 PM</p>
              <p className="text-sm text-[#FFF8EF]/75">Sábados: 9:00 AM - 5:00 PM</p>
              <p className="text-sm text-[#FFF8EF]/75">Domingos: 10:00 AM - 3:00 PM</p>
            </div>
            <div>
              <h5 className="mb-2 font-semibold text-[#CFE3D4]">Métodos de pago</h5>
              <p className="text-sm text-[#FFF8EF]/75">Transferencia bancaria</p>
              <p className="text-sm text-[#FFF8EF]/75">Pago contra entrega disponible</p>
              <p className="text-sm text-[#FFF8EF]/75">Mercado Pago</p>
            </div>
            <div>
              <h5 className="mb-2 font-semibold text-[#CFE3D4]">Envíos</h5>
              <p className="text-sm text-[#FFF8EF]/75">Entrega 24-48 horas en zona metropolitana</p>
              <p className="text-sm text-[#FFF8EF]/75">Coordinación por WhatsApp según zona</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <p className="flex flex-col items-center gap-2 text-sm text-[#FFF8EF]/60 sm:block">
            <span>© 2026 Modo Plantas. Todos los derechos reservados.</span>
            <span className="hidden sm:inline sm:mx-2">|</span>
            <button onClick={() => onNavigate('privacy')} className="transition-colors hover:text-white">Política de privacidad</button>
            <span className="hidden sm:inline sm:mx-2">|</span>
            <button onClick={() => onNavigate('terms')} className="transition-colors hover:text-white">Términos y condiciones</button>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
