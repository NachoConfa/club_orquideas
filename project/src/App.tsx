import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Cart from './components/Cart';
import Favorites from './components/Favorites';
import AuthModal from './components/AuthModal';
import ProductCard from './components/ProductCard';
import Filters from './components/Filters';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Accessories from './pages/Accessories';
import CareGuide from './pages/CareGuide';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import ResetPassword from './pages/ResetPassword';
import AccountSettings from './pages/AccountSettings';
import PremiumVideos from './pages/PremiumVideos';
import AdminPanel from './pages/AdminPanel';
import MercadoPagoTransfer from './pages/MercadoPagoTransfer';
import ProductManagement from './pages/ProductManagement';
import { getProducts, checkProductAvailability } from './data/products';
import { sendProductAvailabilityEmail } from './services/emailService';
import { Flower, Star, Sparkles, Heart, ShoppingBag, Crown, Package, Play, Users, CheckCircle, Edit, Save, X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color: string;
  size: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  color: string;
  size: string;
  inStock: boolean;
  type: string;
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
  isActive: boolean;
  videoUrl?: string;
  createdAt: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'accessories' | 'care' | 'orchids' | 'pots' | 'checkout' | 'terms' | 'privacy' | 'orders' | 'videos' | 'product-management' | 'admin-panel' | 'reset-password' | 'account-settings' | 'mercadopago-transfer'>('home');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    colors: [] as string[],
    sizes: [] as string[],
    types: [] as string[],
    priceRange: [0, 50000] as [number, number]
  });

  // Cargar datos del usuario al iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem('orchid-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    const savedCart = localStorage.getItem('orchid-cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }

    const savedFavorites = localStorage.getItem('orchid-favorites');
    if (savedFavorites) {
      setFavoriteItems(JSON.parse(savedFavorites));
    }

    // Verificar disponibilidad de productos favoritos
    checkProductAvailability();
  }, []);

  // Guardar carrito en localStorage
  useEffect(() => {
    localStorage.setItem('orchid-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Guardar favoritos en localStorage
  useEffect(() => {
    localStorage.setItem('orchid-favorites', JSON.stringify(favoriteItems));
  }, [favoriteItems]);

  const handleLogin = (email: string, password: string) => {
    const userData = { name: email.split('@')[0], email };
    setUser(userData);
    localStorage.setItem('orchid-user', JSON.stringify(userData));
  };

  const handleRegister = (name: string, email: string, password: string) => {
    const userData = { name, email };
    setUser(userData);
    localStorage.setItem('orchid-user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('orchid-user');
  };

  const handleUpdateUser = (updatedUser: { name: string; email: string }) => {
    setUser(updatedUser);
    localStorage.setItem('orchid-user', JSON.stringify(updatedUser));
  };

  const addToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const cartItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        color: product.color,
        size: product.size
      };
      setCartItems([...cartItems, cartItem]);
    }
    
    setIsCartOpen(true);
  };

  const updateCartQuantity = (id: number, quantity: number) => {
    if (quantity === 0) {
      setCartItems(cartItems.filter(item => item.id !== id));
    } else {
      setCartItems(cartItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const toggleFavorite = (product: Product) => {
    const isFavorite = favoriteItems.some(item => item.id === product.id);
    
    if (isFavorite) {
      setFavoriteItems(favoriteItems.filter(item => item.id !== product.id));
    } else {
      setFavoriteItems([...favoriteItems, product]);
      
      // Si el producto no está en stock, enviar notificación de disponibilidad
      if (!product.inStock && user) {
        sendProductAvailabilityEmail(user.email, product.name)
          .then(() => {
            console.log(`📧 Notificación de disponibilidad enviada para ${product.name}`);
          })
          .catch(error => {
            console.error('Error enviando notificación:', error);
          });
      }
    }
  };

  const removeFavorite = (id: number) => {
    setFavoriteItems(favoriteItems.filter(item => item.id !== id));
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      colors: [],
      sizes: [],
      types: [],
      priceRange: [0, 50000]
    });
  };

  const getFilteredProducts = () => {
    let products = getProducts();
    
    // Aplicar filtros de búsqueda
    if (searchQuery) {
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Aplicar filtros
    if (filters.colors.length > 0) {
      products = products.filter(product => filters.colors.includes(product.color));
    }

    if (filters.sizes.length > 0) {
      products = products.filter(product => filters.sizes.includes(product.size));
    }

    if (filters.types.length > 0) {
      products = products.filter(product => filters.types.includes(product.type));
    }

    products = products.filter(product => 
      product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    );

    return products;
  };

  const getProductsByType = (type: string) => {
    return getFilteredProducts().filter(product => product.type === type);
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const favoritesCount = favoriteItems.length;

  // Verificar si el usuario es admin
  const isAdmin = user?.email === 'NachoGemerXD@hotmail.com';



  if (currentPage === 'admin-panel' && isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => setIsAuthModalOpen(true)}
          onNavigate={setCurrentPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          user={user}
        />
        <AdminPanel onBack={() => setCurrentPage('home')} user={user} />
        <Footer onNavigate={setCurrentPage} />
        
        <Cart
          items={cartItems}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={() => {
            setIsCartOpen(false);
            setCurrentPage('checkout');
          }}
        />

        <Favorites
          items={favoriteItems}
          isOpen={isFavoritesOpen}
          onClose={() => setIsFavoritesOpen(false)}
          onRemoveItem={removeFavorite}
          onAddToCart={addToCart}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
          user={user}
          onLogout={handleLogout}
          onNavigateToSettings={() => {
            setIsAuthModalOpen(false);
            setCurrentPage('account-settings');
          }}
        />
      </div>
    );
  }

  if (currentPage === 'reset-password') {
    return (
      <ResetPassword 
        onBack={() => setCurrentPage('home')}
        onPasswordReset={() => {
          setCurrentPage('home');
          setIsAuthModalOpen(true);
        }}
      />
    );
  }

  if (currentPage === 'mercadopago-transfer') {
    return (
      <MercadoPagoTransfer 
        onBack={() => setCurrentPage('home')}
        onPaymentComplete={(reference) => {
          console.log('Payment completed:', reference);
          setCurrentPage('videos');
        }}
      />
    );
  }

  if (currentPage === 'account-settings' && user) {
    return (
      <AccountSettings 
        user={user}
        onBack={() => setCurrentPage('home')}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

  if (currentPage === 'orders') {
    return <Orders onBack={() => setCurrentPage('home')} user={user} />;
  }

  if (currentPage === 'videos') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => setIsAuthModalOpen(true)}
          onNavigate={setCurrentPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          user={user}
        />
        <PremiumVideos onBack={() => setCurrentPage('home')} user={user} />
        <Footer onNavigate={setCurrentPage} />
        
        <Cart
          items={cartItems}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={() => {
            setIsCartOpen(false);
            setCurrentPage('checkout');
          }}
        />

        <Favorites
          items={favoriteItems}
          isOpen={isFavoritesOpen}
          onClose={() => setIsFavoritesOpen(false)}
          onRemoveItem={removeFavorite}
          onAddToCart={addToCart}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
          user={user}
          onLogout={handleLogout}
          onNavigateToSettings={() => {
            setIsAuthModalOpen(false);
            setCurrentPage('account-settings');
          }}
        />
      </div>
    );
  }

  if (currentPage === 'product-management' && isAdmin) {
    return <ProductManagement onBack={() => setCurrentPage('home')} user={user} />;
  }

  if (currentPage === 'checkout') {
    return (
      <Checkout
        items={cartItems}
        onBack={() => setCurrentPage('home')}
        onOrderComplete={() => {
          clearCart();
          setCurrentPage('home');
        }}
        user={user}
      />
    );
  }

  if (currentPage === 'accessories') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => setIsAuthModalOpen(true)}
          onNavigate={setCurrentPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          user={user}
        />
        <Accessories
          onBack={() => setCurrentPage('home')}
          onAddToCart={addToCart}
          onToggleFavorite={toggleFavorite}
          favoriteItems={favoriteItems}
        />
        <Footer onNavigate={setCurrentPage} />
        
        <Cart
          items={cartItems}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={() => {
            setIsCartOpen(false);
            setCurrentPage('checkout');
          }}
        />

        <Favorites
          items={favoriteItems}
          isOpen={isFavoritesOpen}
          onClose={() => setIsFavoritesOpen(false)}
          onRemoveItem={removeFavorite}
          onAddToCart={addToCart}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
          user={user}
          onLogout={handleLogout}
          onNavigateToSettings={() => {
            setIsAuthModalOpen(false);
            setCurrentPage('account-settings');
          }}
        />
      </div>
    );
  }

  if (currentPage === 'care') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => setIsAuthModalOpen(true)}
          onNavigate={setCurrentPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          user={user}
        />
        <CareGuide onBack={() => setCurrentPage('home')} />
        <Footer onNavigate={setCurrentPage} />
        
        <Cart
          items={cartItems}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={() => {
            setIsCartOpen(false);
            setCurrentPage('checkout');
          }}
        />

        <Favorites
          items={favoriteItems}
          isOpen={isFavoritesOpen}
          onClose={() => setIsFavoritesOpen(false)}
          onRemoveItem={removeFavorite}
          onAddToCart={addToCart}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
          user={user}
          onLogout={handleLogout}
          onNavigateToSettings={() => {
            setIsAuthModalOpen(false);
            setCurrentPage('account-settings');
          }}
        />
      </div>
    );
  }

  if (currentPage === 'privacy') {
    return <PrivacyPolicy onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'terms') {
    return <TermsAndConditions onBack={() => setCurrentPage('home')} />;
  }

  const orchidProducts = getProductsByType('Phalaenopsis')
    .concat(getProductsByType('Cattleya'))
    .concat(getProductsByType('Dendrobium'))
    .concat(getProductsByType('Oncidium'))
    .concat(getProductsByType('Vanda'));

  const potProducts = getProductsByType('Macetas');

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50">
      <Header
        cartCount={cartCount}
        favoritesCount={favoritesCount}
        onCartClick={() => setIsCartOpen(true)}
        onFavoritesClick={() => setIsFavoritesOpen(true)}
        onUserClick={() => setIsAuthModalOpen(true)}
        onNavigate={setCurrentPage}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        user={user}
      />

      {/* Hero Section */}
      {currentPage === 'home' && (
        <>
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-emerald-500/10" />
            <div className="container mx-auto px-4 relative">
              <div className="text-center max-w-4xl mx-auto">
                <div className="flex items-center justify-center mb-6">
                  <Sparkles className="h-12 w-12 text-pink-500 mr-4 animate-pulse" />
                  <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 to-emerald-500 bg-clip-text text-transparent">
                    Club de Las Orquídeas
                  </h1>
                  <Sparkles className="h-12 w-12 text-emerald-500 ml-4 animate-pulse" />
                </div>
                <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                  Descubre la belleza extraordinaria de las orquídeas más exquisitas. 
                  Cada flor cuenta una historia de elegancia y pasión.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => setCurrentPage('orchids')}
                    className="bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 px-8 rounded-full font-semibold text-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <Flower className="inline h-6 w-6 mr-2" />
                    Explorar Orquídeas
                  </button>
                  <button 
                    onClick={() => setCurrentPage('videos')}
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-4 px-8 rounded-full font-semibold text-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center"
                  >
                    <Crown className="inline h-6 w-6 mr-2" />
                    Videos Premium
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Products */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                  Orquídeas Destacadas
                </h2>
                <p className="text-xl text-gray-600">
                  Las variedades más hermosas y populares de nuestra colección
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12">
                {orchidProducts.slice(0, 6).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favoriteItems.some(item => item.id === product.id)}
                  />
                ))}
              </div>

              <div className="text-center">
                <button 
                  onClick={() => setCurrentPage('orchids')}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-8 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105"
                >
                  Ver Todas las Orquídeas
                </button>
              </div>
            </div>
          </section>

          {/* Macetas Section */}
          <section className="py-16 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                  Macetas Artesanales
                </h2>
                <p className="text-xl text-gray-600">
                  El hogar perfecto para tus orquídeas más preciadas
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12">
                {potProducts.slice(0, 3).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favoriteItems.some(item => item.id === product.id)}
                  />
                ))}
              </div>

              <div className="text-center">
                <button 
                  onClick={() => setCurrentPage('pots')}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-8 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105"
                >
                  Ver Todas las Macetas
                </button>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-pink-500 to-rose-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Flower className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">500+</h3>
                  <p className="text-gray-600">Orquídeas Únicas</p>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">1000+</h3>
                  <p className="text-gray-600">Clientes Felices</p>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">4.9</h3>
                  <p className="text-gray-600">Calificación Promedio</p>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">7</h3>
                  <p className="text-gray-600">Años de Experiencia</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Products Page */}
      {(currentPage === 'orchids' || currentPage === 'pots') && (
        <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            <div className="lg:w-1/4 lg:flex-shrink-0">
              <Filters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
              />
            </div>
            <div className="lg:w-3/4 min-w-0">
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">
                  {currentPage === 'orchids' ? 'Nuestras Orquídeas' : 'Macetas Artesanales'}
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  {currentPage === 'orchids' 
                    ? 'Descubre nuestra colección completa de orquídeas exóticas'
                    : 'Macetas únicas diseñadas especialmente para orquídeas'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {(currentPage === 'orchids' ? orchidProducts : potProducts).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favoriteItems.some(item => item.id === product.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer onNavigate={setCurrentPage} />

      <Cart
        items={cartItems}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          setCurrentPage('checkout');
        }}
      />

      <Favorites
        items={favoriteItems}
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        onRemoveItem={removeFavorite}
        onAddToCart={addToCart}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        user={user}
        onLogout={handleLogout}
        onNavigateToSettings={() => {
          setIsAuthModalOpen(false);
          setCurrentPage('account-settings');
        }}
      />
    </div>
  );
}

export default App;