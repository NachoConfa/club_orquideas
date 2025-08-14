import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, User, Mail, Calendar, DollarSign, Eye, Package, Video, Settings, Crown, Edit, Save, X, Plus, Upload, Trash2, EyeOff, Play, Star, Wrench } from 'lucide-react';
import { orchidApi, Product as ApiProduct, Accessory as ApiAccessory, Video as ApiVideo, User as ApiUser } from '../services/api';

interface AdminPanelProps {
  onBack: () => void;
  user: { name: string; email: string } | null;
}

interface Subscription {
  email: string;
  name: string;
  planType: string;
  startDate: string;
  expiryDate: string;
  price: number;
  paymentMethod: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  subscribedAt: string;
}

interface UserData {
  name: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  isSubscribed: boolean;
  subscriptionStatus?: 'pending' | 'active' | 'expired' | 'cancelled';
  subscriptionExpiry?: string;
}

type Video = ApiVideo & {
  difficulty?: 'Principiante' | 'Intermedio' | 'Avanzado';
  instructor?: string;
  views?: number;
  isActive?: boolean;
};

// Usar interfaces de la API
type Product = ApiProduct & {
  originalPrice?: number;
  inStock: boolean;
};

type Accessory = ApiAccessory & {
  originalPrice?: number;
  inStock: boolean;
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, user }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [selectedTab, setSelectedTab] = useState<'products' | 'accessories' | 'videos' | 'users' | 'subscriptions'>('products');
  const [subscriptionSubTab, setSubscriptionSubTab] = useState<'pending' | 'active' | 'all'>('pending');
  
  // Estados para edición de videos
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isCreatingNewVideo, setIsCreatingNewVideo] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [videoCategoryFilter, setVideoCategoryFilter] = useState('');
  
  // Estados para edición de productos
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  
  // Estados para edición de accesorios
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
  const [isCreatingNewAccessory, setIsCreatingNewAccessory] = useState(false);
  const [accessorySearchQuery, setAccessorySearchQuery] = useState('');
  const [accessoryCategoryFilter, setAccessoryCategoryFilter] = useState('');

  // Verificar si el usuario es admin
  const isAdmin = user?.email === 'NachoGemerXD@hotmail.com';

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      // Cargar productos
      await loadProducts();
      
      // Cargar accesorios
      await loadAccessories();
      
      // Cargar videos
      await loadVideos();
      
      // Cargar suscripciones (mantener localStorage por ahora)
      const savedSubscriptions = JSON.parse(localStorage.getItem('orchid-subscriptions') || '[]');
      setSubscriptions(savedSubscriptions);
      
      // Cargar usuarios (mantener localStorage por ahora hasta migrar auth)
      const savedUsers = JSON.parse(localStorage.getItem('orchid-users') || '[]');
      const usersWithSubscriptions = savedUsers.map((u: any) => {
        const userSubscription = savedSubscriptions.find((sub: any) => 
          sub.email === u.email && 
          (sub.status === 'active' || (sub.status === 'cancelled' && sub.activeUntil && new Date(sub.activeUntil) > new Date())) &&
          (!sub.expiryDate || new Date(sub.expiryDate) > new Date())
        );
        
        return {
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
          isSubscribed: !!userSubscription,
          subscriptionStatus: userSubscription?.status,
          subscriptionExpiry: userSubscription?.expiryDate
        };
      });
      
      setUsers(usersWithSubscriptions);
      
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await orchidApi.getProducts({ limit: 1000 });
      if (response.success && response.data) {
        const apiProducts = response.data.products.map(p => ({
          ...p,
          originalPrice: p.original_price,
          inStock: p.in_stock
        }));
        setProducts(apiProducts);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAccessories = async () => {
    try {
      const response = await orchidApi.getAccessories({ limit: 1000 });
      if (response.success && response.data) {
        const apiAccessories = response.data.accessories.map(a => ({
          ...a,
          originalPrice: a.original_price,
          inStock: a.in_stock
        }));
        setAccessories(apiAccessories);
      }
    } catch (error) {
      console.error('Error loading accessories:', error);
    }
  };

  const loadVideos = async () => {
    try {
      const response = await orchidApi.getVideos({ limit: 1000 });
      if (response.success && response.data) {
        const apiVideos = response.data.videos.map(v => ({
          ...v,
          difficulty: 'Intermedio' as const,
          instructor: 'Instructor',
          views: 0,
          isActive: true,
          videoUrl: v.video_url
        }));
        setVideos(apiVideos);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  // Funciones para productos
  const handleCreateNewProduct = () => {
    const newProduct: Product = {
      id: 0, // Se asignará por la API
      name: 'Nuevo Producto',
      price: 0,
      image: 'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500',
      rating: 5,
      reviews: 0,
      category: 'Phalaenopsis',
      color: 'pink',
      size: 'Mediana',
      inStock: true,
      in_stock: true,
      type: 'Phalaenopsis',
      created_at: '',
      updated_at: ''
    };
    
    setEditingProduct(newProduct);
    setIsCreatingNewProduct(true);
  };

  const handleSaveProduct = async (updatedProduct: Product) => {
    try {
      if (isCreatingNewProduct) {
        const productData = {
          name: updatedProduct.name,
          price: updatedProduct.price,
          original_price: updatedProduct.originalPrice,
          image: updatedProduct.image,
          rating: updatedProduct.rating,
          reviews: updatedProduct.reviews,
          category: updatedProduct.category,
          color: updatedProduct.color,
          size: updatedProduct.size,
          in_stock: updatedProduct.inStock,
          type: updatedProduct.type
        };
        
        const response = await orchidApi.createProduct(productData);
        if (response.success) {
          await loadProducts(); // Recargar lista
          setIsCreatingNewProduct(false);
          setEditingProduct(null);
          alert('✅ Producto creado correctamente');
        } else {
          alert('❌ Error al crear producto: ' + response.message);
        }
      } else {
        const productData = {
          name: updatedProduct.name,
          price: updatedProduct.price,
          original_price: updatedProduct.originalPrice,
          image: updatedProduct.image,
          rating: updatedProduct.rating,
          reviews: updatedProduct.reviews,
          category: updatedProduct.category,
          color: updatedProduct.color,
          size: updatedProduct.size,
          in_stock: updatedProduct.inStock,
          type: updatedProduct.type
        };
        
        const response = await orchidApi.updateProduct(updatedProduct.id, productData);
        if (response.success) {
          await loadProducts(); // Recargar lista
          setEditingProduct(null);
          alert('✅ Producto actualizado correctamente');
        } else {
          alert('❌ Error al actualizar producto: ' + response.message);
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('❌ Error de conexión');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        const response = await orchidApi.deleteProduct(productId);
        if (response.success) {
          await loadProducts(); // Recargar lista
          alert('✅ Producto eliminado correctamente');
        } else {
          alert('❌ Error al eliminar producto: ' + response.message);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('❌ Error de conexión');
      }
    }
  };

  // Funciones para accesorios
  const handleCreateNewAccessory = () => {
    const newAccessory: Accessory = {
      id: 0, // Se asignará por la API
      name: 'Nuevo Accesorio',
      price: 0,
      image: 'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500',
      rating: 5,
      reviews: 0,
      category: 'Herramientas',
      description: 'Descripción del nuevo accesorio...',
      inStock: true,
      in_stock: true,
      created_at: '',
      updated_at: ''
    };
    
    setEditingAccessory(newAccessory);
    setIsCreatingNewAccessory(true);
  };

  const handleSaveAccessory = async (updatedAccessory: Accessory) => {
    try {
      if (isCreatingNewAccessory) {
        const accessoryData = {
          name: updatedAccessory.name,
          price: updatedAccessory.price,
          original_price: updatedAccessory.originalPrice,
          image: updatedAccessory.image,
          rating: updatedAccessory.rating,
          reviews: updatedAccessory.reviews,
          category: updatedAccessory.category,
          description: updatedAccessory.description,
          in_stock: updatedAccessory.inStock
        };
        
        const response = await orchidApi.createAccessory(accessoryData);
        if (response.success) {
          await loadAccessories(); // Recargar lista
          setIsCreatingNewAccessory(false);
          setEditingAccessory(null);
          
          // Disparar evento personalizado para notificar cambios
          window.dispatchEvent(new Event('accessories-updated'));
          
          alert('✅ Accesorio creado correctamente');
        } else {
          alert('❌ Error al crear accesorio: ' + response.message);
        }
      } else {
        const accessoryData = {
          name: updatedAccessory.name,
          price: updatedAccessory.price,
          original_price: updatedAccessory.originalPrice,
          image: updatedAccessory.image,
          rating: updatedAccessory.rating,
          reviews: updatedAccessory.reviews,
          category: updatedAccessory.category,
          description: updatedAccessory.description,
          in_stock: updatedAccessory.inStock
        };
        
        const response = await orchidApi.updateAccessory(updatedAccessory.id, accessoryData);
        if (response.success) {
          await loadAccessories(); // Recargar lista
          setEditingAccessory(null);
          
          // Disparar evento personalizado para notificar cambios
          window.dispatchEvent(new Event('accessories-updated'));
          
          alert('✅ Accesorio actualizado correctamente');
        } else {
          alert('❌ Error al actualizar accesorio: ' + response.message);
        }
      }
    } catch (error) {
      console.error('Error saving accessory:', error);
      alert('❌ Error de conexión');
    }
  };

  const handleDeleteAccessory = async (accessoryId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este accesorio?')) {
      try {
        const response = await orchidApi.deleteAccessory(accessoryId);
        if (response.success) {
          await loadAccessories(); // Recargar lista
          
          // Disparar evento personalizado para notificar cambios
          window.dispatchEvent(new Event('accessories-updated'));
          
          alert('✅ Accesorio eliminado correctamente');
        } else {
          alert('❌ Error al eliminar accesorio: ' + response.message);
        }
      } catch (error) {
        console.error('Error deleting accessory:', error);
        alert('❌ Error de conexión');
      }
    }
  };

  // Funciones para videos
  const handleCreateNewVideo = () => {
    const newVideo: Video = {
      id: 0, // Se asignará por la API
      title: 'Nuevo Video Premium',
      description: 'Descripción del nuevo video...',
      duration: 0,
      thumbnail: 'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500',
      category: 'General',
      video_url: '',
      tags: '',
      difficulty: 'Principiante',
      instructor: 'Instructor',
      views: 0,
      isActive: true,
      videoUrl: '',
      created_at: '',
      updated_at: ''
    };
    
    setEditingVideo(newVideo);
    setIsCreatingNewVideo(true);
  };

  const handleSaveVideo = async (updatedVideo: Video) => {
    try {
      if (isCreatingNewVideo) {
        const videoData = {
          title: updatedVideo.title,
          description: updatedVideo.description,
          video_url: updatedVideo.videoUrl || updatedVideo.video_url,
          thumbnail: updatedVideo.thumbnail,
          duration: typeof updatedVideo.duration === 'string' ? 0 : updatedVideo.duration,
          category: updatedVideo.category,
          tags: updatedVideo.tags || ''
        };
        
        const response = await orchidApi.createVideo(videoData);
        if (response.success) {
          await loadVideos(); // Recargar lista
          setIsCreatingNewVideo(false);
          setEditingVideo(null);
          alert('✅ Video creado correctamente');
        } else {
          alert('❌ Error al crear video: ' + response.message);
        }
      } else {
        const videoData = {
          title: updatedVideo.title,
          description: updatedVideo.description,
          video_url: updatedVideo.videoUrl || updatedVideo.video_url,
          thumbnail: updatedVideo.thumbnail,
          duration: typeof updatedVideo.duration === 'string' ? 0 : updatedVideo.duration,
          category: updatedVideo.category,
          tags: updatedVideo.tags || ''
        };
        
        const response = await orchidApi.updateVideo(updatedVideo.id, videoData);
        if (response.success) {
          await loadVideos(); // Recargar lista
          setEditingVideo(null);
          alert('✅ Video actualizado correctamente');
        } else {
          alert('❌ Error al actualizar video: ' + response.message);
        }
      }
    } catch (error) {
      console.error('Error saving video:', error);
      alert('❌ Error de conexión');
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este video?')) {
      try {
        const response = await orchidApi.deleteVideo(videoId);
        if (response.success) {
          await loadVideos(); // Recargar lista
          alert('✅ Video eliminado correctamente');
        } else {
          alert('❌ Error al eliminar video: ' + response.message);
        }
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('❌ Error de conexión');
      }
    }
  };

  const handleToggleUserSubscription = (userEmail: string) => {
    const subscriptions = JSON.parse(localStorage.getItem('orchid-subscriptions') || '[]');
    const existingSubscription = subscriptions.find((sub: any) => sub.email === userEmail);
    
    if (existingSubscription && existingSubscription.status === 'active') {
      // Cancelar suscripción
      const updatedSubscriptions = subscriptions.map((sub: any) => 
        sub.email === userEmail ? { 
          ...sub, 
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          activeUntil: sub.expiryDate
        } : sub
      );
      localStorage.setItem('orchid-subscriptions', JSON.stringify(updatedSubscriptions));
      alert('❌ Suscripción cancelada');
    } else {
      // Activar suscripción
      const newSubscription = {
        email: userEmail,
        name: users.find(u => u.email === userEmail)?.name || 'Usuario',
        planType: 'premium',
        price: 9999,
        paymentMethod: 'admin',
        status: 'active',
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subscribedAt: new Date().toISOString()
      };
      
      const updatedSubscriptions = existingSubscription 
        ? subscriptions.map((sub: any) => sub.email === userEmail ? newSubscription : sub)
        : [...subscriptions, newSubscription];
        
      localStorage.setItem('orchid-subscriptions', JSON.stringify(updatedSubscriptions));
      alert('✅ Suscripción activada');
    }
    
    // Recargar datos
    window.location.reload();
  };

  const handleApproveSubscription = (email: string) => {
    const updatedSubscriptions = subscriptions.map(sub => 
      sub.email === email && sub.status === 'pending' 
        ? { ...sub, status: 'active' as const, startDate: new Date().toISOString() }
        : sub
    );
    
    setSubscriptions(updatedSubscriptions);
    localStorage.setItem('orchid-subscriptions', JSON.stringify(updatedSubscriptions));
    
    alert('✅ Suscripción aprobada y activada correctamente.');
  };

  const handleRejectSubscription = (email: string) => {
    const updatedSubscriptions = subscriptions.map(sub => 
      sub.email === email && sub.status === 'pending' 
        ? { ...sub, status: 'cancelled' as const }
        : sub
    );
    
    setSubscriptions(updatedSubscriptions);
    localStorage.setItem('orchid-subscriptions', JSON.stringify(updatedSubscriptions));
    
    alert('❌ Suscripción rechazada.');
  };

  const getFilteredSubscriptions = () => {
    switch (subscriptionSubTab) {
      case 'pending':
        return subscriptions.filter(sub => sub.status === 'pending');
      case 'active':
        return subscriptions.filter(sub => 
          (sub.status === 'active' || (sub.status === 'cancelled' && sub.activeUntil && new Date(sub.activeUntil) > new Date())) && 
          (!sub.expiryDate || new Date(sub.expiryDate) > new Date())
        );
      case 'all':
        return subscriptions;
      default:
        return subscriptions;
    }
  };

  const getFilteredVideos = () => {
    return videos.filter(video => {
      const matchesSearch = videoSearchQuery === '' || 
        video.title.toLowerCase().includes(videoSearchQuery.toLowerCase()) ||
        video.category.toLowerCase().includes(videoSearchQuery.toLowerCase()) ||
        video.instructor.toLowerCase().includes(videoSearchQuery.toLowerCase());
      
      const matchesCategory = videoCategoryFilter === '' || video.category === videoCategoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  };

  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesSearch = productSearchQuery === '' || 
        product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(productSearchQuery.toLowerCase());
      
      const matchesCategory = productCategoryFilter === '' || product.category === productCategoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  };

  const getFilteredAccessories = () => {
    return accessories.filter(accessory => {
      const matchesSearch = accessorySearchQuery === '' || 
        accessory.name.toLowerCase().includes(accessorySearchQuery.toLowerCase()) ||
        accessory.category.toLowerCase().includes(accessorySearchQuery.toLowerCase()) ||
        accessory.description.toLowerCase().includes(accessorySearchQuery.toLowerCase());
      
      const matchesCategory = accessoryCategoryFilter === '' || accessory.category === accessoryCategoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'active': return 'Activa';
      case 'expired': return 'Expirada';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Requerido</h2>
          <p className="text-gray-600 mb-6">Debes iniciar sesión para acceder al panel de administración.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Denegado</h2>
          <p className="text-gray-600 mb-6">No tienes permisos para acceder al panel de administración.</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const filteredSubscriptions = getFilteredSubscriptions();
  const filteredVideos = getFilteredVideos();
  const filteredProducts = getFilteredProducts();
  const filteredAccessories = getFilteredAccessories();
  const videoCategories = [...new Set(videos.map(v => v.category))];
  const productCategories = [...new Set(products.map(p => p.category))];
  const accessoryCategories = [...new Set(accessories.map(a => a.category))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver al inicio</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-full mr-4">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
              <p className="text-gray-600">Gestión completa del sistema</p>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedTab('products')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                selectedTab === 'products'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Productos
            </button>
            <button
              onClick={() => setSelectedTab('accessories')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                selectedTab === 'accessories'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Wrench className="h-4 w-4 inline mr-2" />
              Accesorios
            </button>
            <button
              onClick={() => setSelectedTab('videos')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                selectedTab === 'videos'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Video className="h-4 w-4 inline mr-2" />
              Videos Premium
            </button>
            <button
              onClick={() => setSelectedTab('users')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                selectedTab === 'users'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              Usuarios
            </button>
            <button
              onClick={() => setSelectedTab('subscriptions')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                selectedTab === 'subscriptions'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Suscripciones
            </button>
          </div>

          {/* Tab Content */}
          {selectedTab === 'products' && (
            <div>
              <div className="flex items-center mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-full mr-4">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">Administración de Productos</h2>
                  <p className="text-gray-600">Gestiona precios, disponibilidad e imágenes</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8">
                <button
                  onClick={handleCreateNewProduct}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Agregar Producto</span>
                </button>
              </div>

              {/* Filtros de productos */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {productCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Formulario de Nuevo Producto */}
              {isCreatingNewProduct && editingProduct && (
                <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Crear Nuevo Producto
                  </h3>
                  <ProductEditForm
                    product={editingProduct}
                    onSave={handleSaveProduct}
                    onCancel={() => {
                      setEditingProduct(null);
                      setIsCreatingNewProduct(false);
                    }}
                    isCreating={true}
                  />
                </div>
              )}

              {/* Lista de Productos */}
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    {editingProduct?.id === product.id && !isCreatingNewProduct ? (
                      <ProductEditForm
                        product={editingProduct}
                        onSave={handleSaveProduct}
                        onCancel={() => setEditingProduct(null)}
                        isCreating={false}
                      />
                    ) : (
                      <ProductRow
                        product={product}
                        onEdit={() => setEditingProduct(product)}
                        onDelete={() => handleDeleteProduct(product.id)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron productos</h3>
                  <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'accessories' && (
            <div>
              <div className="flex items-center mb-8">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-full mr-4">
                  <Wrench className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">Administración de Accesorios</h2>
                  <p className="text-gray-600">Gestiona herramientas y accesorios para el cuidado de orquídeas</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8">
                <button
                  onClick={handleCreateNewAccessory}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Agregar Accesorio</span>
                </button>
              </div>

              {/* Filtros de accesorios */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar accesorios..."
                    value={accessorySearchQuery}
                    onChange={(e) => setAccessorySearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <select
                  value={accessoryCategoryFilter}
                  onChange={(e) => setAccessoryCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Todas las categorías</option>
                  {accessoryCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Formulario de Nuevo Accesorio */}
              {isCreatingNewAccessory && editingAccessory && (
                <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Crear Nuevo Accesorio
                  </h3>
                  <AccessoryEditForm
                    accessory={editingAccessory}
                    onSave={handleSaveAccessory}
                    onCancel={() => {
                      setEditingAccessory(null);
                      setIsCreatingNewAccessory(false);
                    }}
                    isCreating={true}
                  />
                </div>
              )}

              {/* Lista de Accesorios */}
              <div className="space-y-4">
                {filteredAccessories.map((accessory) => (
                  <div key={accessory.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    {editingAccessory?.id === accessory.id && !isCreatingNewAccessory ? (
                      <AccessoryEditForm
                        accessory={editingAccessory}
                        onSave={handleSaveAccessory}
                        onCancel={() => setEditingAccessory(null)}
                        isCreating={false}
                      />
                    ) : (
                      <AccessoryRow
                        accessory={accessory}
                        onEdit={() => setEditingAccessory(accessory)}
                        onDelete={() => handleDeleteAccessory(accessory.id)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {filteredAccessories.length === 0 && (
                <div className="text-center py-12">
                  <Wrench className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron accesorios</h3>
                  <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'videos' && (
            <div>
              <div className="flex items-center mb-8">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full mr-4">
                  <Video className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">Administración de Videos Premium</h2>
                  <p className="text-gray-600">Gestiona el contenido exclusivo para suscriptores</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8">
                <button
                  onClick={handleCreateNewVideo}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Agregar Video</span>
                </button>
              </div>

              {/* Filtros de videos */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar videos..."
                    value={videoSearchQuery}
                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <select
                  value={videoCategoryFilter}
                  onChange={(e) => setVideoCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Todas las categorías</option>
                  {videoCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Formulario de Nuevo Video */}
              {isCreatingNewVideo && editingVideo && (
                <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Crear Nuevo Video
                  </h3>
                  <VideoEditForm
                    video={editingVideo}
                    onSave={handleSaveVideo}
                    onCancel={() => {
                      setEditingVideo(null);
                      setIsCreatingNewVideo(false);
                    }}
                    isCreating={true}
                  />
                </div>
              )}

              {/* Lista de Videos */}
              <div className="space-y-4">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    {editingVideo?.id === video.id && !isCreatingNewVideo ? (
                      <VideoEditForm
                        video={editingVideo}
                        onSave={handleSaveVideo}
                        onCancel={() => setEditingVideo(null)}
                        isCreating={false}
                      />
                    ) : (
                      <VideoRow
                        video={video}
                        onEdit={() => setEditingVideo(video)}
                        onDelete={() => handleDeleteVideo(video.id)}
                        getDifficultyColor={getDifficultyColor}
                      />
                    )}
                  </div>
                ))}
              </div>

              {filteredVideos.length === 0 && (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron videos</h3>
                  <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'users' && (
            <div>
              <div className="flex items-center mb-8">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-full mr-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h2>
                  <p className="text-gray-600">Administra usuarios registrados y sus suscripciones</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-blue-500">
                  <h3 className="text-2xl font-bold text-blue-600">{users.length}</h3>
                  <p className="text-gray-600">Usuarios Totales</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-green-500">
                  <h3 className="text-2xl font-bold text-green-600">{users.filter(u => u.isSubscribed).length}</h3>
                  <p className="text-gray-600">Suscriptores Activos</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-yellow-500">
                  <h3 className="text-2xl font-bold text-yellow-600">{users.filter(u => !u.isSubscribed).length}</h3>
                  <p className="text-gray-600">Usuarios Gratuitos</p>
                </div>
              </div>

              {/* Users List */}
              {users.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay usuarios registrados</h3>
                  <p className="text-gray-500">Los usuarios aparecerán aquí cuando se registren.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full ${user.isSubscribed ? 'bg-gradient-to-r from-purple-100 to-pink-100' : 'bg-gray-100'}`}>
                            <User className={`h-6 w-6 ${user.isSubscribed ? 'text-purple-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                              {user.name}
                              {user.isSubscribed && <Crown className="h-4 w-4 text-yellow-500 ml-2" />}
                            </h3>
                            <p className="text-gray-600 flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              user.isSubscribed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.isSubscribed ? 'Premium' : 'Gratuito'}
                            </span>
                            <button
                              onClick={() => handleToggleUserSubscription(user.email)}
                              className={`py-2 px-4 rounded-lg font-semibold transition-all ${
                                user.isSubscribed
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                            >
                              {user.isSubscribed ? 'Cancelar' : 'Activar'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-sm text-gray-500">Fecha de registro</p>
                          <p className="font-medium flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {new Date(user.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        {user.isSubscribed && user.subscriptionExpiry && (
                          <div>
                            <p className="text-sm text-gray-500">Suscripción válida hasta</p>
                            <p className="font-medium text-green-600">
                              {new Date(user.subscriptionExpiry).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Estado</p>
                          <p className={`font-medium ${user.isSubscribed ? 'text-purple-600' : 'text-gray-600'}`}>
                            {user.isSubscribed ? 'Acceso Premium' : 'Acceso Básico'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedTab === 'subscriptions' && (
            <>
              {/* Subscription Sub-tabs */}
              <div className="flex space-x-1 mb-8 bg-gray-50 p-1 rounded-lg">
                <button
                  onClick={() => setSubscriptionSubTab('pending')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    subscriptionSubTab === 'pending'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Clock className="h-4 w-4 inline mr-2" />
                  Pendientes ({subscriptions.filter(s => s.status === 'pending').length})
                </button>
                <button
                  onClick={() => setSubscriptionSubTab('active')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    subscriptionSubTab === 'active'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  Activas ({subscriptions.filter(s => 
                    (s.status === 'active' || (s.status === 'cancelled' && s.activeUntil && new Date(s.activeUntil) > new Date())) && 
                    (!s.expiryDate || new Date(s.expiryDate) > new Date())
                  ).length})
                </button>
                <button
                  onClick={() => setSubscriptionSubTab('all')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    subscriptionSubTab === 'all'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Eye className="h-4 w-4 inline mr-2" />
                  Todas ({subscriptions.length})
                </button>
              </div>

              {/* Subscriptions List */}
              {filteredSubscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    {subscriptionSubTab === 'pending' ? 'No hay suscripciones pendientes' : 
                     subscriptionSubTab === 'active' ? 'No hay suscripciones activas' : 
                     'No hay suscripciones registradas'}
                  </h3>
                  <p className="text-gray-500">
                    {subscriptionSubTab === 'pending' ? 'Las nuevas solicitudes aparecerán aquí.' : 
                     'Las suscripciones aparecerán aquí cuando se registren.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubscriptions.map((subscription, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-full">
                            <User className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{subscription.name}</h3>
                            <p className="text-gray-600 flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {subscription.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(subscription.status)}`}>
                            {getStatusText(subscription.status)}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            <DollarSign className="h-4 w-4 inline mr-1" />
                            ${subscription.price.toLocaleString('es-AR')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Fecha de solicitud</p>
                          <p className="font-medium flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {new Date(subscription.subscribedAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Plan</p>
                          <p className="font-medium">{subscription.planType} Videos</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Método de pago</p>
                          <p className="font-medium">Transferencia Bancaria</p>
                        </div>
                      </div>

                      {subscription.status === 'pending' && (
                        <div className="flex space-x-3 pt-4 border-t">
                          <button
                            onClick={() => handleApproveSubscription(subscription.email)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 px-4 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center space-x-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Aprobar Suscripción</span>
                          </button>
                          <button
                            onClick={() => handleRejectSubscription(subscription.email)}
                            className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white py-2 px-4 rounded-lg font-semibold hover:from-red-600 hover:to-rose-600 transition-all flex items-center justify-center space-x-2"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      )}

                      {subscription.status === 'active' && subscription.expiryDate && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-gray-600">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Válida hasta: {new Date(subscription.expiryDate).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      )}
                      
                      {subscription.status === 'cancelled' && subscription.activeUntil && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-gray-600">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Activa hasta: {new Date(subscription.activeUntil).toLocaleDateString('es-ES')}
                          </p>
                          <p className="text-sm text-orange-600 mt-1">
                            ⚠ Suscripción cancelada
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

// Componente para editar productos
interface ProductEditFormProps {
  product: Product;
  onSave: (product: Product) => void;
  onCancel: () => void;
  isCreating: boolean;
}

const ProductEditForm: React.FC<ProductEditFormProps> = ({ product, onSave, onCancel, isCreating }) => {
  const [formData, setFormData] = useState({
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice || '',
    image: product.image,
    inStock: product.inStock,
    category: product.category,
    color: product.color,
    size: product.size
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedProduct: Product = {
      ...product,
      name: formData.name,
      price: Number(formData.price),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      image: formData.image,
      inStock: formData.inStock,
      category: formData.category,
      color: formData.color,
      size: formData.size,
      type: formData.category
    };

    onSave(updatedProduct);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del producto:
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría:
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Phalaenopsis">Phalaenopsis</option>
            <option value="Cattleya">Cattleya</option>
            <option value="Dendrobium">Dendrobium</option>
            <option value="Oncidium">Oncidium</option>
            <option value="Vanda">Vanda</option>
            <option value="Macetas">Macetas</option>
            <option value="Accesorios">Accesorios</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio actual ($):
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio original ($) - opcional:
          </label>
          <input
            type="number"
            value={formData.originalPrice}
            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color:
          </label>
          <select
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="pink">Rosa</option>
            <option value="purple">Púrpura</option>
            <option value="white">Blanco</option>
            <option value="yellow">Amarillo</option>
            <option value="orange">Naranja</option>
            <option value="red">Rojo</option>
            <option value="blue">Azul</option>
            <option value="green">Verde</option>
            <option value="multicolor">Multicolor</option>
            <option value="natural">Natural</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tamaño:
          </label>
          <select
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="Pequeña">Pequeña</option>
            <option value="Mediana">Mediana</option>
            <option value="Grande">Grande</option>
            <option value="Extra Grande">Extra Grande</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL de la imagen:
        </label>
        <input
          type="url"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="inStock"
          checked={formData.inStock}
          onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
          className="mr-2 rounded text-blue-500 focus:ring-blue-500"
        />
        <label htmlFor="inStock" className="text-sm font-medium text-gray-700">
          Producto disponible
        </label>
      </div>

      <div className="flex space-x-3 pt-4 border-t">
        <button
          type="submit"
          className={`flex-1 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
            isCreating 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
          }`}
        >
          {isCreating ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{isCreating ? 'Crear Producto' : 'Guardar Cambios'}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center space-x-2"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
      </div>
    </form>
  );
};

// Componente para mostrar productos
interface ProductRowProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, onEdit, onDelete }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4 flex-1">
        <img
          src={product.image}
          alt={product.name}
          className="w-20 h-20 object-cover rounded-lg"
        />
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="bg-gray-100 px-2 py-1 rounded">{product.category}</span>
            <span className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              ${product.price.toLocaleString('es-AR')}
            </span>
            <span className={`flex items-center ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
              {product.inStock ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {product.inStock ? 'Disponible' : 'Agotado'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onEdit}
          className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
          title="Editar producto"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
          title="Eliminar producto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Componente para editar videos
interface VideoEditFormProps {
  video: Video;
  onSave: (video: Video) => void;
  onCancel: () => void;
  isCreating: boolean;
}

const VideoEditForm: React.FC<VideoEditFormProps> = ({ video, onSave, onCancel, isCreating }) => {
  const [formData, setFormData] = useState({
    title: video.title,
    description: video.description,
    duration: video.duration,
    thumbnail: video.thumbnail,
    category: video.category,
    difficulty: video.difficulty,
    instructor: video.instructor,
    videoUrl: video.videoUrl || '',
    isActive: video.isActive
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedVideo: Video = {
      ...video,
      title: formData.title,
      description: formData.description,
      duration: formData.duration,
      thumbnail: formData.thumbnail,
      category: formData.category,
      difficulty: formData.difficulty as 'Principiante' | 'Intermedio' | 'Avanzado',
      instructor: formData.instructor,
      videoUrl: formData.videoUrl,
      isActive: formData.isActive
    };

    onSave(updatedVideo);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título del video:
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción:
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duración (mm:ss):
          </label>
          <input
            type="text"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="45:30"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría:
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dificultad:
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            <option value="Principiante">Principiante</option>
            <option value="Intermedio">Intermedio</option>
            <option value="Avanzado">Avanzado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instructor:
          </label>
          <input
            type="text"
            value={formData.instructor}
            onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL de la miniatura:
          </label>
          <input
            type="url"
            value={formData.thumbnail}
            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL del video:
          </label>
          <input
            type="url"
            value={formData.videoUrl}
            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            placeholder="https://ejemplo.com/video.mp4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="mr-2 rounded text-purple-500 focus:ring-purple-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Video activo (visible para suscriptores)
        </label>
      </div>

      <div className="flex space-x-3 pt-4 border-t">
        <button
          type="submit"
          className={`flex-1 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
            isCreating 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
          }`}
        >
          {isCreating ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{isCreating ? 'Crear Video' : 'Guardar Cambios'}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center space-x-2"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
      </div>
    </form>
  );
};

// Componente para mostrar videos
interface VideoRowProps {
  video: Video;
  onEdit: () => void;
  onDelete: () => void;
  getDifficultyColor: (difficulty: string) => string;
}

const VideoRow: React.FC<VideoRowProps> = ({ video, onEdit, onDelete, getDifficultyColor }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-24 h-16 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg">
            <Play className="h-6 w-6 text-white" />
          </div>
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs">
            {video.duration}
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-gray-800">{video.title}</h3>
            {video.isActive ? (
              <Eye className="h-4 w-4 text-green-500" title="Activo" />
            ) : (
              <EyeOff className="h-4 w-4 text-red-500" title="Inactivo" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{video.description}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">{video.category}</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(video.difficulty)}`}>
              {video.difficulty}
            </span>
            <span>Por {video.instructor}</span>
            <span>{video.views.toLocaleString()} vistas</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onEdit}
          className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
          title="Editar video"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
          title="Eliminar video"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Componente para editar accesorios
interface AccessoryEditFormProps {
  accessory: Accessory;
  onSave: (accessory: Accessory) => void;
  onCancel: () => void;
  isCreating: boolean;
}

const AccessoryEditForm: React.FC<AccessoryEditFormProps> = ({ accessory, onSave, onCancel, isCreating }) => {
  const [formData, setFormData] = useState({
    name: accessory.name,
    price: accessory.price,
    originalPrice: accessory.originalPrice || '',
    image: accessory.image,
    category: accessory.category,
    description: accessory.description,
    inStock: accessory.inStock,
    rating: accessory.rating,
    reviews: accessory.reviews
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedAccessory: Accessory = {
      ...accessory,
      name: formData.name,
      price: Number(formData.price),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      image: formData.image,
      category: formData.category,
      description: formData.description,
      inStock: formData.inStock,
      rating: Number(formData.rating),
      reviews: Number(formData.reviews)
    };

    onSave(updatedAccessory);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del accesorio:
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría:
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          >
            <option value="Fertilizantes">Fertilizantes</option>
            <option value="Herramientas">Herramientas</option>
            <option value="Medición">Medición</option>
            <option value="Iluminación">Iluminación</option>
            <option value="Humedad">Humedad</option>
            <option value="Análisis">Análisis</option>
            <option value="Sustrato">Sustrato</option>
            <option value="Macetas">Macetas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio actual ($):
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio original ($) - opcional:
          </label>
          <input
            type="number"
            value={formData.originalPrice}
            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rating (1-5):
          </label>
          <input
            type="number"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
            min="1"
            max="5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de reseñas:
          </label>
          <input
            type="number"
            value={formData.reviews}
            onChange={(e) => setFormData({ ...formData, reviews: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL de la imagen:
        </label>
        <input
          type="url"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción:
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          required
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="accessoryInStock"
          checked={formData.inStock}
          onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
          className="mr-2 rounded text-orange-500 focus:ring-orange-500"
        />
        <label htmlFor="accessoryInStock" className="text-sm font-medium text-gray-700">
          Producto disponible
        </label>
      </div>

      <div className="flex space-x-3 pt-4 border-t">
        <button
          type="submit"
          className={`flex-1 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
            isCreating 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
              : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
          }`}
        >
          {isCreating ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{isCreating ? 'Crear Accesorio' : 'Guardar Cambios'}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center space-x-2"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
      </div>
    </form>
  );
};

// Componente para mostrar accesorios
interface AccessoryRowProps {
  accessory: Accessory;
  onEdit: () => void;
  onDelete: () => void;
}

const AccessoryRow: React.FC<AccessoryRowProps> = ({ accessory, onEdit, onDelete }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4 flex-1">
        <img
          src={accessory.image}
          alt={accessory.name}
          className="w-20 h-20 object-cover rounded-lg"
        />
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{accessory.name}</h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{accessory.description}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="bg-gray-100 px-2 py-1 rounded">{accessory.category}</span>
            <span className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              ${accessory.price.toLocaleString('es-AR')}
            </span>
            <span className={`flex items-center ${accessory.inStock ? 'text-green-600' : 'text-red-600'}`}>
              {accessory.inStock ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {accessory.inStock ? 'Disponible' : 'Agotado'}
            </span>
            <div className="flex items-center">
              <div className="flex items-center mr-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < accessory.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs">({accessory.reviews})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onEdit}
          className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition-colors"
          title="Editar accesorio"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
          title="Eliminar accesorio"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;