import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Heart,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from '../lib/icons';
import type { CartItemInput } from '../types/cart';
import type { Product, ProductVariant } from '../types/product';
import { getCategoryDisplayLabel } from '../utils/displayLabels';
import LinkifiedText from '../components/LinkifiedText';
import ProductImage from '../components/ProductImage';

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
const WHATSAPP_NUMBER = '5491122906442';

const getBaseProductVariant = (product: Product): ProductVariant => ({
  size: product.size,
  color: product.color,
  floweringStems: product.floweringStems,
  price: product.price,
  priceMode: product.priceMode || 'fixed',
  stock: Number(product.stock ?? (product.inStock ? 1 : 0)),
  stockMode: product.stockMode || 'quantity',
  image: product.image,
});

const getActiveProductVariants = (product: Product): ProductVariant[] =>
  (product.variants ?? [])
    .filter((variant) => Boolean(variant.id) && variant.isActive !== false)
    .slice()
    .sort((first, second) => Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0));

const getPreferredVariant = (variants: ProductVariant[]) =>
  variants.find((variant) => variant.priceMode !== 'quote' && variant.stockMode !== 'consult' && Number(variant.stock) > 0) ||
  variants.find((variant) => variant.priceMode === 'quote') ||
  variants.find((variant) => variant.stockMode === 'consult') ||
  variants[0] ||
  null;

const getVariantDetails = (variant: ProductVariant) =>
  [
    variant.color,
    variant.size,
    variant.floweringStems ? `${variant.floweringStems} ${variant.floweringStems === 1 ? 'vara' : 'varas'}` : '',
  ].filter(Boolean);

