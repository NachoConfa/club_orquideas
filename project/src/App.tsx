import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Cart from './components/Cart';
import Favorites from './components/Favorites';
import AuthModal from './components/AuthModal';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import ScrollToTop from './components/ScrollToTop';
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
import ProductPage from './pages/ProductPage';
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
  getProductPrices,
  parsePriceInput,
  productHasAvailableStock,
  type CatalogCategory,
  type CatalogFilterGroup,
} from './utils/catalogFilters';
import {
  trackAddToCart,
  trackAddToFavorite,
  trackCheckoutStarted,
  trackProductView,
  trackRemoveFromFavorite,
} from './services/analyticsService';
import { getProductSlug } from './utils/productSlug';
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
  | 'admin'
  | 'product'
  | 'search';

const APP_PAGE_PATHS: Record<AppPage, string> = {
  home: '/',
  accessories: '/accesorios',
  care: '/cuidados',
  orchids: '/orquideas',
  interior: '/plantas-interior',
  exterior: '/plantas-exterior',
  arrangements: '/arreglos',
  pots: '/macetas',
  checkout: '/checkout',
  'checkout-success': '/checkout/success',
  'checkout-failure': '/checkout/failure',
  'checkout-pending': '/checkout/pending',
  terms: '/terminos',
  privacy: '/privacidad',
  orders: '/pedidos',
  'reset-password': '/reset-password',
  'account-settings': '/perfil',
  admin: '/admin',
  product: '/producto',
  search: '/buscar',
};

const normalizeCatalogValue = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_/.,;:()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SEARCH_TERM_ALIASES: Record<string, string[]> = {
  phaleanopsis: ['phalaenopsis'],
  phalenopsis: ['phalaenopsis'],
  phalaenopsi: ['phalaenopsis'],
  orquidea: ['orquidea', 'orquideas'],
  orquideas: ['orquidea', 'orquideas'],
  maceta: ['maceta', 'macetas'],
  macetas: ['maceta', 'macetas'],
  arreglo: ['arreglo', 'arreglos'],
  arreglos: ['arreglo', 'arreglos'],
};

const expandSearchTerm = (term: string) => Array.from(new Set([term, ...(SEARCH_TERM_ALIASES[term] ?? [])]));

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

const getProductSearchValues = (product: Product) =>
  [
    product.name,
    product.description,
    product.category,
    product.type,
    product.color,
    product.size,
    getProductSlug(product),
    product.floweringStems == null ? '' : `${product.floweringStems} varas`,
    ...(product.colors ?? []),
    ...(product.variants ?? []).flatMap((variant) => [
      variant.color,
      variant.size,
      variant.floweringStems == null ? '' : `${variant.floweringStems} varas`,
      variant.price == null ? '' : String(variant.price),
    ]),
    ...getAttributeText(product, 'category'),
    ...getAttributeText(product, 'type'),
    ...getAttributeText(product, 'product_type'),
    ...getAttributeText(product, 'orchid_type'),
  ]
    .map(normalizeCatalogValue)
    .filter(Boolean);

