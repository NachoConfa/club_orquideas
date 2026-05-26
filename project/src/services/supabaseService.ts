import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { Product, ProductAttributes } from '../types/product';
import {
  SUPABASE_AUTH_STORAGE_KEY,
  getSupabaseConfigMessage,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase';

type ProductRow = {
  id: number | string;
  name: string;
  slug?: string | null;
  price: number;
  description?: string | null;
  stock?: number | null;
  orchid_type?: string | null;
  color?: string | null;
  size?: string | null;
  flowering_stems?: number | null;
  image_url?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  original_price?: number | null;
  image?: string | null;
  rating?: number | null;
  reviews?: number | null;
  category?: string | null;
  in_stock?: boolean | null;
  type?: string | null;
  attributes?: ProductAttributes | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone?: string | null;
  address?: string | null;
  role: string | null;
  created_at: string | null;
};

type ProductImageRow = {
  product_id: string;
  image_url: string | null;
  sort_order?: number | null;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  color?: string | null;
  size?: string | null;
  flowering_stems?: number | null;
  price?: number | null;
  stock?: number | null;
  image_url?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
};

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role?: string;
  isAdmin: boolean;
  profileLoaded?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  needsEmailConfirmation: boolean;
}

export interface ProfileUpdateInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  currentEmail: string;
  currentPassword?: string;
  newPassword?: string;
}

export const isSupabaseReady = () => isSupabaseConfigured;

const SUPABASE_REQUEST_TIMEOUT_MS = 15000;
const SUPABASE_AUTH_TIMEOUT_MS = 12000;
const SESSION_TIMEOUT_MESSAGE = 'La carga de la sesion tardo demasiado. Recarga la pagina e intenta nuevamente.';

const getClient = () => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  return supabase;
};

const withSupabaseTimeout = <T,>(
  operation: PromiseLike<T>,
  message: string,
  timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);

    Promise.resolve(operation)
      .then(resolve, reject)
      .finally(() => globalThis.clearTimeout(timeoutId));
  });

export const isSupabaseSessionTimeoutError = (error: unknown) =>
  error instanceof Error && error.message === SESSION_TIMEOUT_MESSAGE;

const getAuthRestConfig = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(getSupabaseConfigMessage());
  }

  return { supabaseUrl, supabaseAnonKey };
};

const getDisplayName = (user: User, fallbackEmail?: string) => {
  const metadataName = user.user_metadata?.name || user.user_metadata?.full_name;
  const email = fallbackEmail || user.email || '';

  return metadataName || email.split('@')[0] || 'Usuario';
};

const logProfileFallback = (message: string, error: unknown) => {
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_PROFILE_FALLBACK === 'true') {
    console.info(message, error);
  }
};

const DEFAULT_PRODUCT_IMAGE =
  'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=500';
const PRODUCT_COLUMNS =
  'id, name, description, price, stock, orchid_type, color, size, image_url, is_active';
const PRODUCT_COLUMNS_WITH_OPTIONAL =
  `${PRODUCT_COLUMNS}, slug, flowering_stems`;
const PRODUCT_VARIANT_COLUMNS =
  'id, product_id, color, size, flowering_stems, price, stock, image_url, is_active, sort_order';

const isMissingOptionalProductColumnError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLowerCase() ?? '';
  return error.code === 'PGRST204' || error.code === '42703' || message.includes('slug') || message.includes('flowering_stems');
};

const isMissingProductVariantsTableError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('product_variants') ||
    message.includes('schema cache')
  );
};

const toStableNumericId = (id: number | string) => {
  if (typeof id === 'number') {
    return id;
  }

  let hash = 0;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
};

