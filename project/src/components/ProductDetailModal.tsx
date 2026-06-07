import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { AlertCircle, MessageCircle, Minus, Plus, ShoppingCart, X } from '../lib/icons';
import type { CartItemInput } from '../types/cart';
import type { Product, ProductVariant } from '../types/product';
import { getCategoryDisplayLabel } from '../utils/displayLabels';
import ProductImage from './ProductImage';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItemInput) => void;
}

const formatMoney = (value: number) => `$${value.toLocaleString('es-AR')}`;
const WHATSAPP_NUMBER = '5491122906442';

const uniqueValues = (values: Array<string | undefined>) =>
  Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));

const getProductVariants = (product: Product): ProductVariant[] =>
  product.variants && product.variants.length > 0
    ? product.variants
    : [
        {
          size: product.size,
          color: product.color,
          price: product.price,
          priceMode: product.priceMode || 'fixed',
          stock: Number(product.stock ?? (product.inStock ? 1 : 0)),
          stockMode: product.stockMode || 'quantity',
          image: product.image,
        },
      ];

const ProductDetailModal = ({ product, isOpen, onClose, onAddToCart }: ProductDetailModalProps) => {
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  const variants = useMemo(() => (product ? getProductVariants(product) : []), [product]);
  const colors = useMemo(
    () => (product ? uniqueValues([...(product.colors ?? []), product.color, ...variants.map((variant) => variant.color)]) : []),
    [product, variants]
  );
  const sizes = useMemo(
    () => (product ? uniqueValues([product.size, ...variants.map((variant) => variant.size)]) : []),
    [product, variants]
  );

  const selectedVariant = useMemo(() => {
    if (!product) return null;

    return (
      variants.find(
        (variant) =>
          (!selectedSize || variant.size === selectedSize) &&
          (!selectedColor || !variant.color || variant.color === selectedColor)
      ) ||
      variants.find((variant) => !selectedSize || variant.size === selectedSize) ||
      variants[0] ||
      null
    );
  }, [product, selectedColor, selectedSize, variants]);

  const imageOptions = useMemo(() => {
    if (!product) return [];
    return uniqueValues([
      product.image,
      ...(product.images ?? []),
      ...variants.map((variant) => variant.image),
    ]);
  }, [product, variants]);

  const activeImage = selectedImage || selectedVariant?.image || product?.image || '';
  const activePrice = selectedVariant?.price ?? product?.price ?? 0;
  const activePriceMode = selectedVariant?.priceMode || product?.priceMode || 'fixed';
  const requiresPriceQuote = activePriceMode === 'quote';
  const activeStockMode = selectedVariant?.stockMode || product?.stockMode || 'quantity';
  const requiresAvailabilityConsult = activeStockMode === 'consult';
  const requiresManualConsult = requiresPriceQuote || requiresAvailabilityConsult;
  const activeStock = Math.max(0, Number(selectedVariant?.stock ?? product?.stock ?? 0));
  const isOutOfStock = !requiresManualConsult && activeStock <= 0;
  const categoryLabel = product ? getCategoryDisplayLabel(product.category) : '';

  useEffect(() => {
    if (!product || !isOpen) return;

    const initialVariants = getProductVariants(product);
    const initialColors = uniqueValues([
      ...(product.colors ?? []),
      product.color,
      ...initialVariants.map((variant) => variant.color),
    ]);
    const initialSizes = uniqueValues([product.size, ...initialVariants.map((variant) => variant.size)]);

    setSelectedImage((product.images && product.images[0]) || product.image);
    setSelectedColor(initialColors.length === 1 ? initialColors[0] : '');
    setSelectedSize(initialSizes.length === 1 ? initialSizes[0] : '');
    setQuantity(1);
    setMessage('');
  }, [isOpen, product]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (requiresManualConsult) {
      setQuantity(1);
      return;
    }

    setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, activeStock)));
  }, [activeStock, requiresManualConsult]);

  if (!isOpen || !product) {
    return null;
  }

  const handleAddToCart = () => {
    if (colors.length > 0 && !selectedColor) {
      setMessage('Selecciona un color antes de agregar el producto.');
      return;
    }

    if (sizes.length > 0 && !selectedSize) {
      setMessage('Selecciona un tamano antes de agregar el producto.');
      return;
    }

    if (isOutOfStock) {
      setMessage('Este producto esta agotado.');
      return;
    }

    if (requiresManualConsult) {
      setMessage(requiresPriceQuote ? 'Este producto se cotiza por WhatsApp.' : 'Este producto requiere consulta de disponibilidad.');
      return;
    }

    onAddToCart({
      id: product.id,
      sourceId: product.sourceId,
      variantId: selectedVariant?.id,
      name: product.name,
      price: activePrice,
      priceMode: activePriceMode,
      image: activeImage,
      quantity,
      color: selectedColor || selectedVariant?.color || product.color,
      size: selectedSize || selectedVariant?.size || product.size,
      stock: activeStock,
      stockMode: activeStockMode,
    });
    onClose();
  };

  const decreaseQuantity = () => setQuantity((current) => Math.max(1, current - 1));
  const increaseQuantity = () => setQuantity((current) => Math.min(activeStock, current + 1));
  const openAvailabilityWhatsApp = () => {
    const details = [selectedVariant?.color || selectedColor, selectedVariant?.size || selectedSize, selectedVariant?.floweringStems ? `${selectedVariant.floweringStems} varas` : '']
      .filter(Boolean)
      .join(' / ');
    const variantLine = details ? `\nVariante: ${details}` : '';
    const text = `Hola, quiero consultar ${requiresPriceQuote ? 'cotización' : 'disponibilidad'} de: ${product.name}${variantLine}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };
  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/60 px-3 py-4 sm:px-6"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-white/90 p-2 text-gray-500 shadow hover:text-gray-800"
          aria-label="Cerrar detalle"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto lg:h-[82vh] lg:max-h-[760px] lg:grid-cols-[1.08fr_0.92fr] lg:overflow-hidden">
          <div className="relative min-h-0 bg-gray-100 lg:h-full">
            <div className="relative h-72 overflow-hidden bg-gray-100 sm:h-[430px] lg:h-full">
              <ProductImage
                src={activeImage}
                alt={product.name}
                decoding="async"
                className="h-full w-full object-cover"
              />

              {imageOptions.length > 1 && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-3 overflow-x-auto rounded-xl bg-black/35 p-2 backdrop-blur-sm">
                  {imageOptions.map((image) => (
                    <button
                      key={image}
                      type="button"
                      onClick={() => setSelectedImage(image)}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white/20 ${
                        activeImage === image ? 'border-white ring-2 ring-emerald-400' : 'border-white/40'
                      }`}
                    >
                      <ProductImage
                        src={image}
                        alt={`${product.name} - vista adicional`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        showFallbackLabel={false}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 p-5 sm:p-7 lg:overflow-y-auto">
              <div className="mb-4">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {categoryLabel}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{product.name}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                {product.description || 'Producto seleccionado de nuestro catálogo.'}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Las imagenes son ilustrativas. La floracion puede variar segun disponibilidad.
              </p>

              {colors.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-gray-800">Color a eleccion</p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          const colorVariant = variants.find(
                            (variant) =>
                              (!selectedSize || variant.size === selectedSize) &&
                              (!variant.color || variant.color === color) &&
                              variant.image
                          );
                          if (colorVariant?.image) {
                            setSelectedImage(colorVariant.image);
                          }
                          setMessage('');
                        }}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          selectedColor === color
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-gray-800">Tamano</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {sizes.map((size) => {
                      const variantForSize = variants.find(
                        (variant) =>
                          variant.size === size && (!selectedColor || !variant.color || variant.color === selectedColor)
                      );
                      const stock = Number(variantForSize?.stock ?? 0);

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setSelectedSize(size);
                            const sizeVariant = variants.find(
                              (variant) =>
                                variant.size === size &&
                                (!selectedColor || !variant.color || variant.color === selectedColor) &&
                                variant.image
                            );
                            if (sizeVariant?.image) {
                              setSelectedImage(sizeVariant.image);
                            }
                            setMessage('');
                          }}
                          className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                            selectedSize === size
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400'
                          }`}
                        >
                          <span className="block font-semibold">{size}</span>
                          {variantForSize && (
                            <span className="mt-1 block text-xs text-gray-500">
                              {variantForSize.priceMode === 'quote' ? 'A cotizar' : formatMoney(variantForSize.price)} ·{' '}
                              {variantForSize.priceMode === 'quote'
                                ? 'Cotización'
                                : variantForSize.stockMode === 'consult'
                                  ? 'Consultar disponibilidad'
                                  : `Stock ${stock}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Precio</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {requiresPriceQuote ? 'A cotizar' : formatMoney(activePrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Stock disponible</p>
                    <p className={`font-semibold ${isOutOfStock ? 'text-red-600' : 'text-emerald-700'}`}>
                      {requiresPriceQuote
                        ? 'Cotización personalizada'
                        : requiresAvailabilityConsult
                          ? 'Consultar disponibilidad'
                          : isOutOfStock
                            ? 'Agotado'
                            : `Stock: ${activeStock} unidades`}
                    </p>
                  </div>
                </div>
              </div>

              {!requiresManualConsult && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-gray-800">Cantidad</p>
                  <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      className="p-3 text-gray-600 hover:text-gray-900 disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3rem] text-center font-semibold text-gray-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={increaseQuantity}
                      disabled={isOutOfStock || quantity >= activeStock}
                      className="p-3 text-gray-600 hover:text-gray-900 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {message && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={requiresManualConsult ? openAvailabilityWhatsApp : handleAddToCart}
                disabled={isOutOfStock}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 font-semibold text-white transition-all hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500"
              >
                {requiresManualConsult ? <MessageCircle className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                {requiresManualConsult ? 'Consultar por WhatsApp' : isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
