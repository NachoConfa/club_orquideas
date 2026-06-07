import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  showFallbackLabel?: boolean;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'auto' | 'sync';
}

const ProductImage = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  showFallbackLabel = true,
  loading,
  decoding = 'async',
}: ProductImageProps) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl = typeof src === 'string' ? src.trim() : '';

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  if (!imageUrl || hasError) {
    return (
      <div
        role="img"
        aria-label={`Imagen no disponible para ${alt}`}
        className={`flex h-full w-full items-center justify-center bg-[#F8EFE3] text-[#6B756F] ${fallbackClassName}`}
      >
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <ImageOff className="h-8 w-8 text-[#0F8F61]/70" aria-hidden="true" />
          {showFallbackLabel && <span className="text-xs font-medium">Imagen no disponible</span>}
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

export default ProductImage;