const isProductAttributes = (value: unknown): value is ProductAttributes =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sanitizeProductDescription = (description?: string | null) => {
  if (!description?.trim()) {
    return undefined;
  }

  return description
    .replace(/\bpor\s+Instagram\s+@clubdelasorquideas\s+o\s+al\s+/gi, 'al ')
    .replace(/\bInstagram\s+@clubdelasorquideas\b/gi, 'Modo Plantas')
    .replace(/@clubdelasorquideas\b/gi, 'Modo Plantas')
    .replace(/\bClub de Las Orqu[ií]deas\b/gi, 'Modo Plantas')
    .replace(/\bClub de las Orqu[ií]deas\b/gi, 'Modo Plantas')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const mapProductVariant = (variant: ProductVariantRow) => ({
  id: variant.id,
  productId: variant.product_id,
  size: variant.size?.trim() || 'Mediana',
  color: variant.color?.trim() || 'Variado',
  floweringStems: variant.flowering_stems == null ? undefined : Number(variant.flowering_stems),
  price: Number(variant.price ?? 0),
  stock: Math.max(0, Number(variant.stock ?? 0)),
  image: variant.image_url?.trim() || undefined,
  isActive: variant.is_active !== false,
  sortOrder: Number(variant.sort_order ?? 0),
});

const mapProduct = (product: ProductRow): Product => {
  const sourceId = String(product.id);
  const baseImage = product.image_url?.trim() || product.image?.trim() || DEFAULT_PRODUCT_IMAGE;
  const images = [baseImage];
  const fallbackStock = Number(product.stock ?? 0);
  const attributes = isProductAttributes(product.attributes) ? product.attributes : {};
  const fallbackVariant = {
    size: product.size || 'Mediana',
    color: product.color || 'Variado',
    price: Number(product.price),
    stock: fallbackStock,
    image: baseImage,
  };

  return {
    id: toStableNumericId(product.id),
    sourceId,
    slug: product.slug || undefined,
    name: product.name,
    price: Number(product.price),
    originalPrice: product.original_price == null ? undefined : Number(product.original_price),
    image: baseImage,
    rating: Number(product.rating ?? 5),
    reviews: product.reviews ?? 0,
    category: product.category || product.orchid_type || 'Orquideas',
    color: product.color || 'Variado',
    size: product.size || 'Mediana',
    inStock: product.in_stock ?? (product.is_active !== false && fallbackStock > 0),
    type: product.type || product.orchid_type || 'Orquideas',
    description: sanitizeProductDescription(product.description),
    stock: product.stock == null ? undefined : fallbackStock,
    floweringStems: product.flowering_stems == null ? undefined : Number(product.flowering_stems),
    images,
    colors: [fallbackVariant.color],
    variants: [fallbackVariant],
    attributes,
  };
};

const uniqueValues = (values: Array<string | undefined>) =>
  Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));

const mapProductsWithDetails = (
  products: ProductRow[],
  imageRows: ProductImageRow[],
  variantRows: ProductVariantRow[] = []
) => {
  const imagesByProduct = new Map<string, string[]>();
  const variantsByProduct = new Map<string, ReturnType<typeof mapProductVariant>[]>();

  imageRows
    .slice()
    .sort((first, second) => Number(first.sort_order ?? 0) - Number(second.sort_order ?? 0))
    .forEach((row) => {
      if (!row.product_id || !row.image_url?.trim()) return;
      const productImages = imagesByProduct.get(row.product_id) ?? [];
      productImages.push(row.image_url.trim());
      imagesByProduct.set(row.product_id, productImages);
    });

  variantRows
    .slice()
    .sort((first, second) => Number(first.sort_order ?? 0) - Number(second.sort_order ?? 0))
    .forEach((row) => {
      if (!row.product_id || row.is_active === false) return;
      const productVariants = variantsByProduct.get(row.product_id) ?? [];
      productVariants.push(mapProductVariant(row));
      variantsByProduct.set(row.product_id, productVariants);
    });

  return products.map((product) => {
    const mappedProduct = mapProduct(product);
    const sourceId = String(product.id);
    const realVariants = variantsByProduct.get(sourceId) ?? [];
    const variants = realVariants.length > 0 ? realVariants : mappedProduct.variants ?? [];
    const variantImages = variants.map((variant) => variant.image).filter(Boolean) as string[];
    const images = uniqueValues([mappedProduct.image, ...(imagesByProduct.get(sourceId) ?? []), ...variantImages]);
    const colors = uniqueValues([...variants.map((variant) => variant.color), mappedProduct.color]);
    const hasRealVariants = realVariants.length > 0;
    const variantStock = realVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock ?? 0)), 0);
    const variantPrices = realVariants.map((variant) => Number(variant.price)).filter((price) => Number.isFinite(price));

    return {
      ...mappedProduct,
      price: hasRealVariants && variantPrices.length > 0 ? Math.min(...variantPrices) : mappedProduct.price,
      images: images.length > 0 ? images : [mappedProduct.image],
      colors: colors.length > 0 ? colors : [mappedProduct.color],
      variants,
      stock: hasRealVariants ? variantStock : mappedProduct.stock,
      inStock: hasRealVariants ? realVariants.some((variant) => Number(variant.stock) > 0) : mappedProduct.inStock,
    };
  });
};

