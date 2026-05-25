import React, { useState } from 'react';
import { ShoppingCart, User, Menu, Flower, Heart, Package, Shield, X } from 'lucide-react';
import SearchBar from './SearchBar';

interface HeaderProps {
  cartCount: number;
  favoritesCount: number;
  onCartClick: () => void;
  onFavoritesClick: () => void;
  onUserClick: () => void;
  onNavigate: (page: 'home' | 'accessories' | 'care' | 'orchids' | 'arrangements' | 'pots' | 'checkout' | 'terms' | 'privacy' | 'orders' | 'account-settings' | 'admin') => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  user: { name: string; email: string; isAdmin?: boolean } | null;
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
  const handleMobileNavClick = (page: any) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#D9C7B4]/80 bg-[#E8DCCB]/95 shadow-sm backdrop-blur">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo y Nombre */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="rounded-full bg-[#F8DDEB] p-1.5 shadow-sm ring-1 ring-white/80">
              <Flower className="h-6 w-6 text-[#D96C9F] sm:h-8 sm:w-8" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-[#2F3A35] sm:text-2xl">Modo Plantas</h1>
              <p className="text-xs text-[#6B756F] sm:text-sm">Pasión por las Orquídeas</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-semibold text-[#2F3A35]">Club Orquídeas</h1>
            </div>
          </div>

          {/* Navegación Central - Desktop */}
          <nav className="hidden lg:flex items-center space-x-6">
            <button 
              onClick={() => onNavigate('home')}
              className="text-[#2F3A35] transition-colors hover:text-[#D96C9F] font-medium text-sm"
            >
              Inicio
            </button>
            <button 
              onClick={() => onNavigate('orchids')}
              className="text-[#2F3A35] transition-colors hover:text-[#D96C9F] font-medium text-sm"
            >
              Orquídeas
            </button>
            <button
              onClick={() => onNavigate('arrangements')}
              className="text-[#2F3A35] transition-colors hover:text-[#D96C9F] font-medium text-sm"
            >
              Arreglos
            </button>
            <button 
              onClick={() => onNavigate('pots')}
              className="text-[#2F3A35] transition-colors hover:text-[#D96C9F] font-medium text-sm"
            >
              Macetas
            </button>
            <button 
              onClick={() => onNavigate('accessories')}
              className="text-[#2F3A35] transition-colors hover:text-[#D96C9F] font-medium text-sm"
            >
              Accesorios
            </button>
            <button 
              onClick={() => onNavigate('care')}
              className="text-[#2F3A35] transition-colors hover:text-[#D96C9F] font-medium text-sm"
            >
              Cuidados
            </button>
            {user?.isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#2F3A35] transition-colors hover:text-[#D96C9F]"
              >
                <Shield className="h-4 w-4" />
                Admin
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
                onClick={() => onNavigate('account-settings')}
                className="hidden items-center gap-1 text-[#2F3A35] transition-colors hover:text-[#D96C9F] sm:flex"
                title="Mi perfil"
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden xl:inline text-sm font-medium">Mi perfil</span>
              </button>
            )}

            {user && (
              <button 
                onClick={() => onNavigate('orders')}
                className="hidden text-[#2F3A35] transition-colors hover:text-[#D96C9F] sm:block"
                title="Mis Pedidos"
              >
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
            
            {!user && (
              <button
                onClick={onUserClick}
                className="text-[#2F3A35] transition-colors hover:text-[#D96C9F]"
                title="Iniciar sesión"
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
            
            <button
              onClick={onFavoritesClick}
              className="relative text-[#2F3A35] transition-colors hover:text-[#D96C9F]"
            >
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              {favoritesCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-[#D96C9F] text-xs font-bold text-white sm:-right-2 sm:-top-2 sm:h-6 sm:w-6">
                  <span className="text-xs">{favoritesCount}</span>
                </span>
              )}
            </button>
            
            <button
              onClick={onCartClick}
              className="relative rounded-full bg-[#CFE3D4] p-1.5 text-[#2F3A35] shadow-sm transition-shadow hover:shadow-md sm:p-2"
            >
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-[#D96C9F] text-xs font-bold text-white sm:-right-2 sm:-top-2 sm:h-6 sm:w-6">
                  <span className="text-xs">{cartCount}</span>
                </span>
              )}
            </button>
            
            {/* Botón menú móvil */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1 text-[#2F3A35] lg:hidden"
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
          <div className="absolute left-0 right-0 top-full border-t border-[#D9C7B4]/80 bg-[#E8DCCB] shadow-lg lg:hidden">
            <nav className="container mx-auto px-4 py-4 space-y-3">
              <button 
                onClick={() => handleMobileNavClick('home')}
                className="block w-full rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
              >
                Inicio
              </button>
              <button 
                onClick={() => handleMobileNavClick('orchids')}
                className="block w-full rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
              >
                Orquídeas
              </button>
              <button
                onClick={() => handleMobileNavClick('arrangements')}
                className="block w-full rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
              >
                Arreglos
              </button>
              <button 
                onClick={() => handleMobileNavClick('pots')}
                className="block w-full rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
              >
                Macetas
              </button>
              <button 
                onClick={() => handleMobileNavClick('accessories')}
                className="block w-full rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
              >
                Accesorios
              </button>
              <button 
                onClick={() => handleMobileNavClick('care')}
                className="block w-full rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
              >
                Cuidados
              </button>
              {user && (
                <button
                  onClick={() => handleMobileNavClick('account-settings')}
                  className="flex w-full items-center rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span>Mi perfil</span>
                </button>
              )}
              {user && (
                <button 
                  onClick={() => handleMobileNavClick('orders')}
                  className="flex w-full items-center rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
                >
                  <Package className="h-4 w-4 mr-2" />
                  <span>Mis Pedidos</span>
                </button>
              )}
              {user?.isAdmin && (
                <button
                  onClick={() => handleMobileNavClick('admin')}
                  className="flex w-full items-center rounded px-3 py-2 text-left font-medium text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/55 hover:text-[#D96C9F]"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  <span>Panel administrador</span>
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
