import React from 'react';
import { Instagram, Phone, MapPin, Flower } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: 'home' | 'accessories' | 'care' | 'orchids' | 'interior' | 'exterior' | 'arrangements' | 'pots' | 'checkout' | 'terms' | 'privacy') => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#2F3A35] text-[#FFF8EF]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo y Descripción */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="rounded-full bg-[#F8DDEB] p-3">
                <Flower className="h-8 w-8 text-[#D96C9F]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Modo Plantas</h3>
                <p className="text-[#CFE3D4]">Pasión por las Orquídeas</p>
              </div>
            </div>
            <p className="text-[#FFF8EF]/75 mb-6 leading-relaxed">
              Somos el club más exclusivo de amantes de las orquídeas. Ofrecemos las más hermosas 
              variedades de orquídeas, macetas artesanales y todo lo que necesitas para cultivar 
              tu pasión por estas flores extraordinarias. Unidos por el amor a las orquídeas desde 2018.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://www.instagram.com/modoplantas/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="rounded-full bg-[#D96C9F] p-2 transition-colors hover:bg-[#C8568B]"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://wa.me/5491122906442" 
                target="_blank" 
                rel="noopener noreferrer"
                className="rounded-full bg-[#5FAE9B] p-2 transition-colors hover:bg-[#4D9A88]"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-[#CFE3D4]">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('home')} className="text-left text-[#FFF8EF]/75 transition-colors hover:text-white">Inicio</button></li>
              <li><button onClick={() => onNavigate('orchids')} className="text-left text-[#FFF8EF]/75 transition-colors hover:text-white">Orquídeas</button></li>
              <li><button onClick={() => onNavigate('interior')} className="text-left text-[#FFF8EF]/75 transition-colors hover:text-white">Plantas de interior</button></li>
              <li><button onClick={() => onNavigate('exterior')} className="text-left text-[#FFF8EF]/75 transition-colors hover:text-white">Plantas de exterior</button></li>
              <li><button onClick={() => onNavigate('arrangements')} className="text-left text-[#FFF8EF]/75 transition-colors hover:text-white">Arreglos</button></li>
              <li><button onClick={() => onNavigate('pots')} className="text-left text-[#FFF8EF]/75 transition-colors hover:text-white">Macetas</button></li>
              <li><button onClick={() => onNavigate('accessories')} className="text-left text-[#FFF8EF]/75 transition-colors hover:text-white">Accesorios</button></li>
              <li><button onClick={() => onNavigate('care')} className="text-left text-[#FFF8EF]/75 transition-colors hover:text-white">Cuidados</button></li>
            </ul>
          </div>

          {/* Información de Contacto */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-[#CFE3D4]">Contacto</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 flex-shrink-0 text-[#CFE3D4]" />
                <div>
                  <p className="text-[#FFF8EF]/75">Av. De los Lagos 7000</p>
                  <p className="text-[#FFF8EF]/75">Nordelta, CP 1670</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-[#CFE3D4]" />
                <div>
                  <p className="text-[#FFF8EF]/75">WhatsApp: +54 9 11 2290 6442</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="border-t border-white/10 mt-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h5 className="font-semibold mb-2 text-[#CFE3D4]">Horarios de Atención</h5>
              <p className="text-[#FFF8EF]/75 text-sm">Lunes a Viernes: 9:00 AM - 7:00 PM</p>
              <p className="text-[#FFF8EF]/75 text-sm">Sábados: 9:00 AM - 5:00 PM</p>
              <p className="text-[#FFF8EF]/75 text-sm">Domingos: 10:00 AM - 3:00 PM</p>
            </div>
            <div>
              <h5 className="font-semibold mb-2 text-[#CFE3D4]">Métodos de Pago</h5>
              <p className="text-[#FFF8EF]/75 text-sm">Transferencia Bancaria</p>
              <p className="text-[#FFF8EF]/75 text-sm">Pago contra entrega disponible</p>
            </div>
            <div>
              <h5 className="font-semibold mb-2 text-[#CFE3D4]">Envíos</h5>
              <p className="text-[#FFF8EF]/75 text-sm">Entrega 24-48 horas en zona metropolitana</p>
              <p className="text-[#FFF8EF]/75 text-sm">Envíos a toda Argentina</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center">
          <p className="text-sm text-[#FFF8EF]/60">
            © 2025 Modo Plantas. Todos los derechos reservados. 
            <span className="mx-2">|</span>
            <button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors">Política de Privacidad</button>
            <span className="mx-2">|</span>
            <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">Términos y Condiciones</button>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
