import type { CollectionRelatedProduct } from '../types/collection';
import LinkifiedText from './LinkifiedText';
import ProductImage from './ProductImage';

const formatPrice = (value: number) => `$${value.toLocaleString('es-AR')}`;

const getProductPrice = (product: CollectionRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);
  const prices = activeVariants
    .filter((variant) => variant.price_mode !== 'quote')
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price));

  return prices.length > 0 ? Math.min(...prices) : Number(product.price || 0);
};

const getPriceLabel = (product: CollectionRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);
  const requiresQuote =
    activeVariants.length > 0
      ? activeVariants.every((variant) => variant.price_mode === 'quote')
      : product.price_mode === 'quote';

  return requiresQuote ? 'A cotizar' : formatPrice(getProductPrice(product));
};

const getImage = (product: CollectionRelatedProduct) =>
  product.image_url || (product.variants ?? []).find((variant) => variant.image_url)?.image_url || '';

const getAvailabilityLabel = (product: CollectionRelatedProduct) => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false);

  if (activeVariants.length > 0) {
    if (activeVariants.every((variant) => variant.price_mode === 'quote')) return 'Cotización personalizada';
    if (activeVariants.every((variant) => variant.stock_mode === 'consult')) return 'Consultar disponibilidad';
    return activeVariants.some((variant) => variant.stock_mode !== 'consult' && Number(variant.stock) > 0)
      ? 'Disponible'
      : 'Sin stock';
  }

  if (product.price_mode === 'quote') return 'Cotización personalizada';
  if (product.stock_mode === 'consult') return 'Consultar disponibilidad';
  return Number(product.stock) > 0 ? 'Disponible' : 'Sin stock';
};

const CollectionProductCard = ({
  product,
  onOpen,
}: {
  product: CollectionRelatedProduct;
  onOpen: (product: CollectionRelatedProduct) => void;
}) => (
  <article className="group flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-[#F1E3D4] bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#16352B]/10">
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="block text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0F8F61]"
      aria-label={`Ver producto ${product.name}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F8EFE3]">
        <ProductImage
          src={getImage(product)}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          fallbackClassName="h-full"
          loading="lazy"
          decoding="async"
        />
      </div>
    </button>

    <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
      <div>
        <span className="inline-flex rounded-full bg-[#E8F7EF] px-3 py-1 text-xs font-semibold text-[#0F8F61]">
          {product.orchid_type || 'Producto'}
        </span>
        <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug text-[#16352B] transition-colors group-hover:text-[#0F8F61]">
          {product.name}
        </h3>
      </div>

      {product.description && (
        <LinkifiedText
          as="p"
          text={product.description}
          className="line-clamp-3 text-sm leading-6 text-[#6B756F]"
        />
      )}

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#F1E3D4] pt-3">
        <div>
          <span className="block text-xs font-medium text-[#6B756F]">Precio</span>
          <span className="text-xl font-bold text-[#16352B]">{getPriceLabel(product)}</span>
        </div>
        <span className="rounded-full bg-[#FFF8EF] px-3 py-1 text-xs font-semibold text-[#6B756F]">
          {getAvailabilityLabel(product)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpen(product)}
        className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-[#0F8F61] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0C7A52]"
      >
        Ver producto
      </button>
    </div>
  </article>
);

export default CollectionProductCard;