const productMatchesSearchQuery = (product: Product, query: string) => {
  const normalizedQuery = normalizeCatalogValue(query);

  if (!normalizedQuery) {
    return false;
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const values = getProductSearchValues(product);

  return queryTerms.every((term) =>
    expandSearchTerm(term).some((expandedTerm) => values.some((value) => value.includes(expandedTerm)))
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

type SearchCategoryValue = 'orchids' | 'interior' | 'exterior' | 'arrangements' | 'pots' | 'accessories';

const SEARCH_CATEGORY_LABELS: Record<SearchCategoryValue, string> = {
  orchids: 'Orquideas',
  interior: 'Plantas de interior',
  exterior: 'Plantas de exterior',
  arrangements: 'Arreglos',
  pots: 'Macetas',
  accessories: 'Accesorios',
};

const getProductSearchCategory = (product: Product): SearchCategoryValue => {
  if (isInteriorProduct(product)) return 'interior';
  if (isExteriorProduct(product)) return 'exterior';
  if (isArrangementProduct(product)) return 'arrangements';
  if (isPotProduct(product)) return 'pots';
  if (isAccessoryProduct(product)) return 'accessories';
  return 'orchids';
};

const uniqueSearchOptions = (products: Product[], getValues: (product: Product) => Array<string | number | undefined | null>) => {
  const options = new Map<string, { value: string; label: string; count: number }>();

  products.forEach((product) => {
    const seenValues = new Set<string>();
    getValues(product).forEach((rawValue) => {
      if (rawValue === null || rawValue === undefined || rawValue === '') return;
      const label = String(rawValue).trim();
      const value = normalizeCatalogValue(label);
      if (!value || seenValues.has(value)) return;
      seenValues.add(value);

      const currentOption = options.get(value);
      options.set(value, {
        value,
        label: currentOption?.label || label,
        count: (currentOption?.count ?? 0) + 1,
      });
    });
  });

  return Array.from(options.values()).sort((first, second) => first.label.localeCompare(second.label, 'es'));
};

const getSearchFilterData = (products: Product[]) => {
  const groups: CatalogFilterGroup[] = [];

  const categoryOptions = Object.entries(SEARCH_CATEGORY_LABELS)
    .map(([value, label]) => ({
      value,
      label,
      count: products.filter((product) => getProductSearchCategory(product) === value).length,
    }))
    .filter((option) => option.count > 0);

  if (categoryOptions.length > 0) {
    groups.push({
      key: 'category',
      label: 'Categoria / tipo',
      display: 'checkbox',
      options: categoryOptions,
    });
  }

  const colorOptions = uniqueSearchOptions(products, (product) => [
    product.color,
    ...(product.colors ?? []),
    ...(product.variants ?? []).map((variant) => variant.color),
  ]);
  if (colorOptions.length > 0) {
    groups.push({ key: 'color', label: 'Color', display: 'swatch', options: colorOptions });
  }

  const sizeOptions = uniqueSearchOptions(products, (product) => [
    product.size,
    ...(product.variants ?? []).map((variant) => variant.size),
  ]);
  if (sizeOptions.length > 0) {
    groups.push({ key: 'size', label: 'Tamano', display: 'checkbox', options: sizeOptions });
  }

  const stemsOptions = uniqueSearchOptions(products, (product) => [
    product.floweringStems,
    ...(product.variants ?? []).map((variant) => variant.floweringStems),
  ]);
  if (stemsOptions.length > 0) {
    groups.push({
      key: 'floweringStems',
      label: 'Varas florales',
      display: 'checkbox',
      options: stemsOptions.map((option) => ({
        ...option,
        label: `${option.label} ${option.label === '1' ? 'vara' : 'varas'}`,
      })),
    });
  }

  const inStockCount = products.filter(productHasAvailableStock).length;
  if (inStockCount > 0 && inStockCount < products.length) {
    groups.push({
      key: 'stock',
      label: 'Stock disponible',
      display: 'checkbox',
      options: [{ value: 'available', label: 'Solo disponibles', count: inStockCount }],
    });
  }

  const prices = products.flatMap(getProductPrices);
  const priceBounds = prices.length
    ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
    : { min: 0, max: 0 };

  return { groups, priceBounds };
};

const applySearchFilters = (products: Product[], filters: ReturnType<typeof createEmptyCatalogFilters>) => {
  const minPrice = parsePriceInput(filters.priceRange[0]);
  const maxPrice = parsePriceInput(filters.priceRange[1]);
  const hasPriceError = Boolean(getPriceRangeError(filters.priceRange));

  return products.filter((product) => {
    for (const [filterKey, selectedValues] of Object.entries(filters.values)) {
      if (selectedValues.length === 0) continue;

      if (filterKey === 'category') {
        if (!selectedValues.includes(getProductSearchCategory(product))) return false;
        continue;
      }

      if (filterKey === 'stock') {
        if (selectedValues.includes('available') && !productHasAvailableStock(product)) return false;
        continue;
      }

      if (filterKey === 'color') {
        const productValues = uniqueSearchOptions([product], (currentProduct) => [
          currentProduct.color,
          ...(currentProduct.colors ?? []),
          ...(currentProduct.variants ?? []).map((variant) => variant.color),
        ]).map((option) => option.value);
        if (!selectedValues.some((value) => productValues.includes(value))) return false;
        continue;
      }

      if (filterKey === 'size') {
        const productValues = uniqueSearchOptions([product], (currentProduct) => [
          currentProduct.size,
          ...(currentProduct.variants ?? []).map((variant) => variant.size),
        ]).map((option) => option.value);
        if (!selectedValues.some((value) => productValues.includes(value))) return false;
        continue;
      }

      if (filterKey === 'floweringStems') {
        const productValues = uniqueSearchOptions([product], (currentProduct) => [
          currentProduct.floweringStems,
          ...(currentProduct.variants ?? []).map((variant) => variant.floweringStems),
        ]).map((option) => option.value);
        if (!selectedValues.some((value) => productValues.includes(value))) return false;
      }
    }

    if (!hasPriceError && (minPrice !== null || maxPrice !== null)) {
      return getProductPrices(product).some((price) => {
        if (minPrice !== null && price < minPrice) return false;
        if (maxPrice !== null && price > maxPrice) return false;
        return true;
      });
    }

    return true;
  });
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

const buildCartKey = (
  item: Pick<CartItemInput, 'id' | 'sourceId' | 'variantId' | 'size' | 'color' | 'floweringStems' | 'price'>
) =>
  [
    item.sourceId || item.id,
    item.variantId || 'base',
    item.size || 'sin-tamano',
    item.color || 'sin-color',
    item.floweringStems || 'sin-varas',
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
      (!variant.floweringStems || variant.floweringStems === item.floweringStems) &&
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

function AppShell({ routePage }: { routePage: AppPage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: routeProductSlug } = useParams();
  const currentPage = routePage;
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
  const [searchFilters, setSearchFilters] = useState(() => createEmptyCatalogFilters());
  const currentCatalogCategory = getCatalogCategoryFromPage(currentPage);
  const productLoadRequestIdRef = useRef(0);
  const lastViewedProductKeyRef = useRef<string | null>(null);
  const searchPageQuery = new URLSearchParams(location.search).get('q') ?? '';
  const navigateToPage = useCallback((page: AppPage, options?: { replace?: boolean }) => {
    navigate(APP_PAGE_PATHS[page], { replace: options?.replace });
  }, [navigate]);

  const submitGlobalSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim();
    const searchPath = trimmedQuery
      ? `${APP_PAGE_PATHS.search}?q=${encodeURIComponent(trimmedQuery)}`
      : APP_PAGE_PATHS.search;

    setSearchQuery(trimmedQuery);
    navigate(searchPath);
  }, [navigate]);

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

    if (shouldOpenResetPassword && currentPage !== 'reset-password') {
      navigate(`${APP_PAGE_PATHS['reset-password']}${window.location.search}${window.location.hash}`, { replace: true });
    }

    const mercadoPagoResult = getMercadoPagoResultFromUrl();
    if (mercadoPagoResult && !shouldOpenResetPassword) {
      setCheckoutResult(mercadoPagoResult);
      navigateToPage(getCheckoutPageFromResult(mercadoPagoResult.status), { replace: true });
      if (mercadoPagoResult.orderId) {
        setCartItems([]);
      }
    }

    const authSubscription = isSupabaseReady()
      ? onSupabaseAuthChange((event, session) => {
          if (!isMounted) return;

          if (event === 'PASSWORD_RECOVERY') {
            navigateToPage('reset-password');
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

  useEffect(() => {
    if (currentPage === 'search') {
      setSearchQuery(searchPageQuery);
      setSearchFilters(createEmptyCatalogFilters());
    }
  }, [currentPage, searchPageQuery]);

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
      navigateToPage(postAuthPage);
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
    navigate(`/producto/${getProductSlug(product)}`);
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
    navigateToPage('checkout');
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

  const handleSearchFilterOptionToggle = (filterKey: string, value: string, checked: boolean) => {
    setSearchFilters((current) => {
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

  const handleSearchPriceRangeChange = (priceRange: [string, string]) => {
    setSearchFilters((current) => ({
      ...current,
      priceRange,
    }));
  };

  const clearSearchFilters = () => {
    setSearchFilters(createEmptyCatalogFilters());
  };

  const getSearchFilteredProducts = () => {
    let products = catalogProducts;
    
    // Aplicar filtros de búsqueda
    if (currentPage === 'search' && searchQuery) {
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
  const productPageProduct =
    currentPage === 'product' && routeProductSlug
      ? catalogProducts.find((product) => getProductSlug(product) === routeProductSlug) ?? null
      : null;
  const productPageRelatedProducts = productPageProduct
    ? catalogProducts
        .filter((product) => product.id !== productPageProduct.id)
        .filter((product) => product.category === productPageProduct.category || product.type === productPageProduct.type)
        .slice(0, 4)
    : [];
  const normalizedSearchPageQuery = searchPageQuery.trim();
  const globalSearchResults = normalizedSearchPageQuery
    ? catalogProducts.filter((product) => productMatchesSearchQuery(product, normalizedSearchPageQuery))
    : [];
  const searchAvailableFilters = getSearchFilterData(globalSearchResults);
  const searchPriceRangeError = getPriceRangeError(searchFilters.priceRange);
  const filteredGlobalSearchResults = applySearchFilters(globalSearchResults, searchFilters);

  useEffect(() => {
    if (currentPage !== 'product' || !productPageProduct) {
      return;
    }

    const productKey = productPageProduct.sourceId || String(productPageProduct.id);
    if (lastViewedProductKeyRef.current === productKey) {
      return;
    }

    lastViewedProductKeyRef.current = productKey;
    trackProductView(productPageProduct);
  }, [currentPage, productPageProduct]);

  const navigateBackFromProduct = () => {
    if (!productPageProduct) {
      navigateToPage('home');
      return;
    }

    if (isInteriorProduct(productPageProduct)) {
      navigateToPage('interior');
      return;
    }

    if (isExteriorProduct(productPageProduct)) {
      navigateToPage('exterior');
      return;
    }

    if (isArrangementProduct(productPageProduct)) {
      navigateToPage('arrangements');
      return;
    }

    if (isPotProduct(productPageProduct)) {
      navigateToPage('pots');
      return;
    }

    if (isAccessoryProduct(productPageProduct)) {
      navigateToPage('accessories');
      return;
    }

    navigateToPage('orchids');
  };

  if (currentPage === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onBack={() => navigateToPage('home')}
        onProductsChanged={() => window.dispatchEvent(new Event('products-updated'))}
      />
    );
  }

  if (currentPage === 'reset-password') {
    return (
      <ResetPassword 
        onBack={() => navigateToPage('home')}
        onPasswordReset={() => {
          navigateToPage('home');
          openAuthModal();
        }}
      />
    );
  }

  if (currentPage === 'account-settings' && user) {
    return (
      <AccountSettings 
        user={user}
        onBack={() => navigateToPage('home')}
        onUpdateUser={handleUpdateUser}
        onLogout={async () => {
          await handleLogout();
          navigateToPage('home');
        }}
      />
    );
  }

  if (currentPage === 'orders') {
    return <Orders onBack={() => navigateToPage('home')} user={user} />;
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
              navigateToPage('account-settings');
            } else {
              openAuthModal();
            }
          }}
          onNavigate={navigateToPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSearchSubmit={submitGlobalSearch}
          user={user}
        />

        <CheckoutResultPage
          result={checkoutResult ?? { status: fallbackStatus, source: 'url' }}
          items={cartItems}
          onBackHome={() => navigateToPage('home')}
          onBackToCart={() => {
            navigateToPage('home');
            setIsCartOpen(true);
          }}
          onBackToCheckout={() => navigateToPage('checkout')}
          onViewOrders={() => navigateToPage('orders')}
        />

        <Footer onNavigate={navigateToPage} />

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
            navigateToPage('account-settings');
          }}
          onNavigateToAdmin={() => {
            closeAuthModal();
            navigateToPage('admin');
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
            onNavigate={navigateToPage}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onSearchSubmit={submitGlobalSearch}
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
                onClick={() => navigateToPage('home')}
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
              navigateToPage('account-settings');
            }}
            onNavigateToAdmin={() => {
              closeAuthModal();
              navigateToPage('admin');
            }}
          />
        </div>
      );
    }

    return (
      <Checkout
        items={cartItems}
        onBack={() => navigateToPage('home')}
        onOrderComplete={(result) => {
          setCheckoutResult(result);
          if (result.status === 'success' || result.orderId) {
            clearCart();
          }

          navigateToPage(getCheckoutPageFromResult(result.status));
        }}
        user={user}
      />
    );
  }

  if (currentPage === 'product') {
    return (
      <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => {
            if (user) {
              navigateToPage('account-settings');
            } else {
              openAuthModal();
            }
          }}
          onNavigate={navigateToPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSearchSubmit={submitGlobalSearch}
          user={user}
        />

        <ProductPage
          product={productPageProduct}
          isLoading={isLoadingProducts}
          relatedProducts={productPageRelatedProducts}
          isFavorite={Boolean(productPageProduct && favoriteItems.some((item) => item.id === productPageProduct.id))}
          onBack={navigateBackFromProduct}
          onAddToCart={addSelectionToCart}
          onToggleFavorite={toggleFavorite}
          onOpenRelatedProduct={openProductDetail}
        />

        <Footer onNavigate={navigateToPage} />

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
            navigateToPage('account-settings');
          }}
          onNavigateToAdmin={() => {
            closeAuthModal();
            navigateToPage('admin');
          }}
        />
      </div>
    );
  }

  if (currentPage === 'search') {
    return (
      <div className="min-h-screen bg-[#FFF8EF] text-[#2F3A35]">
        <Header
          cartCount={cartCount}
          favoritesCount={favoritesCount}
          onCartClick={() => setIsCartOpen(true)}
          onFavoritesClick={() => setIsFavoritesOpen(true)}
          onUserClick={() => {
            if (user) {
              navigateToPage('account-settings');
            } else {
              openAuthModal();
            }
          }}
          onNavigate={navigateToPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSearchSubmit={submitGlobalSearch}
          user={user}
        />

        <main className="mx-auto min-h-[70vh] w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#2F3A35]">Resultados de busqueda</h1>
              <p className="mt-2 text-[#6B756F]">
                {normalizedSearchPageQuery
                  ? `Resultados para "${normalizedSearchPageQuery}"`
                  : 'Escribi una busqueda para encontrar productos en toda la tienda.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateToPage('home')}
              className="rounded-full border border-[#EADBC8] bg-white px-4 py-2 text-sm font-semibold text-[#2F3A35] transition-colors hover:bg-[#F8DDEB]/60"
            >
              Volver al inicio
            </button>
          </div>

          {isLoadingProducts ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <ProductGridSkeleton count={8} />
            </div>
          ) : normalizedSearchPageQuery && globalSearchResults.length > 0 ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
              <div className="lg:w-1/4 lg:flex-shrink-0">
                <Filters
                  filters={searchFilters}
                  filterGroups={searchAvailableFilters.groups}
                  priceBounds={searchAvailableFilters.priceBounds}
                  priceError={searchPriceRangeError}
                  onOptionToggle={handleSearchFilterOptionToggle}
                  onPriceRangeChange={handleSearchPriceRangeChange}
                  onClearFilters={clearSearchFilters}
                />
              </div>

              <div className="min-w-0 lg:w-3/4">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-[#6B756F]">
                    {filteredGlobalSearchResults.length} de {globalSearchResults.length} productos encontrados
                  </p>
                  {searchPriceRangeError && (
                    <p className="text-sm font-medium text-red-600">{searchPriceRangeError}</p>
                  )}
                </div>

                {filteredGlobalSearchResults.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredGlobalSearchResults.map((product) => (
                      <ProductCard
                        key={product.sourceId || product.id}
                        product={product}
                        onOpenDetails={openProductDetail}
                        onToggleFavorite={toggleFavorite}
                        isFavorite={favoriteItems.some((item) => item.id === product.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#EADBC8] bg-white px-6 py-12 text-center shadow-sm">
                    <h2 className="text-xl font-semibold text-[#2F3A35]">
                      No encontramos productos con esos filtros.
                    </h2>
                    <p className="mt-2 text-[#6B756F]">
                      Limpiá filtros o ajustá el rango de precio para ver más resultados.
                    </p>
                    <button
                      type="button"
                      onClick={clearSearchFilters}
                      className="mt-5 rounded-full bg-[#5FAE9B] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4D9A88]"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#EADBC8] bg-white px-6 py-12 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-[#2F3A35]">
                {normalizedSearchPageQuery ? 'No encontramos productos para tu busqueda.' : 'Busca en todo el catalogo.'}
              </h2>
              <p className="mt-2 text-[#6B756F]">
                Proba con otro nombre, color, categoria o tipo de producto.
              </p>
            </div>
          )}
        </main>

        <Footer onNavigate={navigateToPage} />

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
            navigateToPage('account-settings');
          }}
          onNavigateToAdmin={() => {
            closeAuthModal();
            navigateToPage('admin');
          }}
        />
      </div>
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
              navigateToPage('account-settings');
            } else {
              openAuthModal();
            }
          }}
          onNavigate={navigateToPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSearchSubmit={submitGlobalSearch}
          user={user}
        />
        <Accessories
          products={catalogProducts}
          isLoading={isLoadingProducts}
          onBack={() => navigateToPage('home')}
          onAddToCart={addToCart}
          onToggleFavorite={toggleFavorite}
          favoriteItems={favoriteItems}
        />
        <Footer onNavigate={navigateToPage} />

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
            navigateToPage('account-settings');
          }}
          onNavigateToAdmin={() => {
            closeAuthModal();
            navigateToPage('admin');
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
              navigateToPage('account-settings');
            } else {
              openAuthModal();
            }
          }}
          onNavigate={navigateToPage}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSearchSubmit={submitGlobalSearch}
          user={user}
        />
        <CareGuide onBack={() => navigateToPage('home')} />
        <Footer onNavigate={navigateToPage} />

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
            navigateToPage('account-settings');
          }}
          onNavigateToAdmin={() => {
            closeAuthModal();
            navigateToPage('admin');
          }}
        />
      </div>
    );
  }

  if (currentPage === 'privacy') {
    return <PrivacyPolicy onBack={() => navigateToPage('home')} />;
  }

  if (currentPage === 'terms') {
    return <TermsAndConditions onBack={() => navigateToPage('home')} />;
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
            navigateToPage('account-settings');
          } else {
            openAuthModal();
          }
        }}
        onNavigate={navigateToPage}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onSearchSubmit={submitGlobalSearch}
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
          <HeroCarousel onNavigate={navigateToPage} />
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
                  onClick={() => navigateToPage('orchids')}
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
                  onClick={() => navigateToPage('arrangements')}
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
                  onClick={() => navigateToPage('pots')}
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

      <Footer onNavigate={navigateToPage} />

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
          navigateToPage('account-settings');
        }}
        onNavigateToAdmin={() => {
          closeAuthModal();
          navigateToPage('admin');
        }}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<AppShell routePage="home" />} />
        <Route path="/admin" element={<AppShell routePage="admin" />} />
        <Route path="/perfil" element={<AppShell routePage="account-settings" />} />
        <Route path="/pedidos" element={<AppShell routePage="orders" />} />
        <Route path="/reset-password" element={<AppShell routePage="reset-password" />} />
        <Route path="/checkout" element={<AppShell routePage="checkout" />} />
        <Route path="/checkout/success" element={<AppShell routePage="checkout-success" />} />
        <Route path="/checkout/failure" element={<AppShell routePage="checkout-failure" />} />
        <Route path="/checkout/pending" element={<AppShell routePage="checkout-pending" />} />
        <Route path="/orquideas" element={<AppShell routePage="orchids" />} />
        <Route path="/plantas-interior" element={<AppShell routePage="interior" />} />
        <Route path="/plantas-exterior" element={<AppShell routePage="exterior" />} />
        <Route path="/producto/:slug" element={<AppShell routePage="product" />} />
        <Route path="/buscar" element={<AppShell routePage="search" />} />
        <Route path="/arreglos" element={<AppShell routePage="arrangements" />} />
        <Route path="/macetas" element={<AppShell routePage="pots" />} />
        <Route path="/accesorios" element={<AppShell routePage="accessories" />} />
        <Route path="/cuidados" element={<AppShell routePage="care" />} />
        <Route path="/privacidad" element={<AppShell routePage="privacy" />} />
        <Route path="/terminos" element={<AppShell routePage="terms" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
