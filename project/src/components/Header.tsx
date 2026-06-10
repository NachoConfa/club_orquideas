import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  User,
  X,
} from '../lib/icons';
import SearchBar from './SearchBar';
import { getActiveProductCollections } from '../services/collectionService';

type HeaderPage =
  | 'home'
  | 'accessories'
  | 'collections'
  | 'care'
  | 'orchids'
  | 'interior'
  | 'exterior'
  | 'arrangements'
  | 'pots'
  | 'checkout'
  | 'terms'
  | 'privacy'
  | 'orders'
  | 'account-settings'
  | 'admin'
  | 'search';

interface HeaderProps {
  cartCount: number;
  favoritesCount: number;
  onCartClick: () => void;
  onFavoritesClick: () => void;
  onUserClick: () => void;
  onNavigate: (page: HeaderPage) => void;
  onPathNavigate?: (path: string) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  user: { name: string; email: string; isAdmin?: boolean } | null;
}

type DropdownItem = {
  label: string;
  page?: HeaderPage;
  path?: string;
};

const buyLinks: DropdownItem[] = [
  { label: 'Orquídeas', page: 'orchids' },
  { label: 'Plantas de interior', page: 'interior' },
  { label: 'Plantas de exterior', page: 'exterior' },
  { label: 'Arreglos', page: 'arrangements' },
  { label: 'Macetas', page: 'pots' },
];


const desktopNavButtonClass =
  'whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]';

const desktopDropdownButtonClass =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]';

