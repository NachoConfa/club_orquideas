import React, { useState } from 'react';
import { ShoppingCart, User, Menu, Flower, Heart, Package, Crown, Settings, X } from 'lucide-react';
import SearchBar from './SearchBar';

interface HeaderProps {
  cartCount: number;
  favoritesCount: number;
  onCartClick: () => void;
  onFavoritesClick: () => void;
  onUserClick: () => void;
  onNavigate: (page: 'home' | 'accessories' | 'care' | 'orchids' | 'pots' | 'checkout' | 'terms' | 'privacy' | 'orders' | 'videos' | 'admin-panel') => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  user: { name: string; email: string } | null;
}

const Header: React.FC<HeaderProps> = ({ 
  cartCount, 
  favoritesCount,
  onCartClick, 
  onFavoritesClick,
  onUserClick, 
  onNavigate, 
  searchQuery, 
  onSearch,
  user,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Verificar si el usuario es admin
  const isAdmin = user?.email === 'NachoGemerXD@hotmail.com';

  const handleMobileNavClick = (page: any) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo y Nombre */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="bg-white p-1.5 rounded-full shadow-md">
              <Flower className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-2xl font-bold text-white">Club de Las Orquídeas</h1>
              <p className="text-xs sm:text-sm text-emerald-100">Pasión por las Orquídeas</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-white">Club Orquídeas</h1>
            </div>
          </div>

          {/* Navegación Central - Desktop */}
          <nav className="hidden lg:flex items-center space-x-6">
            <button 
              onClick={() => onNavigate('home')}
              className="text-white hover:text-emerald-200 transition-colors font-medium text-sm"
            >
              Inicio
            </button>
            <button 
              onClick={() => onNavigate('orchids')}
              className="text-white hover:text-emerald-200 transition-colors font-medium text-sm"
            >
              Orquídeas
            </button>
            <button 
              onClick={() => onNavigate('pots')}
              className="text-white hover:text-emerald-200 transition-colors font-medium text-sm"
            >
              Macetas
            </button>
            <button 
              onClick={() => onNavigate('accessories')}
              className="text-white hover:text-emerald-200 transition-colors font-medium text-sm"
            >
              Accesorios
            </button>
            <button 
              onClick={() => onNavigate('care')}
              className="text-white hover:text-emerald-200 transition-colors font-medium text-sm"
            >
              Cuidados
            </button>
            <button 
              onClick={() => onNavigate('videos')}
              className="text-white hover:text-emerald-200 transition-colors font-medium flex items-center space-x-1 text-sm"
            >
              <span>Videos</span>
              <Crown className="h-3 w-3 text-yellow-400" />
            </button>
            {isAdmin && (
              <button 
                onClick={() => onNavigate('admin-panel')}
                className="text-white hover:text-emerald-200 transition-colors font-medium flex items-center space-x-1 text-sm"
                title="Administrar Productos"
              >
                <Settings className="h-3 w-3" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Acciones del Usuario */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Barra de búsqueda - Hidden en móvil */}
            <div className="hidden md:flex">
              <SearchBar searchQuery={searchQuery} onSearch={onSearch} />
            </div>

            {user && (
              <button 
                onClick={() => onNavigate('orders')}
                className="text-white hover:text-emerald-200 transition-colors hidden sm:block"
                title="Mis Pedidos"
              >
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
            
            <button 
              onClick={onUserClick}
              className="text-white hover:text-emerald-200 transition-colors"
            >
              <User className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            
            <button
              onClick={onFavoritesClick}
              className="relative text-white hover:text-emerald-200 transition-colors"
            >
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-pink-500 text-white text-xs rounded-full h-4 w-4 sm:h-6 sm:w-6 flex items-center justify-center font-bold animate-pulse">
                  <span className="text-xs">{favoritesCount}</span>
                </span>
              )}
            </button>
            
            <button
              onClick={onCartClick}
              className="relative bg-white text-emerald-500 p-1.5 sm:p-2 rounded-full shadow-md hover:shadow-lg transition-shadow"
            >
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-pink-500 text-white text-xs rounded-full h-4 w-4 sm:h-6 sm:w-6 flex items-center justify-center font-bold animate-pulse">
                  <span className="text-xs">{cartCount}</span>
                </span>
              )}
            </button>
            
            {/* Botón menú móvil */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white p-1"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Barra de búsqueda móvil */}
        <div className="md:hidden mt-3">
          <SearchBar searchQuery={searchQuery} onSearch={onSearch} />
        </div>

        {/* Menú Móvil */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute left-0 right-0 top-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-lg border-t border-emerald-400">
            <nav className="container mx-auto px-4 py-4 space-y-3">
              <button 
                onClick={() => handleMobileNavClick('home')}
                className="block w-full text-left text-white hover:text-emerald-200 transition-colors font-medium py-2 px-3 rounded hover:bg-emerald-500/20"
              >
                Inicio
              </button>
              <button 
                onClick={() => handleMobileNavClick('orchids')}
                className="block w-full text-left text-white hover:text-emerald-200 transition-colors font-medium py-2 px-3 rounded hover:bg-emerald-500/20"
              >
                Orquídeas
              </button>
              <button 
                onClick={() => handleMobileNavClick('pots')}
                className="block w-full text-left text-white hover:text-emerald-200 transition-colors font-medium py-2 px-3 rounded hover:bg-emerald-500/20"
              >
                Macetas
              </button>
              <button 
                onClick={() => handleMobileNavClick('accessories')}
                className="block w-full text-left text-white hover:text-emerald-200 transition-colors font-medium py-2 px-3 rounded hover:bg-emerald-500/20"
              >
                Accesorios
              </button>
              <button 
                onClick={() => handleMobileNavClick('care')}
                className="block w-full text-left text-white hover:text-emerald-200 transition-colors font-medium py-2 px-3 rounded hover:bg-emerald-500/20"
              >
                Cuidados
              </button>
              <button 
                onClick={() => handleMobileNavClick('videos')}
                className="flex items-center w-full text-left text-white hover:text-emerald-200 transition-colors font-medium py-2 px-3 rounded hover:bg-emerald-500/20"
              >
                <span>Videos Premium</span>
                <Crown className="h-4 w-4 text-yellow-400 ml-2" />
              </button>
              {user && (
                <button 
                  onClick={() => handleMobileNavClick('orders')}
                  className="flex items-center w-full text-left text-white hover:text-emerald-200 transition-colors font-medium py-2 px-3 rounded hover:bg-emerald-500/20"
                >
                  <Package className="h-4 w-4 mr-2" />
                  <span>Mis Pedidos</span>
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={() => handleMobileNavClick('admin-panel')}
                  className="flex items-center w-full text-left text-white hover:text-emerald-200 transition-colors font-medium py-2 px-3 rounded hover:bg-emerald-500/20"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Panel de Admin</span>
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;