const mapProfile = (profile: ProfileRow, authUser: User): AuthenticatedUser => ({
  id: authUser.id,
  name: profile.full_name || getDisplayName(authUser),
  email: authUser.email || '',
  phone: profile.phone || undefined,
  address: profile.address || undefined,
  role: profile.role || 'customer',
  isAdmin: profile.role === 'admin',
  profileLoaded: true,
  createdAt: profile.created_at || undefined,
});

const mapAuthUserFallback = (authUser: User): AuthenticatedUser => ({
  id: authUser.id,
  name: getDisplayName(authUser),
  email: authUser.email || '',
  role: 'customer',
  isAdmin: false,
  profileLoaded: false,
});

const signInWithPasswordRest = async (email: string, password: string) => {
  const { supabaseUrl, supabaseAnonKey } = getAuthRestConfig();
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), SUPABASE_AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.error_description ||
        data?.msg ||
        data?.message ||
        data?.error ||
        'No se pudo iniciar sesión.';
      throw new Error(message);
    }

    if (!data?.access_token || !data?.refresh_token || !data?.user) {
      throw new Error('Supabase no devolvió una sesión válida.');
    }

    return data as {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
      token_type?: string;
      user: User;
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('El inicio de sesión tardó demasiado. Verificá tu conexión e intentá nuevamente.');
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

const persistRestSession = (authData: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
  user: User;
}) => {
  const expiresIn = Number(authData.expires_in ?? 3600);

  localStorage.setItem(
    SUPABASE_AUTH_STORAGE_KEY,
    JSON.stringify({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      token_type: authData.token_type || 'bearer',
      expires_in: expiresIn,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      user: authData.user,
    })
  );
};

const fetchProfileWithToken = async (authUser: User, accessToken: string): Promise<AuthenticatedUser> => {
  const { supabaseUrl, supabaseAnonKey } = getAuthRestConfig();
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), SUPABASE_AUTH_TIMEOUT_MS);
  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,full_name,phone,address,role,created_at&id=eq.${authUser.id}&limit=1`,
      { headers, signal: controller.signal }
    );

    if (profileResponse.ok) {
      const profiles = (await profileResponse.json()) as ProfileRow[];
      if (profiles[0]) {
        return mapProfile(profiles[0], authUser);
      }
    }

    const createResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,full_name,phone,address,role,created_at`,
      {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          id: authUser.id,
          full_name: getDisplayName(authUser),
          role: 'customer',
        }),
        signal: controller.signal,
      }
    );

    if (createResponse.ok) {
      const createdProfiles = (await createResponse.json()) as ProfileRow[];
      if (createdProfiles[0]) {
        return mapProfile(createdProfiles[0], authUser);
      }
    }
  } catch (error) {
    logProfileFallback('Perfil no disponible con token directo. Se usan datos basicos de la sesion.', error);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  return mapAuthUserFallback(authUser);
};

const getProfileForUser = async (authUser: User): Promise<AuthenticatedUser> => {
  const client = getClient();

  try {
    const { data, error } = await withSupabaseTimeout(
      client
        .from('profiles')
        .select('id, full_name, phone, address, role, created_at')
        .eq('id', authUser.id)
        .maybeSingle<ProfileRow>(),
      'No se pudo cargar tu perfil. Intentá nuevamente.'
    );

    if (error) {
      throw error;
    }

    if (data) {
      return mapProfile(data, authUser);
    }

    const { data: createdProfile, error: createProfileError } = await withSupabaseTimeout(
      client
        .from('profiles')
        .insert({
          id: authUser.id,
          full_name: getDisplayName(authUser),
          role: 'customer',
        })
        .select('id, full_name, phone, address, role, created_at')
        .maybeSingle<ProfileRow>(),
      'No se pudo crear tu perfil. Intentá nuevamente.'
    );

    if (createProfileError) {
      throw createProfileError;
    }

    if (createdProfile) {
      return mapProfile(createdProfile, authUser);
    }
  } catch (error) {
    logProfileFallback('Perfil no disponible en Supabase. Se usan datos basicos de la sesion.', error);
  }

  return mapAuthUserFallback(authUser);
};

