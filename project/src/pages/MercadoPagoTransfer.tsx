import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, CheckCircle, Clock, CreditCard, AlertCircle } from 'lucide-react';

interface MercadoPagoTransferProps {
  onBack: () => void;
  onPaymentComplete: (reference: string) => void;
}

const MercadoPagoTransfer: React.FC<MercadoPagoTransferProps> = ({ onBack, onPaymentComplete }) => {
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    // Obtener datos de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount');
    const reference = urlParams.get('reference');
    const email = urlParams.get('email');
    const name = urlParams.get('name');
    const type = urlParams.get('type');

    if (amount && reference && email && name && type) {
      setPaymentData({
        amount: parseFloat(amount),
        reference,
        email: decodeURIComponent(email),
        name: decodeURIComponent(name),
        type
      });
    }
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleConfirmPayment = async () => {
    if (!paymentData) return;
    
    setIsConfirming(true);
    
    // Simular verificación de pago
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Marcar como pagado
    localStorage.setItem(`mp_paid_${paymentData.reference}`, 'true');
    
    // Notificar por WhatsApp
    const message = `💳 PAGO CONFIRMADO - Club de Las Orquídeas\n\n` +
      `Cliente: ${paymentData.name}\n` +
      `Email: ${paymentData.email}\n` +
      `Tipo: ${paymentData.type === 'subscription' ? 'Suscripción Premium' : 'Compra de productos'}\n` +
      `Monto: $${paymentData.amount.toLocaleString('es-AR')}\n` +
      `Referencia: ${paymentData.reference}\n` +
      `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n` +
      `✅ PAGO CONFIRMADO POR EL CLIENTE`;

    const whatsappNumber = '+5491122906442';
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace('+', '')}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    setIsConfirming(false);
    onPaymentComplete(paymentData.reference);
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error en el Pago</h2>
          <p className="text-gray-600 mb-6">No se pudieron cargar los datos del pago.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver</span>
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-green-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Transferencia Bancaria</h1>
              <p className="text-gray-600">Completa tu pago mediante transferencia bancaria</p>
            </div>

            {/* Resumen del Pago */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg mb-8 border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-800 mb-3">📋 Resumen del Pago</h3>
              <div className="space-y-2 text-blue-700">
                <p><strong>Cliente:</strong> {paymentData.name}</p>
                <p><strong>Email:</strong> {paymentData.email}</p>
                <p><strong>Tipo:</strong> {paymentData.type === 'subscription' ? 'Suscripción Premium Videos' : 'Compra de Productos'}</p>
                <p><strong>Monto Total:</strong> <span className="text-2xl font-bold text-green-600">${paymentData.amount.toLocaleString('es-AR')}</span></p>
                <p><strong>Referencia:</strong> {paymentData.reference}</p>
              </div>
            </div>

            {/* Datos Bancarios */}
            <div className="bg-green-50 p-6 rounded-lg mb-8 border-l-4 border-green-500">
              <h3 className="font-bold text-green-800 mb-4">🏦 Datos para Transferencia</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <div>
                    <span className="text-sm text-gray-500">CBU</span>
                    <p className="font-mono font-bold text-gray-800">0000003100056904758628</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard('0000003100056904758628', 'cbu')}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {copied === 'cbu' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <div>
                    <span className="text-sm text-gray-500">Alias</span>
                    <p className="font-bold text-gray-800">ignacio.confalonieri</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard('ignacio.confalonieri', 'alias')}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {copied === 'alias' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <span className="text-sm text-gray-500">Titular</span>
                    <p className="font-bold text-gray-800">Ignacio Adrian Confalonieri</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <span className="text-sm text-gray-500">Banco</span>
                    <p className="font-bold text-gray-800">Mercado Pago</p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <div>
                    <span className="text-sm text-gray-500">CUIT</span>
                    <p className="font-mono font-bold text-gray-800">20-47436820-4</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard('20-47436820-4', 'cuit')}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {copied === 'cuit' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>

                <div className="bg-yellow-100 p-4 rounded border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-yellow-700">Monto a Transferir</span>
                      <p className="text-2xl font-bold text-yellow-800">${paymentData.amount.toLocaleString('es-AR')}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(paymentData.amount.toString(), 'amount')}
                      className="text-yellow-600 hover:text-yellow-700 transition-colors"
                    >
                      {copied === 'amount' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-50 p-6 rounded-lg mb-8 border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-800 mb-3">📝 Instrucciones</h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-700">
                <li>Realiza la transferencia bancaria con los datos proporcionados</li>
                <li>Asegúrate de transferir el monto exacto: <strong>${paymentData.amount.toLocaleString('es-AR')}</strong></li>
                <li>Una vez realizada la transferencia, haz clic en "Confirmar Pago"</li>
                <li>Tu {paymentData.type === 'subscription' ? 'suscripción' : 'pedido'} se activará inmediatamente</li>
              </ol>
            </div>

            {/* Botón de Confirmación */}
            <button
              onClick={handleConfirmPayment}
              disabled={isConfirming}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isConfirming ? (
                <>
                  <Clock className="h-5 w-5 animate-spin" />
                  <span>Confirmando Pago...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Ya Realicé la Transferencia - Confirmar Pago</span>
                </>
              )}
            </button>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <p className="text-yellow-700 text-sm">
                ⚠️ <strong>Importante:</strong> Solo confirma el pago después de haber realizado la transferencia. 
                La confirmación activará inmediatamente tu {paymentData.type === 'subscription' ? 'suscripción' : 'pedido'}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MercadoPagoTransfer;