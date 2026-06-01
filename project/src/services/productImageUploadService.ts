import { getSupabaseConfigMessage, supabase } from '../lib/supabase';

const PRODUCT_IMAGES_BUCKET = 'product-images';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface ProductImageUploadOptions {
  productId?: string;
  productSlug?: string;
  variant?: boolean;
  folder?: 'products' | 'care-guides' | 'events';
}

interface ProductImageDeleteResult {
  deleted: boolean;
  skipped: boolean;
  reason?: 'not_product_images_bucket' | 'empty_url' | 'still_in_use';
}

const sanitizeSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'producto';

const sanitizeFileName = (fileName: string, mimeType: string) => {
  const fallbackExtension = MIME_EXTENSION[mimeType] ?? 'jpg';
  const normalized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const sanitized = normalized
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const safeName = sanitized || `imagen.${fallbackExtension}`;

  return /\.(jpe?g|png|webp)$/i.test(safeName) ? safeName : `${safeName}.${fallbackExtension}`;
};

export const getStoragePathFromPublicUrl = (publicUrl: string) => {
  const rawUrl = publicUrl.trim();

  if (!rawUrl) {
    return null;
  }

  const bucketMarker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  let pathSource = rawUrl;

  try {
    pathSource = new URL(rawUrl).pathname;
  } catch {
    pathSource = rawUrl.split(/[?#]/)[0] ?? rawUrl;
  }

  const markerIndex = pathSource.indexOf(bucketMarker);

  if (markerIndex === -1) {
    return null;
  }

  const encodedPath = pathSource.slice(markerIndex + bucketMarker.length).replace(/^\/+/, '');

  if (!encodedPath) {
    return null;
  }

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
};

export const isProductImagesBucketUrl = (publicUrl: string) => Boolean(getStoragePathFromPublicUrl(publicUrl));

const countImageUsage = async (tableName: string, publicUrl: string) => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  const result = await supabase.from(tableName).select('id', { count: 'exact', head: true }).eq('image_url', publicUrl);
  const message = result.error?.message?.toLowerCase() ?? '';

  if (
    result.error &&
    (result.error.code === '42P01' ||
      result.error.code === 'PGRST205' ||
      message.includes('could not find the table') ||
      message.includes('does not exist'))
  ) {
    return 0;
  }

  if (result.error) {
    throw result.error;
  }

  return Number(result.count ?? 0);
};

const isImageUrlStillUsed = async (publicUrl: string) => {
  const [productsCount, variantsCount, careGuidesCount, careGuideVariantsCount, eventsCount, eventSectionsCount] =
    await Promise.all([
      countImageUsage('products', publicUrl),
      countImageUsage('product_variants', publicUrl),
      countImageUsage('care_guides', publicUrl),
      countImageUsage('care_guide_variants', publicUrl),
      countImageUsage('events', publicUrl),
      countImageUsage('event_sections', publicUrl),
    ]);

  return productsCount + variantsCount + careGuidesCount + careGuideVariantsCount + eventsCount + eventSectionsCount > 0;
};

export const uploadProductImage = async (file: File, options: ProductImageUploadOptions = {}) => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('La imagen debe ser JPG, PNG o WebP.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('La imagen no puede superar los 5 MB.');
  }

  const rootFolder = options.folder === 'care-guides' ? 'care-guides' : options.folder === 'events' ? 'events' : 'products';
  const productFolder = sanitizeSegment(options.productSlug || options.productId || 'producto');
  const uploadFolder = options.variant ? `${rootFolder}/${productFolder}/variants` : `${rootFolder}/${productFolder}`;
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const safeFileName = sanitizeFileName(file.name, file.type);
  const filePath = `${uploadFolder}/${Date.now()}-${randomSuffix}-${safeFileName}`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(filePath, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error uploading product image:', {
        message: error.message,
        name: error.name,
      });
    }

    throw new Error('No se pudo subir la imagen. Verificá el bucket y los permisos de Storage.');
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error('La imagen se subió, pero no se pudo obtener la URL pública.');
  }

  return data.publicUrl;
};

export const deleteProductImageByPublicUrl = async (publicUrl: string): Promise<ProductImageDeleteResult> => {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  if (!publicUrl.trim()) {
    return { deleted: false, skipped: true, reason: 'empty_url' };
  }

  const storagePath = getStoragePathFromPublicUrl(publicUrl);

  if (!storagePath) {
    return { deleted: false, skipped: true, reason: 'not_product_images_bucket' };
  }

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Error deleting product image:', {
        message: error.message,
        name: error.name,
        storagePath,
      });
    }

    throw new Error('No se pudo borrar una imagen del almacenamiento.');
  }

  return { deleted: true, skipped: false };
};

export const deleteUnusedProductImageByPublicUrl = async (
  publicUrl: string
): Promise<ProductImageDeleteResult> => {
  if (!publicUrl.trim()) {
    return { deleted: false, skipped: true, reason: 'empty_url' };
  }

  if (!isProductImagesBucketUrl(publicUrl)) {
    return { deleted: false, skipped: true, reason: 'not_product_images_bucket' };
  }

  const stillUsed = await isImageUrlStillUsed(publicUrl);

  if (stillUsed) {
    return { deleted: false, skipped: true, reason: 'still_in_use' };
  }

  return deleteProductImageByPublicUrl(publicUrl);
};
