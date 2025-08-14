import React from 'react';
import { Instagram, Phone, MapPin, Flower, Crown } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: 'home' | 'accessories' | 'care' | 'orchids' | 'pots' | 'checkout' | 'terms' | 'privacy' | 'videos') => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo y Descripción */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-br from-pink-500 to-emerald-500 p-3 rounded-full">
                <Flower className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Club de Las Orquídeas</h3>
                <p className="text-emerald-300">Pasión por las Orquídeas</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Somos el club más exclusivo de amantes de las orquídeas. Ofrecemos las más hermosas 
              variedades de orquídeas, macetas artesanales y todo lo que necesitas para cultivar 
              tu pasión por estas flores extraordinarias. Unidos por el amor a las orquídeas desde 2018.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://www.instagram.com/clubdelasorquideas/?hl=es-la" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-full hover:from-purple-600 hover:to-pink-600 transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://wa.me/5491122906442" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-green-500 p-2 rounded-full hover:bg-green-600 transition-colors"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-emerald-300">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('home')} className="text-gray-300 hover:text-white transition-colors text-left">Inicio</button></li>
              <li><button onClick={() => onNavigate('orchids')} className="text-gray-300 hover:text-white transition-colors text-left">Orquídeas</button></li>
              <li><button onClick={() => onNavigate('pots')} className="text-gray-300 hover:text-white transition-colors text-left">Macetas</button></li>
              <li><button onClick={() => onNavigate('accessories')} className="text-gray-300 hover:text-white transition-colors text-left">Accesorios</button></li>
              <li><button onClick={() => onNavigate('care')} className="text-gray-300 hover:text-white transition-colors text-left">Cuidados</button></li>
              <li><button onClick={() => onNavigate('videos')} className="text-gray-300 hover:text-white transition-colors text-left flex items-center space-x-1">
                <span>Videos Premium</span>
                <Crown className="h-4 w-4 text-yellow-400" />
              </button></li>
            </ul>
          </div>

          {/* Información de Contacto */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-emerald-300">Contacto</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-gray-300">Av. De los Lagos 7000</p>
                  <p className="text-gray-300">Nordelta, CP 1670</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-gray-300">WhatsApp: +54 9 11 2290 6442</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h5 className="font-semibold mb-2 text-emerald-300">Horarios de Atención</h5>
              <p className="text-gray-300 text-sm">Lunes a Viernes: 9:00 AM - 7:00 PM</p>
              <p className="text-gray-300 text-sm">Sábados: 9:00 AM - 5:00 PM</p>
              <p className="text-gray-300 text-sm">Domingos: 10:00 AM - 3:00 PM</p>
            </div>
            <div>
              <h5 className="font-semibold mb-2 text-emerald-300">Métodos de Pago</h5>
              <p className="text-gray-300 text-sm">Transferencia Bancaria</p>
              <p className="text-gray-300 text-sm">Pago contra entrega disponible</p>
            </div>
            <div>
              <h5 className="font-semibold mb-2 text-emerald-300">Envíos</h5>
              <p className="text-gray-300 text-sm">Entrega 24-48 horas en zona metropolitana</p>
              <p className="text-gray-300 text-sm">Envíos a toda Argentina</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 Club de Las Orquídeas. Todos los derechos reservados. 
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