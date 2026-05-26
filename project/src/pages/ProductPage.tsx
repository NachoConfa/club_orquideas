import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import type { CartItemInput } from '../types/cart';
import type { Product, ProductVariant } from '../types/product';

interface ProductPageProps {
  product: Product | null;
  isLoading: boolean;
  relatedProducts?: Product[];
  isFavorite: boolean;
  onBack: () => void;
  onAddToCart: (item: CartItemInput) => void;
  onToggleFavorite: (product: Product) => void;
  onOpenRelatedProduct?: (product: Product) => void;
}

const formatMoney = (value: number) => `$${value.toLocaleString('es-AR')}`;

const uniqueValues = <T,>(values: Array<T | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is T => value !== null && value !== undefined && String(value).trim() !== '')));

const getProductVariants = (product: Product): ProductVariant[] =>
  product.variants && product.variants.length > 0
    ? product.variants
    : [
        {
          size: product.size,
          color: product.color,
          floweringStems: product.floweringStems,
          price: product.price,
          stock: Number(product.stock ?? (product.inStock ? 1 : 0)),
          image: product.image,
        },
      ];

type VariantSelection = {
  color?: string;
  size?: string;
  floweringStems?: number | null;
};

const ProductPage = ({
  product,
  isLoading,
  relatedProducts = [],
  isFavorite,
  onBack,
  onAddToCart,
  onToggleFavorite,
  onOpenRelatedProduct,
}: ProductPageProps) => {
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedStems, setSelectedStems] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  const variants = useMemo(() => (product ? getProductVariants(product) : []), [product]);
  const hasRealVariants = variants.some((variant) => Boolean(variant.id));
  const colors = useMemo(
    () =>
      product
        ? hasRealVariants
          ? uniqueValues(variants.map((variant) => variant.color))
          : uniqueValues([...(product.colors ?? []), product.color, ...variants.map((variant) => variant.color)])
        : [],
    [hasRealVariants, product, variants]
  );
  const sizes = useMemo(
    () =>
      product
        ? hasRealVariants
          ? uniqueValues(variants.map((variant) => variant.size))
          : uniqueValues([product.size, ...variants.map((variant) => variant.size)])
        : [],
    [hasRealVariants, product, variants]
  );
  const stemOptions = useMemo(
    () =>
      product
        ? hasRealVariants
          ? uniqueValues(variants.map((variant) => variant.floweringStems))
          : uniqueValues([product.floweringStems, ...variants.map((variant) => variant.floweringStems)])
        : [],
    [hasRealVariants, product, variants]
  );

  const findCompatibleVariant = (selection: VariantSelection, preferStock = true) => {
    const matchesSelection = (variant: ProductVariant) =>
      (!selection.color || variant.color === selection.color) &&
      (!selection.size || variant.size === selection.size) &&
      (!selection.floweringStems || variant.floweringStems === selection.floweringStems);

    return (
      (preferStock ? variants.find((variant) => matchesSelection(variant) && Number(variant.stock) > 0) : null) ||
      variants.find(matchesSelection) ||
      variants.find((variant) => (selection.color ? variant.color === selection.color : true) && Number(variant.stock) > 0) ||
      variants.find((variant) => (selection.size ? variant.size === selection.size : true) && Number(variant.stock) > 0) ||
      variants.find((variant) => Number(variant.stock) > 0) ||
      variants[0] ||
      null
    );
  };

  const selectedVariant = useMemo(() => {
    if (!product) return null;

    if (hasRealVariants) {
      return findCompatibleVariant({
        color: selectedColor,
        size: selectedSize,
        floweringStems: selectedStems,
      });
    }

    return (
      variants.find(
        (variant) =>
          (!selectedColor || !variant.color || variant.color === selectedColor) &&
          (!selectedSize || variant.size === selectedSize) &&
          (!selectedStems || !variant.floweringStems || variant.floweringStems === selectedStems)
      ) ||
      variants.find((variant) => !selectedSize || variant.size === selectedSize) ||
      variants[0] ||
      null
    );
  }, [hasRealVariants, product, selectedColor, selectedSize, selectedStems, variants]);

  const imageOptions = useMemo(() => {
    if (!product) return [];
    return uniqueValues([product.image, ...(product.images ?? []), ...variants.map((variant) => variant.image)]);
  }, [product, variants]);

  const activeImage = selectedImage || selectedVariant?.image || product?.image || '';
  const activePrice = selectedVariant?.price ?? product?.price ?? 0;
  const activeStock = Math.max(0, Number(selectedVariant?.stock ?? product?.stock ?? 0));
  const isOutOfStock = activeStock <= 0;

  const applyVariantSelection = (variant: ProductVariant) => {
    setSelectedColor(variant.color || '');
    setSelectedSize(variant.size || '');
    setSelectedStems(variant.floweringStems ?? null);
    setSelectedImage(variant.image || product?.image || '');
    setMessage('');
  };

  const selectVariantOption = (selection: VariantSelection) => {
    if (!hasRealVariants) {
      if (selection.color !== undefined) setSelectedColor(selection.color);
      if (selection.size !== undefined) setSelectedSize(selection.size);
      if (selection.floweringStems !== undefined) setSelectedStems(selection.floweringStems);
      setMessage('');
      return;
    }

    const nextVariant = findCompatibleVariant(
      {
        color: selection.color ?? selectedColor,
        size: selection.size ?? selectedSize,
        floweringStems: selection.floweringStems ?? selectedStems,
      },
      true
    );

    if (nextVariant) {
      applyVariantSelection(nextVariant);
    }
  };

  const isVariantOptionAvailable = (field: 'color' | 'size' | 'floweringStems', value: string | number) => {
    if (!hasRealVariants) return true;

    return variants.some((variant) => {
      const sameField =
        field === 'color'
          ? variant.color === value
          : field === 'size'
            ? variant.size === value
            : variant.floweringStems === value;

      if (!sameField || Number(variant.stock) <= 0) {
        return false;
      }

      const compatibleColor = field === 'color' || !selectedColor || variant.color === selectedColor;
      const compatibleSize = field === 'color' || field === 'size' || !selectedSize || variant.size === selectedSize;
      const compatibleStems =
        field === 'color' || field === 'size' || field === 'floweringStems' || !selectedStems || variant.floweringStems === selectedStems;

      return compatibleColor && compatibleSize && compatibleStems;
    });
  };

  useEffect(() => {
    if (!product) return;

    const initialVariants = getProductVariants(product);
    const preferredVariant =
      initialVariants.find((variant) => Boolean(variant.id) && Number(variant.stock) > 0) ||
      initialVariants.find((variant) => Boolean(variant.id)) ||
      null;

    if (preferredVariant) {
      setSelectedImage(preferredVariant.image || product.image);
      setSelectedColor(preferredVariant.color || '');
      setSelectedSize(preferredVariant.size || '');
      setSelectedStems(preferredVariant.floweringStems ?? null);
      setQuantity(1);
      setMessage('');
      return;
    }

    const initialColors = uniqueValues([
      ...(product.colors ?? []),
      product.color,
      ...initialVariants.map((variant) => variant.color),
    ]);
    const initialSizes = uniqueValues([product.size, ...initialVariants.map((variant) => variant.size)]);
    const initialStems = uniqueValues([product.floweringStems, ...initialVariants.map((variant) => variant.floweringStems)]);

    setSelectedImage((product.images && product.images[0]) || product.image);
    setSelectedColor(initialColors.length === 1 ? initialColors[0] : '');
    setSelectedSize(initialSizes.length === 1 ? initialSizes[0] : '');
    setSelectedStems(initialStems.length === 1 ? initialStems[0] : null);
    setQuantity(1);
    setMessage('');
  }, [product]);

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, activeStock)));
  }, [activeStock]);

  if (isLoading) {
    return (
      <main className="min-h-[70vh] bg-[#FFF8EF]">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="h-[520px] animate-pulse rounded-2xl bg-white shadow-sm" />
            <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
              <div className="h-5 w-32 animate-pulse rounded bg-gray-100" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
              <div className="h-24 w-full animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-[70vh] bg-[#FFF8EF]">
        <div className="container mx-auto px-4 py-12">
          <button
            type="button"
            onClick={onBack}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#0f8f61] hover:text-[#0c7a52]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al catálogo
          </button>
          <div className="rounded-2xl border border-[#EADBC8] bg-white p-10 text-center shadow-sm">
            <PackageCheck className="mx-auto mb-4 h-12 w-12 text-[#CFE3D4]" />
            <h1 className="text-2xl font-bold text-[#2F3A35]">Producto no encontrado</h1>
            <p className="mt-2 text-[#6B756F]">El producto que buscás no está disponible o cambió de dirección.</p>
          </div>
        </div>
      </main>
    );
  }

  const handleAddToCart = () => {
    if (colors.length > 1 && !selectedColor) {
      setMessage('Seleccioná un color antes de agregar el producto.');
      return;
    }

    if (sizes.length > 1 && !selectedSize) {
      setMessage('Seleccioná un tamaño antes de agregar el producto.');
      return;
    }

    if (stemOptions.length > 1 && !selectedStems) {
      setMessage('Seleccioná la cantidad de varas antes de agregar el producto.');
      return;
    }

    if (isOutOfStock) {
      setMessage('Este producto está agotado.');
      return;
    }

    onAddToCart({
      id: product.id,
      sourceId: product.sourceId,
      variantId: selectedVariant?.id,
      name: product.name,
      price: activePrice,
      image: activeImage,
      quantity,
      color: selectedColor || selectedVariant?.color || product.color,
      size: selectedSize || selectedVariant?.size || product.size,
      floweringStems: selectedStems ?? selectedVariant?.floweringStems ?? product.floweringStems,
      stock: activeStock,
    });
    setMessage('Producto agregado al carrito.');
  };

  const decreaseQuantity = () => setQuantity((current) => Math.max(1, current - 1));
  const increaseQuantity = () => setQuantity((current) => Math.min(activeStock, current + 1));

  return (
    <main className="overflow-x-hidden bg-[#FFF8EF]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0f8f61] hover:text-[#0c7a52]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </button>

        <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] xl:gap-8">
          <section className="min-w-0 self-start overflow-hidden rounded-2xl border border-[#EADBC8]/70 bg-white shadow-sm">
            <div className="flex min-h-[260px] items-center justify-center bg-[#f7f1e8] p-3 sm:min-h-[320px] lg:min-h-[380px]">
              <img
                src={activeImage}
                alt={product.name}
                className="block h-auto max-h-[58vh] w-auto max-w-full object-contain sm:max-h-[66vh] lg:max-h-[70vh]"
              />
            </div>
            {imageOptions.length > 1 && (
              <div className="flex gap-3 overflow-x-auto border-t border-[#EADBC8]/70 p-4">
                {imageOptions.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white ${
                      activeImage === image ? 'border-[#0f8f61]' : 'border-[#EADBC8]'
                    }`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="min-w-0 self-start rounded-2xl border border-[#EADBC8]/70 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#e8f7ef] px-3 py-1 text-xs font-semibold text-[#0f8f61]">
                {product.category}
              </span>
              <button
                type="button"
                onClick={() => onToggleFavorite(product)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  isFavorite
                    ? 'border-[#D96C9F] bg-[#F8DDEB] text-[#B9487E]'
                    : 'border-[#EADBC8] text-[#6B756F] hover:border-[#D96C9F]'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'En favoritos' : 'Guardar'}
              </button>
            </div>

            <h1 className="break-words text-3xl font-bold leading-tight text-[#2F3A35] sm:text-4xl">{product.name}</h1>
            <p className="mt-4 text-base leading-7 text-[#6B756F]">
              {product.description || 'Producto seleccionado de nuestro catálogo.'}
            </p>

            <div className="mt-6 rounded-2xl border border-[#EADBC8]/70 bg-[#fff8ef] p-4">
              <p className="text-sm text-[#6B756F]">Precio</p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
                <p className="break-words text-3xl font-bold text-[#2F3A35] sm:text-4xl">{formatMoney(activePrice)}</p>
                <p className={`font-semibold ${isOutOfStock ? 'text-red-600' : 'text-[#0f8f61]'}`}>
                  {isOutOfStock ? 'Agotado' : `Stock: ${activeStock} unidades`}
                </p>
              </div>
            </div>

            {colors.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-[#2F3A35]">Color</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    (() => {
                      const isAvailable = isVariantOptionAvailable('color', color);

                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => selectVariantOption({ color })}
                          disabled={!isAvailable}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            selectedColor === color
                              ? 'border-[#0f8f61] bg-[#0f8f61] text-white'
                              : 'border-[#EADBC8] bg-white text-[#2F3A35] hover:border-[#0f8f61]'
                          }`}
                        >
                          {color}
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-[#2F3A35]">Tamaño</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sizes.map((size) => (
                    (() => {
                      const isAvailable = isVariantOptionAvailable('size', size);

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => selectVariantOption({ size })}
                          disabled={!isAvailable}
                          className={`rounded-lg border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            selectedSize === size
                              ? 'border-[#0f8f61] bg-[#e8f7ef] text-[#0f8f61]'
                              : 'border-[#EADBC8] bg-white text-[#2F3A35] hover:border-[#0f8f61]'
                          }`}
                        >
                          <span className="block font-semibold">{size}</span>
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>
            )}

            {stemOptions.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-[#2F3A35]">Cantidad de varas</p>
                <div className="flex flex-wrap gap-2">
                  {stemOptions.map((stems) => (
                    (() => {
                      const isAvailable = isVariantOptionAvailable('floweringStems', stems);

                      return (
                        <button
                          key={stems}
                          type="button"
                          onClick={() => selectVariantOption({ floweringStems: stems })}
                          disabled={!isAvailable}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            selectedStems === stems
                              ? 'border-[#0f8f61] bg-[#0f8f61] text-white'
                              : 'border-[#EADBC8] bg-white text-[#2F3A35] hover:border-[#0f8f61]'
                          }`}
                        >
                          {stems} {stems === 1 ? 'vara' : 'varas'}
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-[#2F3A35]">Cantidad</p>
              <div className="inline-flex items-center rounded-lg border border-[#EADBC8] bg-white">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="p-3 text-[#6B756F] hover:text-[#2F3A35] disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[3rem] text-center font-semibold text-[#2F3A35]">{quantity}</span>
                <button
                  type="button"
                  onClick={increaseQuantity}
                  disabled={isOutOfStock || quantity >= activeStock}
                  className="p-3 text-[#6B756F] hover:text-[#2F3A35] disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {message && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#EADBC8] bg-[#fff8ef] px-3 py-2 text-sm text-[#2F3A35]">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0f8f61]" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f8f61] px-6 py-4 font-semibold text-white transition-colors hover:bg-[#0c7a52] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              <ShoppingCart className="h-5 w-5" />
              {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
            </button>

            <div className="mt-6 grid gap-3 text-sm text-[#6B756F] sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-lg bg-[#e8f7ef] px-3 py-3">
                <Truck className="h-4 w-4 text-[#0f8f61]" />
                Envíos a coordinar
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[#e8f7ef] px-3 py-3">
                <CreditCard className="h-4 w-4 text-[#0f8f61]" />
                Medios de pago
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[#e8f7ef] px-3 py-3">
                <ShieldCheck className="h-4 w-4 text-[#0f8f61]" />
                Compra segura
              </div>
            </div>
          </section>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-bold text-[#2F3A35]">Productos relacionados</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((relatedProduct) => (
                <button
                  key={relatedProduct.sourceId || relatedProduct.id}
                  type="button"
                  onClick={() => onOpenRelatedProduct?.(relatedProduct)}
                  className="overflow-hidden rounded-xl border border-[#EADBC8]/70 bg-white text-left shadow-sm transition-transform hover:-translate-y-1"
                >
                  <img src={relatedProduct.image} alt={relatedProduct.name} className="h-44 w-full object-cover" />
                  <div className="p-4">
                    <p className="line-clamp-2 font-semibold text-[#2F3A35]">{relatedProduct.name}</p>
                    <p className="mt-2 font-bold text-[#0f8f61]">{formatMoney(relatedProduct.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default ProductPage;