export const getSupabaseProducts = async (): Promise<Product[]> => {
  const client = getClient();
  let productsResult = await client
    .from('products')
    .select(PRODUCT_COLUMNS_WITH_OPTIONAL)
    .eq('is_active', true);

  if (productsResult.error && isMissingOptionalProductColumnError(productsResult.error)) {
    productsResult = await client
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('is_active', true);
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  const productRows = ((productsResult.data ?? []) as unknown as ProductRow[]).sort((first, second) =>
    String(first.name ?? '').localeCompare(String(second.name ?? ''), 'es')
  );
  const [imagesResult, variantsResult] = await Promise.allSettled([
    client.from('product_images').select('product_id, image_url, sort_order').order('sort_order', { ascending: true }),
    client
      .from('product_variants')
      .select(PRODUCT_VARIANT_COLUMNS)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);
  const imageRows =
    imagesResult.status === 'fulfilled' && !imagesResult.value.error
      ? ((imagesResult.value.data ?? []) as ProductImageRow[])
      : [];
  const variantRows =
    variantsResult.status === 'fulfilled' && !variantsResult.value.error
      ? ((variantsResult.value.data ?? []) as ProductVariantRow[])
      : [];

  if (imagesResult.status === 'fulfilled' && imagesResult.value.error) {
    console.warn('No se pudieron cargar imagenes adicionales de productos:', imagesResult.value.error.message);
  }

  if (
    variantsResult.status === 'fulfilled' &&
    variantsResult.value.error &&
    !isMissingProductVariantsTableError(variantsResult.value.error) &&
    import.meta.env.DEV
  ) {
    console.warn('No se pudieron cargar variantes de productos:', variantsResult.value.error.message);
  }

  return mapProductsWithDetails(productRows, imageRows, variantRows);
};

export const getAuthenticatedUserFromSession = async (session: Session | null): Promise<AuthenticatedUser | null> => {
  if (!session?.user) {
    return null;
  }

  return getProfileForUser(session.user);
};

export const getBasicAuthenticatedUserFromSession = (session: Session | null): AuthenticatedUser | null => {
  if (!session?.user) {
    return null;
  }

  return mapAuthUserFallback(session.user);
};

export const getCurrentSupabaseUser = async (): Promise<AuthenticatedUser | null> => {
  const client = getClient();
  const sessionResult = await withSupabaseTimeout(
    client.auth.getSession(),
    'La carga de la sesion tardó demasiado. Recargá la pagina e intentá nuevamente.'
  );

  if (sessionResult.error) {
    throw sessionResult.error;
  }

  return getAuthenticatedUserFromSession(sessionResult.data.session);

};

export const signInWithSupabase = async (email: string, password: string, captchaToken?: string) => {
  const client = getClient();
  const { data, error } = await withSupabaseTimeout(
    client.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken,
      },
    }),
    'El inicio de sesion tardo demasiado. Verifica tu conexion e intenta nuevamente.',
    SUPABASE_AUTH_TIMEOUT_MS
  );

  if (error) {
    throw error;
  }

  if (!data.session || !data.user) {
    throw new Error('Supabase no devolvio una sesion valida.');
  }

  const authData = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.user,
  };

  void withSupabaseTimeout(
    client.auth.setSession({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
    }),
    'Se validó el usuario, pero no se pudo guardar la sesión local. Recargá la página e intentá nuevamente.'
  ).catch((error) => {
    console.warn('La sesión se guardó manualmente, pero Supabase Auth no terminó setSession.', error);
  });

  return fetchProfileWithToken(authData.user, authData.access_token);
};