const desktopAdminNavButtonClass =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E8F7EF] px-3 py-2 text-sm font-semibold text-[#0F8F61] transition-colors hover:bg-[#D2EBDD]';

const dropdownShellClass =
  'absolute left-1/2 top-full z-50 w-[240px] -translate-x-1/2 pt-2';

const dropdownPanelClass =
  'rounded-[18px] border border-[#F1E3D4] bg-[#FFFCF7] p-[10px] shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-white/70';

const dropdownItemClass =
  'block w-full rounded-xl px-3.5 py-3 text-left text-[14px] font-medium leading-tight text-[#16352B] transition-colors duration-150 hover:bg-[#E8F7EF] hover:text-[#0F8F61]';

const mobileNavButtonClass =
  'block w-full rounded-xl px-3 py-2.5 text-left font-medium text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]';

const mobileSubNavButtonClass =
  'block w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-[#1F2933] transition-colors hover:bg-white hover:text-[#0F8F61]';

const Header: React.FC<HeaderProps> = ({
  cartCount,
  favoritesCount,
  onCartClick,
  onFavoritesClick,
  onUserClick,
  onNavigate,
  onPathNavigate,
  searchQuery,
  onSearch,
  onSearchSubmit,
  user,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<'buy' | 'collections' | null>(null);
  const dropdownCloseTimeoutRef = useRef<number | null>(null);
  const [loadedCollectionLinks, setLoadedCollectionLinks] = useState<DropdownItem[] | null>(null);
  const safeBuyLinks = Array.isArray(buyLinks) ? buyLinks : [];
  const safeCollectionLinks: DropdownItem[] = [
    { label: 'Ver todas', page: 'collections' },
    ...(loadedCollectionLinks ?? []),
  ];

  const clearDropdownCloseTimeout = () => {
    if (dropdownCloseTimeoutRef.current !== null) {
      window.clearTimeout(dropdownCloseTimeoutRef.current);
      dropdownCloseTimeoutRef.current = null;
    }
  };

  const openDesktopDropdown = (menu: 'buy' | 'collections') => {
    clearDropdownCloseTimeout();
    setOpenDesktopMenu(menu);
  };

  const scheduleDesktopDropdownClose = () => {
    clearDropdownCloseTimeout();
    dropdownCloseTimeoutRef.current = window.setTimeout(() => {
      setOpenDesktopMenu(null);
      dropdownCloseTimeoutRef.current = null;
    }, 180);
  };

  useEffect(() => {
    return () => clearDropdownCloseTimeout();
  }, []);

  useEffect(() => {
    let cancelled = false;
    getActiveProductCollections()
      .then((collections) => {
        if (cancelled) return;
        setLoadedCollectionLinks(
          collections.map((c) => ({ label: c.title, path: `/colecciones/${c.slug}` }))
        );
      })
      .catch(() => {
        if (!cancelled) setLoadedCollectionLinks([]);
      });
    return () => { cancelled = true; };
  }, []);

  const closeMenus = () => {
    clearDropdownCloseTimeout();
    setOpenDesktopMenu(null);
    setIsMobileMenuOpen(false);
  };

  const navigateToPage = (page: HeaderPage) => {
    onNavigate(page);
    closeMenus();
  };

  const navigateToPath = (path: string) => {
    if (onPathNavigate) {
      onPathNavigate(path);
    } else {
      onNavigate('collections');
    }
    closeMenus();
  };

  const handleDropdownItemClick = (item: DropdownItem) => {
    if (item.path) {
      navigateToPath(item.path);
      return;
    }

    if (item.page) {
      navigateToPage(item.page);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#F1E3D4] bg-[#FFF8EF]/95 shadow-sm backdrop-blur">
      <div className="mx-auto w-full max-w-none px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 xl:gap-3">
          <div className="flex min-w-0 flex-shrink-0 items-center space-x-2">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FFF8EF] shadow-sm ring-1 ring-white/80 sm:h-12 sm:w-12 2xl:h-14 2xl:w-14">
              <img
                src="/modo-plantas-logo-icono-512.png"
                alt="Logo de Modo Plantas"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-[#16352B] sm:text-xl 2xl:text-2xl">
                Modo Plantas
              </h1>
              <p className="text-xs text-[#6B7280] 2xl:text-sm">Pasión por la naturaleza</p>
            </div>
            <div className="min-w-0 sm:hidden">
              <h1 className="truncate text-base font-semibold text-[#16352B]">Modo Plantas</h1>
            </div>
          </div>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex 2xl:gap-2">
            <button
              type="button"
              onClick={() => navigateToPage('home')}
              className={desktopNavButtonClass}
            >
              Inicio
            </button>

            <div
              className="relative"
              onMouseEnter={() => openDesktopDropdown('buy')}
              onMouseLeave={scheduleDesktopDropdownClose}
            >
              <button
                type="button"
                onClick={() => {
                  clearDropdownCloseTimeout();
                  setOpenDesktopMenu(openDesktopMenu === 'buy' ? null : 'buy');
                }}
                className={desktopDropdownButtonClass}
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'buy'}
              >
                Comprar
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    openDesktopMenu === 'buy' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openDesktopMenu === 'buy' && (
                <div className={dropdownShellClass}>
                  <div className={dropdownPanelClass} role="menu">
                    {safeBuyLinks.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleDropdownItemClick(item)}
                        className={dropdownItemClass}
                        role="menuitem"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="relative"
              onMouseEnter={() => openDesktopDropdown('collections')}
              onMouseLeave={scheduleDesktopDropdownClose}
            >
              <button
                type="button"
                onClick={() => {
                  clearDropdownCloseTimeout();
                  setOpenDesktopMenu(openDesktopMenu === 'collections' ? null : 'collections');
                }}
                className={desktopDropdownButtonClass}
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'collections'}
              >
                Colecciones
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    openDesktopMenu === 'collections' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openDesktopMenu === 'collections' && (
                <div className={dropdownShellClass}>
                  <div className={dropdownPanelClass} role="menu">
                    {safeCollectionLinks.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleDropdownItemClick(item)}
                        className={dropdownItemClass}
                        role="menuitem"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateToPage('accessories')}
              className={desktopNavButtonClass}
            >
              Charlas
            </button>
            <button
              type="button"
              onClick={() => navigateToPage('care')}
              className={desktopNavButtonClass}
            >
              Cuidados
            </button>
            {user?.isAdmin && (
              <button
                type="button"
                onClick={() => navigateToPage('admin')}
                className={desktopAdminNavButtonClass}
              >
                <LayoutDashboard className="h-4 w-4" />
                Admin
              </button>
            )}
          </nav>

          <div className="ml-auto flex min-w-0 flex-shrink-0 items-center space-x-1 sm:space-x-2 2xl:space-x-3">
            <div className="hidden min-w-0 flex-shrink md:flex md:w-[220px] lg:w-[240px] xl:w-[220px] min-[1500px]:w-[280px] 2xl:w-[360px]">
              <SearchBar searchQuery={searchQuery} onSearch={onSearch} onSubmit={onSearchSubmit} />
            </div>

            {user && (
              <button
                type="button"
                onClick={() => navigateToPage('account-settings')}
                className="hidden items-center gap-1 rounded-full px-2 py-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61] sm:flex"
                title="Mi perfil"
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden text-sm font-medium 2xl:inline">Mi perfil</span>
              </button>
            )}

            {user && (
              <button
                type="button"
                onClick={() => navigateToPage('orders')}
                className="hidden rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61] sm:block"
                title="Mis pedidos"
              >
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}

            {!user && (
              <button
                type="button"
                onClick={onUserClick}
                className="rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
                title="Iniciar sesión"
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}

            <button
              type="button"
              onClick={onFavoritesClick}
              className="relative rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] hover:text-[#0F8F61]"
              title="Favoritos"
            >
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              {favoritesCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-[#D96C9F] text-xs font-bold text-white sm:-right-2 sm:-top-2 sm:h-6 sm:w-6">
                  <span className="text-xs">{favoritesCount}</span>
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onCartClick}
              className="relative rounded-full bg-[#E8F7EF] p-1.5 text-[#16352B] shadow-sm ring-1 ring-[#D2EBDD] transition-all hover:text-[#0F8F61] hover:shadow-md sm:p-2"
              title="Carrito"
            >
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-[#D96C9F] text-xs font-bold text-white sm:-right-2 sm:-top-2 sm:h-6 sm:w-6">
                  <span className="text-xs">{cartCount}</span>
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-full p-2 text-[#16352B] transition-colors hover:bg-[#E8F7EF] xl:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-label="Abrir menú"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <SearchBar searchQuery={searchQuery} onSearch={onSearch} onSubmit={onSearchSubmit} />
        </div>

        {isMobileMenuOpen && (
          <div className="absolute left-0 right-0 top-full max-h-[72vh] overflow-y-auto border-t border-[#F1E3D4] bg-[#FFF8EF] shadow-lg xl:hidden">
            <nav className="mx-auto max-w-[1500px] space-y-3 px-4 py-4">
              <button
                type="button"
                onClick={() => navigateToPage('home')}
                className={mobileNavButtonClass}
              >
                Inicio
              </button>

              <div className="rounded-2xl border border-[#F1E3D4] bg-white/70 p-2">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Comprar
                </p>
                <div className="space-y-1">
                  {safeBuyLinks.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleDropdownItemClick(item)}
                      className={mobileSubNavButtonClass}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#F1E3D4] bg-white/70 p-2">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Colecciones
                </p>
                <div className="space-y-1">
                  {safeCollectionLinks.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleDropdownItemClick(item)}
                      className={mobileSubNavButtonClass}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigateToPage('accessories')}
                className={mobileNavButtonClass}
              >
                Charlas
              </button>
              <button
                type="button"
                onClick={() => navigateToPage('care')}
                className={mobileNavButtonClass}
              >
                Cuidados
              </button>

              <div className="mt-3 space-y-2 border-t border-[#F1E3D4] pt-3">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateToPage('account-settings')}
                      className={mobileNavButtonClass}
                    >
                      <User className="mr-2 inline h-4 w-4" />
                      Mi perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToPage('orders')}
                      className={mobileNavButtonClass}
                    >
                      <Package className="mr-2 inline h-4 w-4" />
                      Mis pedidos
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onUserClick();
                      closeMenus();
                    }}
                    className={mobileNavButtonClass}
                  >
                    <User className="mr-2 inline h-4 w-4" />
                    Iniciar sesión
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onFavoritesClick();
                    closeMenus();
                  }}
                  className={mobileNavButtonClass}
                >
                  <Heart className="mr-2 inline h-4 w-4" />
                  Favoritos
                  {favoritesCount > 0 && <span className="ml-2 text-[#D96C9F]">({favoritesCount})</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCartClick();
                    closeMenus();
                  }}
                  className={mobileNavButtonClass}
                >
                  <ShoppingCart className="mr-2 inline h-4 w-4" />
                  Carrito
                  {cartCount > 0 && <span className="ml-2 text-[#D96C9F]">({cartCount})</span>}
                </button>

                {user?.isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigateToPage('admin')}
                    className={`${mobileNavButtonClass} bg-[#E8F7EF] text-[#0F8F61]`}
                  >
                    <LayoutDashboard className="mr-2 inline h-4 w-4" />
                    Admin
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