const getVariantLabel = (variant: ProductVariant) => getVariantDetails(variant).join(' / ');

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
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  const activeVariants = useMemo(() => (product ? getActiveProductVariants(product) : []), [product]);
  const hasRealVariants = activeVariants.length > 0;
  const fallbackVariant = useMemo(() => (product ? getBaseProductVariant(product) : null), [product]);
  const selectedVariant = useMemo(() => {
    if (!product) return null;

    if (!hasRealVariants) {
      return fallbackVariant;
    }

    return (
      activeVariants.find((variant) => variant.id === selectedVariantId) ||
      getPreferredVariant(activeVariants)
    );
  }, [activeVariants, fallbackVariant, hasRealVariants, product, selectedVariantId]);

  const activeImage = selectedVariant?.image || product?.image || '';
  const activePrice = selectedVariant?.price ?? product?.price ?? 0;
  const activePriceMode = selectedVariant?.priceMode || product?.priceMode || 'fixed';
  const requiresPriceQuote = activePriceMode === 'quote';
  const activeStockMode = selectedVariant?.stockMode || product?.stockMode || 'quantity';
  const requiresAvailabilityConsult = activeStockMode === 'consult';
  const requiresManualConsult = requiresPriceQuote || requiresAvailabilityConsult;
  const activeStock = Math.max(0, Number(selectedVariant?.stock ?? product?.stock ?? 0));
  const isOutOfStock = !requiresManualConsult && activeStock <= 0;
  const activeDetails = selectedVariant ? getVariantDetails(selectedVariant) : [];
  const categoryLabel = product ? getCategoryDisplayLabel(product.category) : '';

  useEffect(() => {
    if (!product) return;

    const variants = getActiveProductVariants(product);
    const preferredVariant = getPreferredVariant(variants);

    setSelectedVariantId(preferredVariant?.id || '');
    setQuantity(1);
    setMessage('');
  }, [product]);

  useEffect(() => {
    if (requiresManualConsult) {
      setQuantity(1);
      return;
    }

    setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, activeStock)));
  }, [activeStock, requiresManualConsult]);

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
          <div className="rounded-2xl border border-[#F1E3D4] bg-white p-10 text-center shadow-sm">
            <PackageCheck className="mx-auto mb-4 h-12 w-12 text-[#CFE3D4]" />
            <h1 className="text-2xl font-bold text-[#16352B]">Producto no encontrado</h1>
            <p className="mt-2 text-[#6B7280]">El producto que buscás no está disponible o cambió de dirección.</p>
          </div>
        </div>
      </main>
    );
  }

  const handleSelectVariant = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id || '');
    setQuantity(1);
    setMessage('');
  };

  const handleAddToCart = () => {
    if (!selectedVariant) {
      setMessage('Seleccioná una opción antes de agregar el producto.');
      return;
    }

    if (hasRealVariants && !selectedVariant.id) {
      setMessage('Seleccioná una variante válida antes de agregar el producto.');
      return;
    }

    if (isOutOfStock) {
      setMessage('Este producto está agotado.');
      return;
    }

    if (requiresManualConsult) {
      setMessage(requiresPriceQuote ? 'Este producto se cotiza por WhatsApp.' : 'Este producto requiere consulta de disponibilidad.');
      return;
    }

    onAddToCart({
      id: product.id,
      sourceId: product.sourceId,
      variantId: hasRealVariants ? selectedVariant.id : undefined,
      name: product.name,
      price: activePrice,
      priceMode: activePriceMode,
      image: activeImage,
      quantity,
      color: selectedVariant.color || product.color,
      size: selectedVariant.size || product.size,
      floweringStems: selectedVariant.floweringStems ?? product.floweringStems,
      stock: activeStock,
      stockMode: activeStockMode,
    });
    setMessage('Producto agregado al carrito.');
  };

  const decreaseQuantity = () => setQuantity((current) => Math.max(1, current - 1));
  const increaseQuantity = () => setQuantity((current) => Math.min(activeStock, current + 1));
  const openAvailabilityWhatsApp = () => {
    const variantLabel = selectedVariant && hasRealVariants ? getVariantLabel(selectedVariant) : '';
    const variantLine = variantLabel ? `\nVariante: ${variantLabel}` : '';
    const text = `Hola, quiero consultar ${requiresPriceQuote ? 'cotización' : 'disponibilidad'} de: ${product.name}${variantLine}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

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
          <section className="min-w-0 self-start overflow-hidden rounded-2xl border border-[#F1E3D4] bg-white shadow-sm">
            <div className="flex min-h-[260px] items-center justify-center bg-[#f7f1e8] p-3 sm:min-h-[320px] lg:min-h-[380px]">
              <ProductImage
                src={activeImage}
                alt={product.name}
                loading="eager"
                decoding="async"
                className="block h-auto max-h-[58vh] w-auto max-w-full object-contain sm:max-h-[66vh] lg:max-h-[70vh]"
                fallbackClassName="min-h-[260px] sm:min-h-[320px] lg:min-h-[380px]"
              />
            </div>
          </section>

          <section className="min-w-0 self-start rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm sm:p-7 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#e8f7ef] px-3 py-1 text-xs font-semibold text-[#0f8f61]">
                {categoryLabel}
              </span>
              <button
                type="button"
                onClick={() => onToggleFavorite(product)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  isFavorite
                    ? 'border-[#0F8F61] bg-[#E8F7EF] text-[#0F8F61]'
                    : 'border-[#F1E3D4] text-[#6B7280] hover:border-[#0F8F61]'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'En favoritos' : 'Guardar'}
              </button>
            </div>

            <h1 className="break-words text-3xl font-bold leading-tight text-[#16352B] sm:text-4xl">{product.name}</h1>

            {hasRealVariants && (
              <div className="mt-4 rounded-lg border border-[#CFE3D4] bg-[#E8F7EF] px-3 py-2 text-xs leading-5 text-[#16352B] sm:text-sm">
                Elegí una opción disponible. El precio, stock e imagen corresponden a la variante seleccionada.
              </div>
            )}

            <div className="mt-4 rounded-xl border border-[#F1E3D4] bg-[#FFF8EF] px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#6B7280] sm:text-sm">Precio</p>
                  <p className="mt-0.5 break-words text-2xl font-bold leading-none text-[#16352B] sm:text-3xl">
                    {requiresPriceQuote ? 'A cotizar' : formatMoney(activePrice)}
                  </p>
                </div>
                <p className={`mt-5 flex-shrink-0 text-right text-sm font-semibold leading-tight sm:mt-6 ${isOutOfStock ? 'text-red-600' : 'text-[#0f8f61]'}`}>
                  {requiresPriceQuote
                    ? 'Cotización personalizada'
                    : requiresAvailabilityConsult
                      ? 'Consultar disponibilidad'
                      : isOutOfStock
                        ? 'Agotado'
                        : `Stock: ${activeStock} unidades`}
                </p>
              </div>
              {activeDetails.length > 0 && (
                <p className="mt-2 truncate text-xs leading-5 text-[#6B7280] sm:text-sm">{activeDetails.join(' · ')}</p>
              )}
              {requiresPriceQuote && (
                <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                  Este producto se cotiza según disponibilidad, color, tamaño y preparación.
                </p>
              )}
            </div>

            {hasRealVariants ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-[#16352B]">Opciones disponibles</p>
                <div className="max-h-[190px] space-y-1 overflow-y-auto pr-1 sm:max-h-none sm:space-y-1.5 sm:overflow-visible sm:pr-0">
                  {activeVariants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const variantStock = Math.max(0, Number(variant.stock ?? 0));
                    const variantRequiresQuote = variant.priceMode === 'quote';
                    const variantRequiresConsult = variant.stockMode === 'consult';
                    const variantDetails = getVariantDetails(variant).join(' · ') || 'Variante';

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleSelectVariant(variant)}
                        disabled={!variantRequiresQuote && !variantRequiresConsult && variantStock <= 0}
                        className={`w-full rounded-lg border px-3 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 sm:px-3.5 sm:py-2 ${
                          isSelected
                            ? 'border-[#0f8f61] bg-[#e8f7ef] text-[#0f8f61] shadow-[0_0_0_1px_rgba(15,143,97,0.18)]'
                            : 'border-[#F1E3D4] bg-white text-[#16352B] hover:border-[#0f8f61]'
                        }`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0 text-sm font-semibold leading-tight">
                            {variantDetails}
                          </span>
                          <span className="flex-shrink-0 text-sm font-bold">
                            {variantRequiresQuote ? 'A cotizar' : formatMoney(Number(variant.price ?? 0))}
                          </span>
                        </span>
                        <span className={`mt-0.5 block text-[11px] leading-3 sm:leading-4 ${variantRequiresConsult || variantStock > 0 ? 'text-[#6B7280]' : 'text-red-600'}`}>
                          {variantRequiresQuote
                            ? 'Cotización por WhatsApp'
                            : variantRequiresConsult
                              ? 'Consultar disponibilidad'
                              : variantStock > 0
                                ? `Stock: ${variantStock}`
                                : 'Sin stock'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              activeDetails.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-[#16352B]">Características</p>
                  <div className="flex flex-wrap gap-2">
                    {activeDetails.map((detail) => (
                      <span
                        key={detail}
                        className="rounded-full border border-[#0f8f61] bg-[#e8f7ef] px-4 py-2 text-sm font-semibold text-[#0f8f61]"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              )
            )}

            {!requiresManualConsult && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-[#16352B]">Cantidad</p>
                <div className="inline-flex items-center rounded-lg border border-[#F1E3D4] bg-white">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="p-3 text-[#6B7280] hover:text-[#16352B] disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[3rem] text-center font-semibold text-[#16352B]">{quantity}</span>
                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={isOutOfStock || quantity >= activeStock}
                    className="p-3 text-[#6B7280] hover:text-[#16352B] disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#F1E3D4] bg-[#FFF8EF] px-3 py-2 text-sm text-[#16352B]">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0f8f61]" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={requiresManualConsult ? openAvailabilityWhatsApp : handleAddToCart}
              disabled={isOutOfStock}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f8f61] px-6 py-4 font-semibold text-white transition-colors hover:bg-[#0c7a52] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {requiresManualConsult ? <MessageCircle className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
              {requiresManualConsult ? 'Consultar por WhatsApp' : isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
            </button>
          </section>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <article className="min-w-0 rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm sm:p-7 lg:p-8">
            <h2 className="text-2xl font-bold text-[#16352B]">Descripción</h2>
            <LinkifiedText
              as="p"
              text={product.description || 'Producto seleccionado de nuestro catálogo.'}
              className="mt-4 text-base leading-8 text-[#1F2933]"
            />
          </article>

          <aside className="min-w-0 rounded-2xl border border-[#F1E3D4] bg-white p-5 shadow-sm sm:p-7 lg:p-8">
            <h2 className="text-2xl font-bold text-[#16352B]">Detalles del producto</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-[#F1E3D4] pb-3">
                <dt className="font-semibold text-[#6B7280]">Categoría</dt>
                <dd className="text-right font-semibold text-[#16352B]">{categoryLabel}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-[#F1E3D4] pb-3">
                <dt className="font-semibold text-[#6B7280]">Disponibilidad</dt>
                <dd className={`text-right font-semibold ${isOutOfStock ? 'text-red-600' : 'text-[#0f8f61]'}`}>
                  {requiresPriceQuote
                    ? 'A cotizar'
                    : requiresAvailabilityConsult
                      ? 'Consultar disponibilidad'
                      : isOutOfStock
                        ? 'Agotado'
                        : `${activeStock} unidades`}
                </dd>
              </div>
              {activeDetails.length > 0 && (
                <div className="flex flex-col gap-2 border-b border-[#F1E3D4] pb-3">
                  <dt className="font-semibold text-[#6B7280]">Opción seleccionada</dt>
                  <dd className="flex flex-wrap gap-2">
                    {activeDetails.map((detail) => (
                      <span
                        key={detail}
                        className="rounded-full bg-[#e8f7ef] px-3 py-1 text-xs font-semibold text-[#0f8f61]"
                      >
                        {detail}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-6 grid gap-3 text-sm text-[#6B7280]">
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
          </aside>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-bold text-[#16352B]">Productos relacionados</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((relatedProduct) => (
                <button
                  key={relatedProduct.sourceId || relatedProduct.id}
                  type="button"
                  onClick={() => onOpenRelatedProduct?.(relatedProduct)}
                  className="overflow-hidden rounded-xl border border-[#F1E3D4] bg-white text-left shadow-sm transition-transform hover:-translate-y-1"
                >
                  <ProductImage
                    src={relatedProduct.image}
                    alt={relatedProduct.name}
                    loading="lazy"
                    decoding="async"
                    className="h-44 w-full object-cover"
                    fallbackClassName="h-44"
                  />
                  <div className="p-4">
                    <p className="line-clamp-2 font-semibold text-[#16352B]">{relatedProduct.name}</p>
                    <p className="mt-2 font-bold text-[#0f8f61]">
                      {relatedProduct.priceMode === 'quote' ? 'A cotizar' : formatMoney(relatedProduct.price)}
                    </p>
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
