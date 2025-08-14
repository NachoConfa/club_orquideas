import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Lock, Crown, CheckCircle, Calendar, Users, Star, Mail } from 'lucide-react';
import { createSubscription } from '../config/mercadopago';

interface PremiumVideosProps {
  onBack: () => void;
  user: { name: string; email: string } | null;
}

interface Video {
  id: number;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  category: string;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado';
  instructor: string;
  views: number;
}

const PremiumVideos: React.FC<PremiumVideosProps> = ({ onBack, user }) => {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);

  // Cargar videos desde localStorage
  useEffect(() => {
    const savedVideos = localStorage.getItem('orchid-premium-videos');
    if (savedVideos) {
      const allVideos = JSON.parse(savedVideos);
      // Solo mostrar videos activos
      setVideos(allVideos.filter((video: any) => video.isActive));
    } else {
      // Videos por defecto si no hay guardados
      const defaultVideos = [
        {
          id: 1,
          title: "Técnicas Avanzadas de Propagación de Orquídeas",
          description: "Aprende los secretos profesionales para multiplicar tus orquídeas con técnicas de división, keikis y cultivo in vitro.",
          duration: "45:30",
          thumbnail: "https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500",
          category: "Propagación",
          difficulty: "Avanzado",
          instructor: "Dr. María González",
          views: 1250
        },
        {
          id: 2,
          title: "Diagnóstico y Tratamiento de Enfermedades",
          description: "Identifica y trata las enfermedades más comunes en orquídeas. Desde hongos hasta virus, aprende a salvar tus plantas.",
          duration: "38:15",
          thumbnail: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=500",
          category: "Salud",
          difficulty: "Intermedio",
          instructor: "Prof. Carlos Mendoza",
          views: 980
        },
        {
          id: 3,
          title: "Orquídeas Raras: Cultivo de Especies Exóticas",
          description: "Descubre cómo cultivar las orquídeas más raras y exóticas del mundo. Técnicas especializadas para coleccionistas.",
          duration: "52:20",
          thumbnail: "https://images.pexels.com/photos/1408967/pexels-photo-1408967.jpeg?auto=compress&cs=tinysrgb&w=500",
          category: "Especies Raras",
          difficulty: "Avanzado",
          instructor: "Dra. Ana Rodríguez",
          views: 756
        },
        {
          id: 4,
          title: "Hibridación: Creando Nuevas Variedades",
          description: "Aprende el arte de la hibridación para crear tus propias variedades únicas de orquídeas.",
          duration: "41:45",
          thumbnail: "https://images.pexels.com/photos/68507/spring-flowers-flowers-collage-floral-68507.jpeg?auto=compress&cs=tinysrgb&w=500",
          category: "Hibridación",
          difficulty: "Avanzado",
          instructor: "Ing. Roberto Silva",
          views: 623
        },
        {
          id: 5,
          title: "Sistemas de Riego Automatizado",
          description: "Instala y configura sistemas de riego automático para mantener tus orquídeas perfectamente hidratadas.",
          duration: "29:30",
          thumbnail: "https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500",
          category: "Tecnología",
          difficulty: "Intermedio",
          instructor: "Ing. Laura Pérez",
          views: 1100
        },
        {
          id: 6,
          title: "Orquídeas en Invernadero: Diseño y Manejo",
          description: "Todo lo que necesitas saber para diseñar y manejar un invernadero profesional para orquídeas.",
          duration: "56:10",
          thumbnail: "https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=500",
          category: "Invernaderos",
          difficulty: "Avanzado",
          instructor: "Arq. Miguel Torres",
          views: 890
        }
      ];
      setVideos(defaultVideos);
    }
  }, []);
  
  useEffect(() => {
    if (user) {
      // Verificar si el usuario tiene suscripción activa
      const subscriptions = JSON.parse(localStorage.getItem('orchid-subscriptions') || '[]');
      console.log('🔍 Verificando suscripciones para:', user.email);
      console.log('📋 Suscripciones encontradas:', subscriptions);
      
      const userSubscription = subscriptions.find((sub: any) => {
        if (sub.email !== user.email) return false;
        
        // Permitir suscripciones activas o canceladas que aún estén dentro del período pagado
        if (sub.status === 'active') {
          return !sub.expiryDate || new Date(sub.expiryDate) > new Date();
        }
        
        if (sub.status === 'cancelled' && sub.activeUntil) {
          return new Date(sub.activeUntil) > new Date();
        }
        
        return false;
      });
      
      console.log('👤 Suscripción del usuario:', userSubscription);
      setHasSubscription(!!userSubscription);
      
      // Función global para limpiar suscripción (solo para testing)
      // @ts-ignore
      window.clearUserSubscription = () => {
        localStorage.removeItem('orchid-subscriptions');
        localStorage.removeItem(`orchid-notifications-${user.email}`);
        console.log('🧹 Suscripción limpiada para:', user.email);
        alert(`✅ Suscripción removida para ${user.email}. Recargando página...`);
        window.location.reload();
      };
    }
  }, [user]);

  const handleVideoClick = (video: Video) => {
    if (!user) {
      alert('Debes iniciar sesión para acceder a los videos premium.');
      return;
    }

    if (!hasSubscription) {
      setSelectedVideo(video);
      setShowSubscriptionModal(true);
    } else {
      // Aquí se reproduciría el video
      alert(`Reproduciendo: ${video.title}`);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;

    setIsCreatingPayment(true);

    try {
      // Crear suscripción de MercadoPago
      const subscription = await createSubscription(user.email, user.name);
      
      if (subscription.success) {
        // Crear suscripción pendiente
        const subscriptions = JSON.parse(localStorage.getItem('orchid-subscriptions') || '[]');
        const pendingSubscription = {
          email: user.email,
          name: user.name,
          planType: 'premium',
          price: 9999,
          paymentMethod: 'mercadopago',
          status: 'pending',
          subscribedAt: new Date().toISOString(),
          subscriptionId: subscription.subscriptionId
        };

        subscriptions.push(pendingSubscription);
        localStorage.setItem('orchid-subscriptions', JSON.stringify(subscriptions));

        // Redirigir a MercadoPago
        window.location.href = subscription.initPoint;
      } else {
        alert('Error al crear la suscripción. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error creating payment preference:', error);
      alert('Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Verificar si hay parámetros de retorno de MercadoPago
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const subscriptionId = urlParams.get('subscription_id');
    const preapprovalId = urlParams.get('preapproval_id');

    if (paymentStatus === 'success' && (subscriptionId || preapprovalId) && user) {
      // Suscripción exitosa - activar
      const subscriptions = JSON.parse(localStorage.getItem('orchid-subscriptions') || '[]');
      const updatedSubscriptions = subscriptions.map((sub: any) => 
        (sub.subscriptionId === subscriptionId || sub.preapprovalId === preapprovalId) && sub.email === user.email
          ? { 
              ...sub, 
              status: 'active',
              startDate: new Date().toISOString(),
              expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          : sub
      );
      
      localStorage.setItem('orchid-subscriptions', JSON.stringify(updatedSubscriptions));
      setHasSubscription(true);
      
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
      
      alert('🎉 ¡Suscripción confirmada! Tu suscripción Premium está ahora activa. ¡Disfruta de todos los videos exclusivos!');
    } else if (paymentStatus === 'failure') {
      alert('❌ La suscripción no pudo ser procesada. Intenta nuevamente.');
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
    } else if (paymentStatus === 'pending') {
      alert('⏳ Tu suscripción está siendo procesada. Te notificaremos cuando se confirme.');
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
    }
  }, [user]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Principiante': return 'bg-green-100 text-green-800';
      case 'Intermedio': return 'bg-yellow-100 text-yellow-800';
      case 'Avanzado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <Lock className="h-16 w-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Requerido</h2>
          <p className="text-gray-600 mb-6">Debes iniciar sesión para acceder a los videos premium.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al inicio</span>
        </button>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Crown className="h-12 w-12 text-yellow-500 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Videos Premium</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Accede a contenido exclusivo de expertos en orquídeas. Técnicas avanzadas, 
            secretos profesionales y conocimientos especializados.
          </p>
          
          {hasSubscription ? (
            <div className="mt-6 bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border-l-4 border-green-500 max-w-md mx-auto">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-green-800 font-semibold">¡Suscripción Activa!</span>
              </div>
            </div>
          ) : (
            <div className="mt-6 bg-gradient-to-r from-yellow-100 to-orange-100 p-4 rounded-lg border-l-4 border-yellow-500 max-w-md mx-auto">
              <div className="flex items-center justify-center">
                <Lock className="h-6 w-6 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-semibold">Suscripción Requerida</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <Play className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-800">{videos.length}</h3>
            <p className="text-gray-600">Videos Exclusivos</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <Users className="h-8 w-8 text-pink-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-800">5</h3>
            <p className="text-gray-600">Expertos Instructores</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <Star className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-800">4.9</h3>
            <p className="text-gray-600">Calificación Promedio</p>
          </div>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleVideoClick(video)}
                    className="bg-white bg-opacity-90 p-4 rounded-full hover:bg-opacity-100 transition-all transform hover:scale-110"
                  >
                    {hasSubscription ? (
                      <Play className="h-8 w-8 text-purple-600" />
                    ) : (
                      <Lock className="h-8 w-8 text-gray-600" />
                    )}
                  </button>
                </div>
                <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                  {video.duration}
                </div>
                <div className="absolute top-4 left-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(video.difficulty)}`}>
                    {video.difficulty}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-2">
                  <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                    {video.category}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">
                  {video.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {video.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Por {video.instructor}</span>
                  <span>{video.views.toLocaleString()} vistas</span>
                </div>

                {!hasSubscription && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border-l-4 border-purple-500">
                    <div className="flex items-center">
                      <Crown className="h-4 w-4 text-purple-600 mr-2" />
                      <span className="text-purple-800 text-sm font-semibold">Contenido Premium</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Subscription Modal */}
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowSubscriptionModal(false)} />
            
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl">
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Suscripción Premium</h2>
                  <p className="text-gray-600">Accede a contenido exclusivo de expertos</p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">$9.999</div>
                    <div className="text-gray-600">por mes</div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Acceso a todos los videos premium</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Contenido de expertos reconocidos</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Técnicas avanzadas y secretos profesionales</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Nuevos videos cada mes</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Cancela cuando quieras</span>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 mb-6">
                  <h4 className="font-semibold text-green-800 mb-3">💳 Pago Seguro con MercadoPago</h4>
                  <div className="text-sm text-green-700">
                    <p className="mb-2">✅ Transferencia bancaria segura</p>
                    <p className="mb-2">✅ Procesado por MercadoPago</p>
                    <p className="mb-2">✅ Activación tras confirmación de pago</p>
                    <p className="text-xs text-green-600 mt-3">
                      🔒 Pago 100% seguro. Serás redirigido a MercadoPago para completar la transferencia.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSubscribe}
                  disabled={isCreatingPayment}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Crown className="h-5 w-5" />
                  <span>{isCreatingPayment ? 'Creando Suscripción...' : 'Suscribirse con MercadoPago'}</span>
                </button>

                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="w-full mt-3 text-gray-600 py-2 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumVideos;