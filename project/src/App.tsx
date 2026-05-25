import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Cart from './components/Cart';
import Favorites from './components/Favorites';
import AuthModal from './components/AuthModal';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import HeroCarousel from './components/HeroCarousel';
import CompanyIntro from './components/CompanyIntro';
import Filters from './components/Filters';
import Checkout from './pages/Checkout';
import CheckoutResultPage, { type CheckoutResultData } from './pages/CheckoutResultPage';
import Orders from './pages/Orders';
import Accessories from './pages/Accessories';
import CareGuide from './pages/CareGuide';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import ResetPassword from './pages/ResetPassword';
import AccountSettings from './pages/AccountSettings';
import AdminDashboard from './pages/AdminDashboard';
import type { CartItem, CartItemInput } from './types/cart';
import type { Product } from './types/product';
import { sendProductAvailabilityEmail } from './services/emailService';
import {
  getAuthenticatedUserFromSession,
  getBasicAuthenticatedUserFromSession,
  getSupabaseProducts,
  isSupabaseReady,
  onSupabaseAuthChange,
  signOutFromSupabase,
  type AuthenticatedUser,
} from './services/supabaseService';
import {
  applyCatalogFilters,
  createEmptyCatalogFilters,
  getAvailableFilters,
  getPriceRangeError,
  type CatalogCategory,
} from './utils/catalogFilters';
import {
  trackAddToCart,
  trackAddToFavorite,
  trackCheckoutStarted,
  trackProductView,
  trackRemoveFromFavorite,
} from './services/analyticsService';
import { Flower, Star, Heart, ShoppingBag } from 'lucide-react';

type AppUser = AuthenticatedUser | {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role?: string;
  isAdmin?: boolean;
  profileLoaded?: boolean;
  createdAt?: string;
};

type AppPage =
  | 'home'
  | 'accessories'
  | 'care'
  | 'orchids'
  | 'interior'
  | 'exterior'
  | 'arrangements'
  | 'pots'
  | 'checkout'
  | 'checkout-success'
  | 'checkout-failure'
  | 'checkout-pending'
  | 'terms'
  | 'privacy'
  | 'orders'
  | 'reset-password'
  | 'account-settings'
  | 'admin';

const normalizeCatalogValue = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getAttributeText = (product: Product, key: string) => {
  const value = product.attributes?.[key];

  if (Array.isArray(value)) {
    return value.map(normalizeCatalogValue);
  }

  return [normalizeCatalogValue(value)];
};

const getProductCatalogValues = (product: Product) =>
  [
    normalizeCatalogValue(product.type),
    normalizeCatalogValue(product.category),
    ...getAttributeText(product, 'category'),
    ...getAttributeText(product, 'product_category'),
    ...getAttributeText(product, 'catalog_category'),
    ...getAttributeText(product, 'type'),
    ...getAttributeText(product, 'product_type'),
    ...getAttributeText(product, 'orchid_type'),
    ...getAttributeText(product, 'arrangement_type'),
    ...getAttributeText(product, 'pot_material'),
  ].filter(Boolean);

const productHasCatalogTag = (product: Product, tags: string[]) => {
  const values = getProductCatalogValues(product);
  const normalizedTags = tags.map(normalizeCatalogValue);

  return normalizedTags.some((tag) =>
    values.some((value) => value === tag || value.includes(tag) || tag.includes(value))
  );
};

const isPotProduct = (product: Product) => productHasCatalogTag(product, ['maceta', 'macetas', 'pot', 'pots']);
const isArrangementProduct = (product: Product) =>
  productHasCatalogTag(product, ['arreglo', 'arreglos', 'arrangement', 'arrangements']);
const isAccessoryProduct = (product: Product) =>
  productHasCatalogTag(product, ['accesorio', 'accesorios', 'accessory', 'accessories']);
const isInteriorProduct = (product: Product) =>
  productHasCatalogTag(product, [
    'interior',
    'planta de interior',
    'plantas de interior',
    'indoor',
    'indoor plants',
  ]);
const isExteriorProduct = (product: Product) =>
  productHasCatalogTag(product, [
    'exterior',
    'planta de exterior',
    'plantas de exterior',
    'outdoor',
    'outdoor plants',
  ]);
const isOrchidProduct = (product: Product) => {
  if (
    isPotProduct(product) ||
    isArrangementProduct(product) ||
    isAccessoryProduct(product) ||
    isInteriorProduct(product) ||
    isExteriorProduct(product)
  ) {
    return false;
  }

  return true;
};

const getCatalogCategoryFromPage = (page: AppPage): CatalogCategory | null => {
  if (page === 'orchids') return 'orchids';
  if (page === 'interior') return 'interior';
  if (page === 'exterior') return 'exterior';
  if (page === 'pots') return 'pots';
  if (page === 'arrangements') return 'arrangements';
  return null;
};

const getCatalogPageTitle = (page: AppPage) => {
  if (page === 'orchids') return 'Nuestras Orquídeas';
  if (page === 'arrangements') return 'Arreglos';
  if (page === 'pots') return 'Macetas Artesanales';
  if (page === 'interior') return 'Plantas de interior';
  if (page === 'exterior') return 'Plantas de exterior';
  return 'Productos';
};

const getCatalogPageDescription = (page: AppPage) => {
  if (page === 'orchids') return 'Descubrí nuestra colección completa de orquídeas exóticas';
  if (page === 'arrangements') return 'Arreglos con orquídeas listos para regalar, decorar o encargar';
  if (page === 'pots') return 'Macetas únicas diseñadas especialmente para orquídeas';
  if (page === 'interior') return 'Plantas seleccionadas para llenar tus espacios interiores de vida y frescura';
  if (page === 'exterior') return 'Plantas resistentes para balcones, patios, jardines y espacios al aire libre';
  return '';
};

const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="overflow-hidden rounded-2xl border border-[#EADBC8]/70 bg-white shadow-sm">
        <div className="h-56 animate-pulse bg-gray-100" />
        <div className="space-y-3 p-5">
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    ))}
  </>
);

const getProductsByCatalogCategory = (category: CatalogCategory, products: Product[]) => {
  if (category === 'pots') {
    return products.filter(isPotProduct);
  }

  if (category === 'arrangements') {
    return products.filter(isArrangementProduct);
  }

  if (category === 'interior') {
    return products.filter(isInteriorProduct);
  }

  if (category === 'exterior') {
    return products.filter(isExteriorProduct);
  }

  return products.filter(isOrchidProduct);
};

const CATALOG_CACHE_KEY = 'club-orquideas-catalog-cache';
const CATALOG_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

type CatalogCache = {
  timestamp: number;
  products: Product[];
};

const readCatalogCache = (): CatalogCache | null => {
  const cachedValue = readJsonStorage<CatalogCache | null>(CATALOG_CACHE_KEY, null);

  if (!cachedValue?.timestamp || !Array.isArray(cachedValue.products)) {
    return null;
  }

  const cacheAge = Date.now() - cachedValue.timestamp;
  return cacheAge <= CATALOG_CACHE_MAX_AGE_MS ? cachedValue : null;
};

const writeCatalogCache = (products: Product[]) => {
  localStorage.setItem(
    CATALOG_CACHE_KEY,
    JSON.stringify({
      timestamp: Date.now(),
      products,
    })
  );
};

const readJsonStorage = <T,>(key: string, fallback: T): T => {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.warn(`Dato local invalido removido: ${key}`, error);
    localStorage.removeItem(key);
    return fallback;
  }
};

const readArrayStorage = <T,>(key: string): T[] => {
  const value = readJsonStorage<unknown>(key, []);

  if (Array.isArray(value)) {
    return value as T[];
  }

  console.warn(`Dato local invalido removido: ${key}`);
  localStorage.removeItem(key);
  return [];
};

const buildCartKey = (item: Pick<CartItemInput, 'id' | 'sourceId' | 'variantId' | 'size' | 'color' | 'price'>) =>
  [
    item.sourceId || item.id,
    item.variantId || 'base',
    item.size || 'sin-tamano',
    item.color || 'sin-color',
    item.price,
  ].join('|');

const normalizeCartItem = (item: CartItemInput): CartItem => ({
  ...item,
  cartKey: item.cartKey || buildCartKey(item),
});

const getMatchingVariantId = (product: Product, item: CartItem) =>
  (product.variants ?? []).find(
    (variant) =>
      variant.id &&
      variant.size === item.size &&
      (!variant.color || variant.color === item.color) &&
      Number(variant.price) === Number(item.price)
  )?.id;

const hydrateCartItemsWithCatalog = (items: CartItem[], products: Product[]) => {
  if (items.length === 0 || products.length === 0) {
    return items;
  }

  let changed = false;
  const productsByDisplayId = new Map(products.map((product) => [product.id, product]));
  const nextItems = items.map((item) => {
    if (item.sourceId && item.variantId) {
      return item;
    }

    const product = productsByDisplayId.get(item.id);
    if (!product?.sourceId) {
      return item;
    }

    const nextItem = normalizeCartItem({
      ...item,
      sourceId: item.sourceId || product.sourceId,
      variantId: item.variantId || getMatchingVariantId(product, item),
      cartKey: undefined,
    });

    changed = changed || nextItem.sourceId !== item.sourceId || nextItem.variantId !== item.variantId;
    return nextItem;
  });

  return changed ? nextItems : items;
};

