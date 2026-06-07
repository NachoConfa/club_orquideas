import React from 'react';
import { ArrowLeft, FileText, AlertCircle } from '../lib/icons';

interface TermsAndConditionsProps {
  onBack: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <FileText className="h-8 w-8 text-emerald-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Términos y Condiciones</h1>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Aceptación de los Términos</h2>
              <p className="text-gray-700 mb-4">
                Al acceder y utilizar el sitio web de Modo Plantas, usted acepta estar sujeto a estos términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Productos y Servicios</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Todas las orquídeas son plantas vivas y pueden variar ligeramente de las imágenes mostradas</li>
                <li>Las imágenes de los productos son de referencia y pueden variar levemente en la realidad</li>
                <li>Los colores pueden variar debido a las condiciones de cultivo y la temporada</li>
                <li>Garantizamos la calidad de nuestras plantas por 30 días desde la entrega</li>
                <li>Las macetas artesanales pueden tener variaciones únicas que las hacen especiales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Precios y Pagos</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Todos los precios están expresados en pesos argentinos e incluyen IVA</li>
                <li>Los precios pueden cambiar sin previo aviso</li>
                <li>Aceptamos transferencia bancaria y pago en efectivo</li>
                <li>El pago debe completarse antes del envío</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Envíos y Entregas</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Realizamos envíos a toda Argentina</li>
                <li>El tiempo de entrega es de 3-7 días hábiles</li>
                <li>Las plantas se envían con embalaje especial para garantizar su llegada en perfectas condiciones</li>
                <li>No nos hacemos responsables por retrasos causados por el servicio de mensajería</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Política de Devoluciones</h2>
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500 mb-4">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-semibold text-red-800">Política de No Devoluciones</span>
                </div>
                <p className="text-red-700">
                  <strong>No aceptamos devoluciones de ningún tipo.</strong> Todas las ventas son finales.
                </p>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Todas las ventas son finales - no se aceptan devoluciones</li>
                <li>No nos hacemos responsables por productos dañados durante el envío</li>
                <li>Las plantas son seres vivos y requieren cuidados específicos una vez entregadas</li>
                <li>Proporcionamos guías detalladas de cuidado con cada compra</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Cuidado de las Plantas</h2>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 mb-4">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-semibold text-green-800">Importante</span>
                </div>
                <p className="text-green-700">
                  El cliente es responsable del cuidado adecuado de las plantas después de la entrega. 
                  Proporcionamos guías de cuidado detalladas con cada compra.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Limitación de Responsabilidad</h2>
              <p className="text-gray-700 mb-4">
                Modo Plantas no será responsable por daños indirectos, incidentales o consecuentes que resulten del uso de nuestros productos o servicios. Nuestra responsabilidad se limita al valor de los productos adquiridos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">8. Modificaciones</h2>
              <p className="text-gray-700 mb-4">
                Nos reservamos el derecho de modificar estos términos y condiciones en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">9. Contacto</h2>
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  Si tiene preguntas sobre estos términos y condiciones, puede contactarnos:
                </p>
                <ul className="text-gray-700 space-y-1">
                  <li>📱 WhatsApp: +54 9 11 7032 6665</li>
                  <li>📍 Dirección: Av. De los Lagos 7000, Nordelta, CP 1670</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
