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

  const productFolder = sanitizeSegment(options.productSlug || options.productId || 'producto');
  const uploadFolder = options.variant ? `products/${productFolder}/variants` : `products/${productFolder}`;
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
