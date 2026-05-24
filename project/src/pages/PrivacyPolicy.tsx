import React from 'react';
import { ArrowLeft, Shield, Eye, Lock, Database } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
            <Shield className="h-8 w-8 text-emerald-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Política de Privacidad</h1>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Información que Recopilamos</h2>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4">
                <div className="flex items-center mb-2">
                  <Database className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-800">Datos Personales</span>
                </div>
                <p className="text-blue-700">
                  Recopilamos información que usted nos proporciona directamente 
                  realiza una compra o se comunica con nosotros.
                </p>
              </div>
              
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Información de contacto (nombre, email, teléfono, dirección)</li>
                <li>Información de pago (procesada de forma segura por terceros)</li>
                <li>Historial de compras y preferencias</li>
                <li>Comunicaciones con nuestro servicio al cliente</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Cómo Utilizamos su Información</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Procesar y completar sus pedidos</li>
                <li>Enviar confirmaciones de pedidos y actualizaciones de envío</li>
                <li>Proporcionar servicio al cliente y soporte técnico</li>
                <li>Personalizar su experiencia de compra</li>
                <li>Enviar ofertas especiales y promociones (con su consentimiento)</li>
                <li>Mejorar nuestros productos y servicios</li>
                <li>Cumplir con obligaciones legales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Compartir Información</h2>
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500 mb-4">
                <div className="flex items-center mb-2">
                  <Eye className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="font-semibold text-yellow-800">Transparencia</span>
                </div>
                <p className="text-yellow-700">
                  No vendemos, alquilamos ni compartimos su información personal con terceros para fines comerciales.
                </p>
              </div>
              
              <p className="text-gray-700 mb-4">Podemos compartir su información únicamente en los siguientes casos:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Con proveedores de servicios que nos ayudan a operar nuestro negocio</li>
                <li>Para cumplir con la ley o responder a procesos legales</li>
                <li>Para proteger nuestros derechos, propiedad o seguridad</li>
                <li>Con su consentimiento explícito</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Seguridad de los Datos</h2>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 mb-4">
                <div className="flex items-center mb-2">
                  <Lock className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-semibold text-green-800">Protección</span>
                </div>
                <p className="text-green-700">
                  Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal.
                </p>
              </div>
              
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Encriptación SSL para todas las transacciones</li>
                <li>Servidores seguros con acceso restringido</li>
                <li>Monitoreo continuo de seguridad</li>
                <li>Capacitación regular del personal en protección de datos</li>
                <li>Auditorías de seguridad periódicas</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Sus Derechos</h2>
              <p className="text-gray-700 mb-4">Usted tiene derecho a:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Acceder a su información personal</li>
                <li>Corregir información inexacta</li>
                <li>Solicitar la eliminación de sus datos</li>
                <li>Oponerse al procesamiento de sus datos</li>
                <li>Solicitar la portabilidad de sus datos</li>
                <li>Retirar su consentimiento en cualquier momento</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Cookies y Tecnologías Similares</h2>
              <p className="text-gray-700 mb-4">
                Utilizamos cookies y tecnologías similares para mejorar su experiencia en nuestro sitio web:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Cookies esenciales para el funcionamiento del sitio</li>
                <li>Cookies de rendimiento para analizar el uso del sitio</li>
                <li>Cookies de personalización para recordar sus preferencias</li>
                <li>Puede gestionar las cookies a través de la configuración de su navegador</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Retención de Datos</h2>
              <p className="text-gray-700 mb-4">
                Conservamos su información personal durante el tiempo necesario para cumplir con los propósitos 
                descritos en esta política, a menos que la ley requiera un período de retención más largo.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">8. Menores de Edad</h2>
              <p className="text-gray-700 mb-4">
                Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos conscientemente 
                información personal de menores de edad.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">9. Cambios en esta Política</h2>
              <p className="text-gray-700 mb-4">
                Podemos actualizar esta política de privacidad ocasionalmente. Le notificaremos sobre 
                cambios significativos por email o mediante un aviso prominente en nuestro sitio web.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">10. Contacto</h2>
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  Si tiene preguntas sobre esta política de privacidad o desea ejercer sus derechos, contáctenos:
                </p>
                <ul className="text-gray-700 space-y-1">
                  <li>📧 Email: privacidad@clubdelasorquideas.com</li>
                  <li>📱 WhatsApp: +54 9 11 7032 6665</li>
                  <li>📍 Dirección: Av. De los Lagos 7000, Nordelta, CP 1670</li>
                  <li>🕒 Horario: Lunes a Viernes 9:00-18:00</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;