import React, { useState } from 'react';
import { ShoppingCart, User, Menu, Heart, Package, Shield, X } from 'lucide-react';
import SearchBar from './SearchBar';

interface HeaderProps {
  cartCount: number;
  favoritesCount: number;
  onCartClick: () => void;
  onFavoritesClick: () => void;
  onUserClick: () => void;
  onNavigate: (page: 'home' | 'accessories' | 'care' | 'orchids' | 'interior' | 'exterior' | 'arrangements' | 'pots' | 'checkout' | 'terms' | 'privacy' | 'orders' | 'account-settings' | 'admin' | 'search') => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
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
  onSearchSubmit,
  user,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const handleMobileNavClick = (page: any) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#F1E3D4] bg-[#FFF8EF]/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-[1500px] px-3 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Logo y Nombre */}
          <div className="flex min-w-0 flex-shrink-0 items-center space-x-2">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FFF8EF] shadow-sm ring-1 ring-white/80 sm:h-14 sm:w-14">
              <img
                src="/modo-plantas-logo-icono-512.png"
                alt="Modo Plantas"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-[#16352B] sm:text-2xl">Modo Plantas</h1>
              <p className="text-xs text-[#6B7280] sm:text-sm">Pasión por la naturaleza</p>
            </div>
            <div className="min-w-0 sm:hidden">
              <h1 className="truncate text-base font-semibold text-[#16352B]">Modo Plantas</h1>
            </div>
          </div>

          {/* Navegación Central - Desktop */}
          <nav className="hidden items-center gap-1 xl:flex">
            <button 
              onClick={() => onNavigate('home')}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
            >
              Inicio
            </button>
            <button 
              onClick={() => onNavigate('orchids')}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
            >
              Orquídeas
            </button>
            <button
              onClick={() => onNavigate('interior')}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
            >
              Plantas de interior
            </button>
            <button
              onClick={() => onNavigate('exterior')}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
            >
              Plantas de exterior
            </button>
            <button
              onClick={() => onNavigate('arrangements')}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
            >
              Arreglos
            </button>
            <button 
              onClick={() => onNavigate('pots')}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
            >
              Macetas
            </button>
            <button 
              onClick={() => onNavigate('accessories')}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
            >
              Accesorios
            </button>
            <button 
              onClick={() => onNavigate('care')}
              className="rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
            >
              Cuidados
            </button>
            {user?.isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            )}
          </nav>

          {/* Acciones del Usuario */}
          <div className="flex flex-shrink-0 items-center space-x-1 sm:space-x-3">
            {/* Barra de búsqueda - Hidden en móvil */}
            <div className="hidden md:flex">
              <SearchBar searchQuery={searchQuery} onSearch={onSearch} onSubmit={onSearchSubmit} />
            </div>

            {user && (
              <button
                onClick={() => onNavigate('account-settings')}
                className="hidden items-center gap-1 rounded-full px-2 py-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61] sm:flex"
                title="Mi perfil"
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden xl:inline text-sm font-medium">Mi perfil</span>
              </button>
            )}

            {user && (
              <button 
                onClick={() => onNavigate('orders')}
                className="hidden rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61] sm:block"
                title="Mis Pedidos"
              >
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
            
            {!user && (
              <button
                onClick={onUserClick}
                className="rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
                title="Iniciar sesión"
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
            
            <button
              onClick={onFavoritesClick}
              className="relative rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
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
              className="relative rounded-full bg-[#E8F7EF] p-1.5 text-[#16352B] shadow-sm ring-1 ring-[#D2EBDD] transition-all hover:text-[#0F8F61] hover:shadow-md sm:p-2"
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
              className="rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] xl:hidden"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Barra de búsqueda móvil */}
        <div className="mt-3 md:hidden">
          <SearchBar searchQuery={searchQuery} onSearch={onSearch} onSubmit={onSearchSubmit} />
        </div>

        {/* Menú Móvil */}
        {isMobileMenuOpen && (
          <div className="absolute left-0 right-0 top-full max-h-[70vh] overflow-y-auto border-t border-[#F1E3D4] bg-[#FFF8EF] shadow-lg xl:hidden">
            <nav className="mx-auto max-w-[1500px] space-y-2 px-4 py-4">
              <button 
                onClick={() => handleMobileNavClick('home')}
                className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                Inicio
              </button>
              <button 
                onClick={() => handleMobileNavClick('orchids')}
                className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                Orquídeas
              </button>
              <button
                onClick={() => handleMobileNavClick('interior')}
                className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                Plantas de interior
              </button>
              <button
                onClick={() => handleMobileNavClick('exterior')}
                className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                Plantas de exterior
              </button>
              <button
                onClick={() => handleMobileNavClick('arrangements')}
                className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                Arreglos
              </button>
              <button 
                onClick={() => handleMobileNavClick('pots')}
                className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                Macetas
              </button>
              <button 
                onClick={() => handleMobileNavClick('accessories')}
                className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                Accesorios
              </button>
              <button 
                onClick={() => handleMobileNavClick('care')}
                className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              >
                Cuidados
              </button>
              {user && (
                <button
                  onClick={() => handleMobileNavClick('account-settings')}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span>Mi perfil</span>
                </button>
              )}
              {user && (
                <button 
                  onClick={() => handleMobileNavClick('orders')}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
                >
                  <Package className="h-4 w-4 mr-2" />
                  <span>Mis Pedidos</span>
                </button>
              )}
              {user?.isAdmin && (
                <button
                  onClick={() => handleMobileNavClick('admin')}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
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