export const signUpWithSupabase = async (
  name: string,
  email: string,
  password: string,
  captchaToken?: string
): Promise<AuthResult> => {
  const client = getClient();
  const { data, error } = await withSupabaseTimeout(
    client.auth.signUp({
      email,
      password,
      options: {
        data: { name, full_name: name },
        emailRedirectTo: window.location.origin,
        captchaToken,
      },
    }),
    'La creación de cuenta tardó demasiado. Verificá tu conexión e intentá nuevamente.'
  );

  if (error) {
    throw error;
  }

  if (!data.session || !data.user) {
    return {
      user: null,
      needsEmailConfirmation: true,
    };
  }

  return {
    user: await getProfileForUser(data.user),
    needsEmailConfirmation: false,
  };
};

export const signOutFromSupabase = async () => {
  const client = getClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
};

export const sendSupabasePasswordReset = async (email: string, captchaToken?: string) => {
  const client = getClient();
  const redirectTo = `${window.location.origin}${window.location.pathname}?reset-password=true`;
  const { error } = await withSupabaseTimeout(
    client.auth.resetPasswordForEmail(email, { redirectTo, captchaToken }),
    'No se pudo enviar el email de cambio de contraseña. Intentá nuevamente.'
  );

  if (error) {
    throw error;
  }
};

export const updateSupabasePassword = async (password: string) => {
  const client = getClient();
  const { error } = await withSupabaseTimeout(
    client.auth.updateUser({ password }),
    'No se pudo actualizar la contraseña. Intentá nuevamente.'
  );

  if (error) {
    throw error;
  }
};

export const updateSupabaseProfile = async ({
  name,
  email,
  phone,
  address,
  currentEmail,
  currentPassword,
  newPassword,
}: ProfileUpdateInput) => {
  const client = getClient();
  const {
    data: { user },
    error: userError,
  } = await withSupabaseTimeout(
    client.auth.getUser(),
    'No se pudo validar tu sesión. Intentá nuevamente.'
  );

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('No hay una sesion activa.');
  }

  if (newPassword) {
    if (!currentPassword) {
      throw new Error('Ingresá tu contraseña actual para cambiarla.');
    }

    const { error: passwordCheckError } = await withSupabaseTimeout(
      client.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      }),
      'No se pudo validar la contraseña actual. Intentá nuevamente.'
    );

    if (passwordCheckError) {
      throw new Error('La contraseña actual es incorrecta.');
    }
  }

  const authUpdates: {
    email?: string;
    password?: string;
    data?: { name: string; full_name: string };
  } = {};
  const normalizedEmail = email.trim();
  const emailChanged = normalizedEmail !== currentEmail;

  if (emailChanged) {
    authUpdates.email = normalizedEmail;
  }

  if (newPassword) {
    authUpdates.password = newPassword;
  }

  if (emailChanged || newPassword) {
    authUpdates.data = { name, full_name: name };

    const { error: updateAuthError } = await withSupabaseTimeout(
      client.auth.updateUser(authUpdates),
      'No se pudo actualizar tu usuario. Intentá nuevamente.'
    );

    if (updateAuthError) {
      throw updateAuthError;
    }
  }

  const { data: updatedProfile, error: profileError } = await withSupabaseTimeout(
    client
      .from('profiles')
      .update({
        full_name: name,
        phone: phone || null,
        address: address || null,
      })
      .eq('id', user.id)
      .select('id, full_name, phone, address, role, created_at')
      .single<ProfileRow>(),
    'No se pudo guardar tu perfil. Intentá nuevamente.'
  );

  if (profileError) {
    const { data: createdProfile, error: createProfileError } = await withSupabaseTimeout(
      client
        .from('profiles')
        .insert({
          id: user.id,
          full_name: name,
          phone: phone || null,
          address: address || null,
          role: 'customer',
        })
        .select('id, full_name, phone, address, role, created_at')
        .single<ProfileRow>(),
      'No se pudo crear tu perfil. Intentá nuevamente.'
    );

    if (createProfileError) {
      throw createProfileError;
    }

    return mapProfile(createdProfile, { ...user, email: normalizedEmail });
  }

  return mapProfile(updatedProfile, { ...user, email: normalizedEmail });
};

export const onSupabaseAuthChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  const client = getClient();
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange(callback);

  return subscription;
};