const getCheckoutPageFromResult = (status: CheckoutResultData['status']): AppPage =>
  status === 'failure' ? 'checkout-failure' : status === 'pending' ? 'checkout-pending' : 'checkout-success';

const getMercadoPagoResultFromUrl = (): CheckoutResultData | null => {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');

  if (!payment || !['success', 'failure', 'pending'].includes(payment)) {
    return null;
  }

  const status = payment as CheckoutResultData['status'];

  return {
    status,
    orderId: params.get('order_id') || params.get('external_reference') || undefined,
    paymentId: params.get('payment_id') || params.get('collection_id') || undefined,
    paymentStatus: params.get('status') || params.get('collection_status') || payment,
    paymentMethod: 'mercadopago',
    source: 'mercadopago',
  };
};

const mergeBasicSessionUser = (currentUser: AppUser | null, basicUser: AuthenticatedUser): AppUser => {
  if (!currentUser || currentUser.id !== basicUser.id) {
    return basicUser;
  }

  return {
    ...currentUser,
    ...basicUser,
    role: currentUser.role || basicUser.role,
    isAdmin: Boolean(currentUser.isAdmin || basicUser.isAdmin),
    profileLoaded: currentUser.profileLoaded || basicUser.profileLoaded,
  };
};

const mergeProfileUser = (currentUser: AppUser | null, profileUser: AuthenticatedUser): AppUser => {
  if (!currentUser || currentUser.id !== profileUser.id) {
    return profileUser;
  }

  if (!profileUser.profileLoaded) {
    return {
      ...currentUser,
      ...profileUser,
      role: currentUser.role || profileUser.role,
      isAdmin: Boolean(currentUser.isAdmin || profileUser.isAdmin),
      profileLoaded: currentUser.profileLoaded || profileUser.profileLoaded,
    };
  }

  return {
    ...currentUser,
    ...profileUser,
  };
};

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalNotice, setAuthModalNotice] = useState('');
  const [postAuthPage, setPostAuthPage] = useState<AppPage | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResultData | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productLoadError, setProductLoadError] = useState('');
  const [productLoadNotice, setProductLoadNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(() => createEmptyCatalogFilters());
  const currentCatalogCategory = getCatalogCategoryFromPage(currentPage);
  const productLoadRequestIdRef = useRef(0);

  // Cargar datos del usuario al iniciar
  useEffect(() => {
    let isMounted = true;
    let authSyncId = 0;

    setCartItems(readArrayStorage<CartItemInput>('orchid-cart').map(normalizeCartItem));
    setFavoriteItems(readArrayStorage<Product>('orchid-favorites'));

    const shouldOpenResetPassword =
      window.location.search.includes('reset-password') ||
      window.location.hash.includes('reset-password') ||
      window.location.hash.includes('type=recovery');

    if (shouldOpenResetPassword) {
      setCurrentPage('reset-password');
    }

    const mercadoPagoResult = getMercadoPagoResultFromUrl();
    if (mercadoPagoResult && !shouldOpenResetPassword) {
      setCheckoutResult(mercadoPagoResult);
      setCurrentPage(getCheckoutPageFromResult(mercadoPagoResult.status));
      if (mercadoPagoResult.orderId) {
        setCartItems([]);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const authSubscription = isSupabaseReady()
      ? onSupabaseAuthChange((event, session) => {
          if (!isMounted) return;

          if (event === 'PASSWORD_RECOVERY') {
            setCurrentPage('reset-password');
            return;
          }

          if (event === 'SIGNED_OUT') {
            authSyncId += 1;
            setUser(null);
            return;
          }

          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            const syncId = (authSyncId += 1);
            const basicUser = getBasicAuthenticatedUserFromSession(session);

            if (basicUser) {
              setUser((currentUser) => mergeBasicSessionUser(currentUser, basicUser));
            } else if (event === 'INITIAL_SESSION') {
              setUser(null);
              return;
            }

            if (!session?.user) {
              return;
            }

            window.setTimeout(() => {
              void (async () => {
                try {
                  const supabaseUser = await getAuthenticatedUserFromSession(session);
                  if (!isMounted || syncId !== authSyncId || !supabaseUser) {
                    return;
                  }

                  setUser((currentUser) => mergeProfileUser(currentUser, supabaseUser));
                } catch (error) {
                  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_PROFILE_FALLBACK === 'true') {
                    console.info('No se pudo completar la sincronizacion del perfil. Se mantienen datos de sesion.', error);
                  }
                }
              })();
            }, 0);
          }
        })
      : null;

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setFilters(createEmptyCatalogFilters());
  }, [currentCatalogCategory]);

  const loadCatalogProducts = useCallback(async ({ preferCache = true } = {}) => {
    const requestId = productLoadRequestIdRef.current + 1;
    productLoadRequestIdRef.current = requestId;
    const cachedCatalog = preferCache ? readCatalogCache() : null;
    const hasCachedCatalog = Boolean(cachedCatalog?.products.length);

    if (cachedCatalog?.products.length) {
      setCatalogProducts(cachedCatalog.products);
      setIsLoadingProducts(false);
      setProductLoadError('');
      setProductLoadNotice('Mostrando productos guardados mientras actualizamos el catalogo.');
    } else {
      setIsLoadingProducts(true);
      setProductLoadNotice('');
    }

    if (!isSupabaseReady()) {
      if (requestId !== productLoadRequestIdRef.current) return;
      setIsLoadingProducts(false);
      if (hasCachedCatalog) {
        setProductLoadError('');
        setProductLoadNotice('No pudimos actualizar el catalogo. Estas viendo productos guardados.');
      } else {
        setProductLoadError('No se pudieron cargar los productos.');
        setProductLoadNotice('');
        setCatalogProducts([]);
      }
      return;
    }

    try {
      const supabaseProducts = await getSupabaseProducts();
      if (requestId !== productLoadRequestIdRef.current) return;

      setCatalogProducts(supabaseProducts);
      writeCatalogCache(supabaseProducts);
      setProductLoadError('');
      setProductLoadNotice('');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error cargando productos:', error);
      }

      if (requestId !== productLoadRequestIdRef.current) return;

      if (hasCachedCatalog) {
        setProductLoadError('');
        setProductLoadNotice('No pudimos actualizar el catalogo. Estas viendo productos guardados.');
      } else {
        setCatalogProducts([]);
        setProductLoadError('No se pudieron cargar los productos.');
        setProductLoadNotice('');
      }
    } finally {
      if (requestId === productLoadRequestIdRef.current) {
        setIsLoadingProducts(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadCatalogProducts();

    const handleProductsUpdated = () => {
      void loadCatalogProducts({ preferCache: false });
    };

    window.addEventListener('products-updated', handleProductsUpdated);

    return () => {
      productLoadRequestIdRef.current += 1;
      window.removeEventListener('products-updated', handleProductsUpdated);
    };
  }, [loadCatalogProducts]);

  // Guardar carrito en localStorage
  useEffect(() => {
    localStorage.setItem('orchid-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Guardar favoritos en localStorage
  useEffect(() => {
    localStorage.setItem('orchid-favorites', JSON.stringify(favoriteItems));
  }, [favoriteItems]);

  useEffect(() => {
    setCartItems((currentItems) => hydrateCartItemsWithCatalog(currentItems, catalogProducts));
  }, [catalogProducts]);

  const handleLogin = (userData: AppUser) => {
    setUser(userData);

    if (postAuthPage) {
      setCurrentPage(postAuthPage);
      setPostAuthPage(null);
    }
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalNotice('');
    setAuthModalMode('login');
    setPostAuthPage(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login', notice = '') => {
    setAuthModalMode(mode);
    setAuthModalNotice(notice);
    setIsAuthModalOpen(true);
  };

  const requirePurchaseAuth = (mode: 'login' | 'register' = 'login') => {
    openAuthModal(mode, 'Para finalizar tu compra necesitás iniciar sesión o crear una cuenta.');
  };

  const handleLogout = async () => {
    if (isSupabaseReady()) {
      try {
        await signOutFromSupabase();
      } catch (error) {
        console.error('Error cerrando sesion de Supabase:', error);
      }
    }

    setUser(null);
  };

  const handleUpdateUser = (updatedUser: Partial<AppUser>) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return null;
      }

      return { ...currentUser, ...updatedUser };
    });
  };

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    trackProductView(product);
  };

  const addSelectionToCart = (selection: CartItemInput) => {
    const cartItem = normalizeCartItem(selection);
    const existingItem = cartItems.find((item) => item.cartKey === cartItem.cartKey);

    if (existingItem) {
      setCartItems(cartItems.map((item) => {
        if (item.cartKey !== cartItem.cartKey) {
          return item;
        }

        const nextQuantity = item.quantity + cartItem.quantity;
        return {
          ...item,
          quantity: item.stock ? Math.min(item.stock, nextQuantity) : nextQuantity,
        };
      }));
    } else {
      setCartItems([...cartItems, cartItem]);
    }

    setIsCartOpen(true);
    trackAddToCart(cartItem);
  };

  const addToCart = (product: Product) => {
    openProductDetail(product);
  };

  const handleCheckoutRequest = () => {
    if (!user) {
      setIsCartOpen(false);
      setPostAuthPage('checkout');
      requirePurchaseAuth();
      return;
    }

    setIsCartOpen(false);
    trackCheckoutStarted(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
    setCurrentPage('checkout');
  };

  const updateCartQuantity = (cartKey: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems(cartItems.filter(item => item.cartKey !== cartKey));
    } else {
      setCartItems(cartItems.map(item => {
        if (item.cartKey !== cartKey) {
          return item;
        }

        return {
          ...item,
          quantity: item.stock ? Math.min(item.stock, quantity) : quantity,
        };
      }));
    }
  };

  const removeFromCart = (cartKey: string) => {
    setCartItems(cartItems.filter(item => item.cartKey !== cartKey));
  };

  const toggleFavorite = (product: Product) => {
    const isFavorite = favoriteItems.some(item => item.id === product.id);
    
    if (isFavorite) {
      setFavoriteItems(favoriteItems.filter(item => item.id !== product.id));
      trackRemoveFromFavorite(product);
    } else {
      setFavoriteItems([...favoriteItems, product]);
      trackAddToFavorite(product);
      
      // Si el producto no está en stock, enviar notificación de disponibilidad
      if (!product.inStock && user) {
        sendProductAvailabilityEmail(user.email, product.name)
          .then(() => {
            if (import.meta.env.DEV) {
              console.info(`Notificacion de disponibilidad enviada para ${product.name}`);
            }
          })
          .catch(error => {
            if (import.meta.env.DEV) {
              console.error('Error enviando notificacion:', error);
            }
          });
      }
    }
  };

  const removeFavorite = (id: number) => {
    const removedProduct = favoriteItems.find(item => item.id === id);
    setFavoriteItems(favoriteItems.filter(item => item.id !== id));
    if (removedProduct) {
      trackRemoveFromFavorite(removedProduct);
    }
  };

  const handleFilterOptionToggle = (filterKey: string, value: string, checked: boolean) => {
    setFilters((current) => {
      const currentValues = current.values[filterKey] ?? [];
      const nextValues = checked
        ? Array.from(new Set([...currentValues, value]))
        : currentValues.filter((currentValue) => currentValue !== value);

      return {
        ...current,
        values: {
          ...current.values,
          [filterKey]: nextValues,
        },
      };
    });
  };

  const handlePriceRangeChange = (priceRange: [string, string]) => {
    setFilters((current) => ({
      ...current,
      priceRange,
    }));
  };

  const clearFilters = () => {
    setFilters(createEmptyCatalogFilters());
  };

  const getSearchFilteredProducts = () => {
    let products = catalogProducts;
    
    // Aplicar filtros de búsqueda
    if (searchQuery) {
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return products;
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const favoritesCount = favoriteItems.length;

  if (currentPage === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onBack={() => setCurrentPage('home')}
        onProductsChanged={() => window.dispatchEvent(new Event('products-updated'))}
      />
    );
  }

  if (currentPage === 'reset-password') {
    return (
      <ResetPassword 
        onBack={() => setCurrentPage('home')}
        onPasswordReset={() => {
          setCurrentPage('home');
          openAuthModal();
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
        onLogout={async () => {
          await handleLogout();
          setCurrentPage('home');
        }}
      />
    );
  }

  if (currentPage === 'orders') {
    return <Orders onBack={() => setCurrentPage('home')} user={user} />;
  }

  if (currentPage === 'checkout-success' || currentPage === 'checkout-failure' || currentPage === 'checkout-pending') {
    const fallbackStatus =
      currentPage === 'checkout-failure' ? 'failure' : currentPage === 'checkout-pending' ? 'pending' : 'success';

    return (
      <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => {
            if (user) {
              setCurrentPage('account-settings');
            } else {
              openAuthModal();
            }
          }}
          onNavigate={setCurrentPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          user={user}
        />

        <CheckoutResultPage
          result={checkoutResult ?? { status: fallbackStatus, source: 'url' }}
          items={cartItems}
          onBackHome={() => setCurrentPage('home')}
          onBackToCart={() => {
            setCurrentPage('home');
            setIsCartOpen(true);
          }}
          onBackToCheckout={() => setCurrentPage('checkout')}
          onViewOrders={() => setCurrentPage('orders')}
        />

        <Footer onNavigate={setCurrentPage} />

        <Cart
          items={cartItems}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={handleCheckoutRequest}
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
          onClose={closeAuthModal}
          onLogin={handleLogin}
          user={user}
          onLogout={handleLogout}
          initialMode={authModalMode}
          notice={authModalNotice}
          onNavigateToSettings={() => {
            closeAuthModal();
            setCurrentPage('account-settings');
          }}
          onNavigateToAdmin={() => {
            closeAuthModal();
            setCurrentPage('admin');
          }}
        />
      </div>
    );
  }

  if (currentPage === 'checkout') {
    if (!user) {
      return (
        <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
          <Header
            cartCount={cartCount}
            favoritesCount={favoritesCount}
            onCartClick={() => setIsCartOpen(true)}
            onFavoritesClick={() => setIsFavoritesOpen(true)}
            onUserClick={() => openAuthModal()}
            onNavigate={setCurrentPage}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            user={user}
          />

          <main className="container mx-auto flex min-h-[68vh] items-center justify-center px-4 py-12">
            <div className="max-w-md rounded-2xl border border-[#EADBC8]/80 bg-white/90 p-8 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#F8DDEB]">
                <ShoppingBag className="h-8 w-8 text-[#D96C9F]" />
              </div>
              <h1 className="text-2xl font-semibold text-[#2F3A35]">
                Para finalizar tu compra necesitás iniciar sesión
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#6B756F]">
                Tu carrito queda guardado. Iniciá sesión o creá una cuenta para continuar con el pedido.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => requirePurchaseAuth('login')}
                  className="rounded-full bg-[#D96C9F] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#C8568B]"
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => requirePurchaseAuth('register')}
                  className="rounded-full border border-[#D96C9F] px-5 py-3 font-semibold text-[#D96C9F] transition-colors hover:bg-[#F8DDEB]"
                >
                  Crear cuenta
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="mt-5 text-sm font-medium text-[#6B756F] transition-colors hover:text-[#2F3A35]"
              >
                Volver a la tienda
              </button>
            </div>
          </main>

          <Cart
            items={cartItems}
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeFromCart}
            onCheckout={handleCheckoutRequest}
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
            onClose={closeAuthModal}
            onLogin={handleLogin}
            user={user}
            onLogout={handleLogout}
            initialMode={authModalMode}
            notice={authModalNotice}
            onNavigateToSettings={() => {
              closeAuthModal();
              setCurrentPage('account-settings');
            }}
            onNavigateToAdmin={() => {
              closeAuthModal();
              setCurrentPage('admin');
            }}
          />
        </div>
      );
    }

    return (
      <Checkout
        items={cartItems}
        onBack={() => setCurrentPage('home')}
        onOrderComplete={(result) => {
          setCheckoutResult(result);
          if (result.status === 'success' || result.orderId) {
            clearCart();
          }

          setCurrentPage(getCheckoutPageFromResult(result.status));
        }}
        user={user}
      />
    );
  }

  if (currentPage === 'accessories') {
    return (
      <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => {
            if (user) {
              setCurrentPage('account-settings');
            } else {
              openAuthModal();
            }
          }}
          onNavigate={setCurrentPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          user={user}
        />
        <Accessories
          products={catalogProducts}
          isLoading={isLoadingProducts}
          onBack={() => setCurrentPage('home')}
          onAddToCart={addToCart}
          onToggleFavorite={toggleFavorite}
          favoriteItems={favoriteItems}
        />
        <Footer onNavigate={setCurrentPage} />

        <ProductDetailModal
          product={selectedProduct}
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addSelectionToCart}
        />
        
        <Cart
          items={cartItems}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={handleCheckoutRequest}
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
          onClose={closeAuthModal}
          onLogin={handleLogin}
          user={user}
          onLogout={handleLogout}
          initialMode={authModalMode}
          notice={authModalNotice}
          onNavigateToSettings={() => {
            closeAuthModal();
            setCurrentPage('account-settings');
          }}
          onNavigateToAdmin={() => {
            closeAuthModal();
            setCurrentPage('admin');
          }}
        />
      </div>
    );
  }

  if (currentPage === 'care') {
    return (
      <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => {
            if (user) {
              setCurrentPage('account-settings');
            } else {
              openAuthModal();
            }
          }}
          onNavigate={setCurrentPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          user={user}
        />
        <CareGuide onBack={() => setCurrentPage('home')} />
        <Footer onNavigate={setCurrentPage} />

        <ProductDetailModal
          product={selectedProduct}
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addSelectionToCart}
        />
        
        <Cart
          items={cartItems}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={handleCheckoutRequest}
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
          onClose={closeAuthModal}
          onLogin={handleLogin}
          user={user}
          onLogout={handleLogout}
          initialMode={authModalMode}
          notice={authModalNotice}
          onNavigateToSettings={() => {
            closeAuthModal();
            setCurrentPage('account-settings');
          }}
          onNavigateToAdmin={() => {
            closeAuthModal();
            setCurrentPage('admin');
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

  const searchedProducts = getSearchFilteredProducts();
  const orchidProducts = getProductsByCatalogCategory('orchids', searchedProducts);
  const arrangementProducts = getProductsByCatalogCategory('arrangements', searchedProducts);
  const potProducts = getProductsByCatalogCategory('pots', searchedProducts);
  const currentBaseProducts = currentCatalogCategory
    ? getProductsByCatalogCategory(currentCatalogCategory, searchedProducts)
    : orchidProducts;
  const currentUnsearchedBaseProducts = currentCatalogCategory
    ? getProductsByCatalogCategory(currentCatalogCategory, catalogProducts)
    : getProductsByCatalogCategory('orchids', catalogProducts);
  const availableFilters = currentCatalogCategory
    ? getAvailableFilters(currentCatalogCategory, currentUnsearchedBaseProducts)
    : { groups: [], priceBounds: { min: 0, max: 0 } };
  const priceRangeError = getPriceRangeError(filters.priceRange);
  const currentCatalogProducts = currentCatalogCategory
    ? applyCatalogFilters(currentBaseProducts, currentCatalogCategory, filters)
    : currentBaseProducts;
  return (
    <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
      <Header
        cartCount={cartCount}
        favoritesCount={favoritesCount}
        onCartClick={() => setIsCartOpen(true)}
        onFavoritesClick={() => setIsFavoritesOpen(true)}
        onUserClick={() => {
          if (user) {
            setCurrentPage('account-settings');
          } else {
            openAuthModal();
          }
        }}
        onNavigate={setCurrentPage}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        user={user}
      />

      {(productLoadError || productLoadNotice) && (
        <div className="container mx-auto px-4 pt-4">
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{productLoadError || productLoadNotice}</span>
            <button
              type="button"
              onClick={() => void loadCatalogProducts({ preferCache: false })}
              disabled={isLoadingProducts}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingProducts ? 'Actualizando...' : 'Reintentar'}
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      {currentPage === 'home' && (
        <>
          <HeroCarousel onNavigate={setCurrentPage} />
          <CompanyIntro />

          {/* Featured Products */}
          <section className="py-16 bg-[#FFF8EF]">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#D96C9F]">
                  Selección destacada
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-[#2F3A35] mb-4">
                  Orquídeas destacadas
                </h2>
                <p className="text-lg text-[#6B756F]">
                  Variedades seleccionadas para llenar tu casa de color y elegancia.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12">
                {isLoadingProducts ? (
                  <ProductGridSkeleton count={6} />
                ) : (
                  orchidProducts.slice(0, 6).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetails={openProductDetail}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favoriteItems.some(item => item.id === product.id)}
                    />
                  ))
                )}
              </div>

              <div className="text-center">
                <button 
                  onClick={() => setCurrentPage('orchids')}
                  className="rounded-full bg-[#5FAE9B] px-8 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#4D9A88]"
                >
                  Ver Todas las Orquídeas
                </button>
              </div>
            </div>
          </section>

          {/* Arreglos Section */}
          <section className="py-16 bg-[#F8DDEB]/45">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#D96C9F]">
                  Regalos y composiciones
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-[#2F3A35] mb-4">
                  Arreglos destacados
                </h2>
                <p className="text-lg text-[#6B756F]">
                  Composiciones especiales para regalar o decorar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12">
                {isLoadingProducts ? (
                  <ProductGridSkeleton count={3} />
                ) : (
                  arrangementProducts.slice(0, 3).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetails={openProductDetail}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favoriteItems.some(item => item.id === product.id)}
                    />
                  ))
                )}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setCurrentPage('arrangements')}
                  className="rounded-full bg-[#D96C9F] px-8 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#C8568B]"
                >
                  Ver Todos los Arreglos
                </button>
              </div>
            </div>
          </section>

          {/* Macetas Section */}
          <section className="py-16 bg-[#CFE3D4]/55">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#5FAE9B]">
                  Diseño y cuidado
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-[#2F3A35] mb-4">
                  Macetas destacadas
                </h2>
                <p className="text-lg text-[#6B756F]">
                  Diseños que acompañan y realzan cada planta.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12">
                {isLoadingProducts ? (
                  <ProductGridSkeleton count={3} />
                ) : (
                  potProducts.slice(0, 3).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetails={openProductDetail}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favoriteItems.some(item => item.id === product.id)}
                    />
                  ))
                )}
              </div>

              <div className="text-center">
                <button 
                  onClick={() => setCurrentPage('pots')}
                  className="rounded-full bg-[#5FAE9B] px-8 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#4D9A88]"
                >
                  Ver Todas las Macetas
                </button>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="bg-[#FFF8EF] py-16">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:gap-6">
                <div className="rounded-2xl border border-[#EADBC8]/70 bg-white/80 p-6 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F8DDEB]">
                    <Flower className="h-8 w-8 text-[#D96C9F]" />
                  </div>
                  <h3 className="mb-2 text-3xl font-semibold text-[#2F3A35]">500+</h3>
                  <p className="text-[#6B756F]">Orquídeas Únicas</p>
                </div>
                <div className="rounded-2xl border border-[#EADBC8]/70 bg-white/80 p-6 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#CFE3D4]">
                    <Heart className="h-8 w-8 text-[#5FAE9B]" />
                  </div>
                  <h3 className="mb-2 text-3xl font-semibold text-[#2F3A35]">1000+</h3>
                  <p className="text-[#6B756F]">Clientes Felices</p>
                </div>
                <div className="rounded-2xl border border-[#EADBC8]/70 bg-white/80 p-6 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6DDF5]">
                    <Star className="h-8 w-8 text-[#7FAF9B]" />
                  </div>
                  <h3 className="mb-2 text-3xl font-semibold text-[#2F3A35]">4.9</h3>
                  <p className="text-[#6B756F]">Calificación Promedio</p>
                </div>
                <div className="rounded-2xl border border-[#EADBC8]/70 bg-white/80 p-6 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EADBC8]">
                    <ShoppingBag className="h-8 w-8 text-[#D96C9F]" />
                  </div>
                  <h3 className="mb-2 text-3xl font-semibold text-[#2F3A35]">7</h3>
                  <p className="text-[#6B756F]">Años de Experiencia</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Products Page */}
      {(currentPage === 'orchids' ||
        currentPage === 'arrangements' ||
        currentPage === 'pots' ||
        currentPage === 'interior' ||
        currentPage === 'exterior') && (
        <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            <div className="lg:w-1/4 lg:flex-shrink-0">
              <Filters
                filters={filters}
                filterGroups={availableFilters.groups}
                priceBounds={availableFilters.priceBounds}
                priceError={priceRangeError}
                onOptionToggle={handleFilterOptionToggle}
                onPriceRangeChange={handlePriceRangeChange}
                onClearFilters={clearFilters}
              />
            </div>
            <div className="lg:w-3/4 min-w-0">
              <div className="mb-6 sm:mb-8">
                <h1 className="mb-2 text-2xl font-semibold text-[#2F3A35] sm:mb-4 sm:text-3xl">
                  {getCatalogPageTitle(currentPage)}
                </h1>
                <p className="text-sm text-[#6B756F] sm:text-base">
                  {getCatalogPageDescription(currentPage)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {isLoadingProducts ? (
                  <ProductGridSkeleton count={8} />
                ) : (
                  currentCatalogProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetails={openProductDetail}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favoriteItems.some(item => item.id === product.id)}
                    />
                  ))
                )}
              </div>

              {!isLoadingProducts && currentCatalogProducts.length === 0 && (
                <div className="mt-6 rounded-lg border border-dashed border-[#EADBC8] bg-white px-6 py-10 text-center text-[#6B756F]">
                  {currentUnsearchedBaseProducts.length === 0
                    ? 'Todavía no hay productos en esta categoría.'
                    : 'No hay productos para mostrar con los filtros actuales.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer onNavigate={setCurrentPage} />

      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addSelectionToCart}
      />

      <Cart
        items={cartItems}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckoutRequest}
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
        onClose={closeAuthModal}
        onLogin={handleLogin}
        user={user}
        onLogout={handleLogout}
        initialMode={authModalMode}
        notice={authModalNotice}
        onNavigateToSettings={() => {
          closeAuthModal();
          setCurrentPage('account-settings');
        }}
        onNavigateToAdmin={() => {
          closeAuthModal();
          setCurrentPage('admin');
        }}
      />
    </div>
  );
}

export default App;
