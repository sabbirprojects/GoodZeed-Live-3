import React, { useState } from 'react';
import { Product, ProductVariant } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../utils/formatters';
import { getProductThumbnail } from '../../utils/mediaUtils';
import { ShoppingBag, Zap, Star, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onOpenDetail?: (product: Product) => void;
}

/**
 * Returns the badge label and a stable colour-set name based on the badge text.
 * Colours are applied via className strings to keep all styling in Tailwind.
 */
function getBadgeStyle(label: string): { bg: string; text: string } {
  const upper = label.toUpperCase();
  if (upper.includes('BEST') || upper.includes('SELLER'))
    return { bg: 'bg-[#D9A441]', text: 'text-[#2A2A28]' };
  if (upper.includes('NEW') || upper.includes('HARVEST'))
    return { bg: 'bg-[#2F5233]', text: 'text-white' };
  if (upper.includes('ORGANIC') || upper.includes('PURE') || upper.includes('NATURAL'))
    return { bg: 'bg-emerald-600', text: 'text-white' };
  if (upper.includes('SALE') || upper.includes('OFF'))
    return { bg: 'bg-rose-600', text: 'text-white' };
  if (upper.includes('LIMITED') || upper.includes('RARE') || upper.includes('EXCLUSIVE'))
    return { bg: 'bg-violet-700', text: 'text-white' };
  if (upper.includes('FEATURED'))
    return { bg: 'bg-neutral-700', text: 'text-white' };
  // Generic fallback — use brand amber
  return { bg: 'bg-[#D9A441]', text: 'text-[#2A2A28]' };
}

/** Max visible variant pills before a "More" expander appears. */
const MAX_VISIBLE_VARIANTS = 3;

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetail }) => {
  const { addToCart, setBuyNowItem, setCurrentView } = useStore();

  const enabledVariants = product.variants.filter(v => v.isEnabled);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    enabledVariants[0]?.id || ''
  );
  const [showAllVariants, setShowAllVariants] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const selectedVariant: ProductVariant | undefined =
    enabledVariants.find(v => v.id === selectedVariantId) || enabledVariants[0];

  const hasSale =
    selectedVariant?.salePrice != null &&
    selectedVariant.salePrice > 0 &&
    selectedVariant.salePrice < selectedVariant.price;

  const currentPrice = hasSale ? selectedVariant!.salePrice! : selectedVariant?.price || 0;
  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;
  const isLowStock =
    !isOutOfStock &&
    selectedVariant != null &&
    selectedVariant.stock <= selectedVariant.lowStockThreshold;

  // Discount percentage — calculated from real variant prices, never hardcoded
  const discountPct =
    hasSale && selectedVariant
      ? Math.round((1 - selectedVariant.salePrice! / selectedVariant.price) * 100)
      : 0;

  // Badge priority: customBadge (admin override) → isBestSeller → isNew → isFeatured → null
  const badgeLabel: string | null = product.customBadge?.trim()
    ? product.customBadge.trim().toUpperCase()
    : product.isBestSeller
    ? 'BEST SELLER'
    : product.isNew
    ? 'NEW HARVEST'
    : product.isFeatured
    ? 'FEATURED'
    : null;

  const badgeStyle = badgeLabel ? getBadgeStyle(badgeLabel) : null;

  // Variant overflow logic
  const hasOverflow = enabledVariants.length > MAX_VISIBLE_VARIANTS;
  const visibleVariants = showAllVariants
    ? enabledVariants
    : enabledVariants.slice(0, hasOverflow ? MAX_VISIBLE_VARIANTS - 1 : MAX_VISIBLE_VARIANTS);
  const hiddenCount = enabledVariants.length - (MAX_VISIBLE_VARIANTS - 1);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedVariant) {
      addToCart(product, selectedVariant.id, 1);
      // Brief visual feedback
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 1200);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedVariant && !isOutOfStock) {
      setBuyNowItem({
        productId: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        variantLabel: selectedVariant.label,
        unitPrice: currentPrice,
        quantity: 1,
        image: getProductThumbnail(product),
        stock: selectedVariant.stock
      });
      setCurrentView('checkout');
    }
  };

  return (
    <div
      id={`product-card-${product.slug}`}
      onClick={() => onOpenDetail && onOpenDetail(product)}
      className="
        group
        bg-white rounded-2xl overflow-hidden
        border border-[#2F5233]/15
        shadow-sm
        hover:shadow-xl hover:-translate-y-1
        transition-all duration-300 ease-out
        motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm
        flex flex-col cursor-pointer relative h-full w-full
      "
    >
      {/* ── Badge ─────────────────────────────────────────────── */}
      {badgeLabel && badgeStyle && (
        <div className="absolute top-3 left-3 z-10">
          <span
            className={`
              inline-flex items-center gap-1
              ${badgeStyle.bg} ${badgeStyle.text}
              text-[10px] font-extrabold
              px-2.5 py-1 rounded-full uppercase tracking-widest
              shadow-sm
              transition-opacity duration-300
            `}
          >
            {badgeLabel}
          </span>
        </div>
      )}

      {/* ── Discount pill (top-right) ──────────────────────────── */}
      {hasSale && discountPct > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide shadow-sm">
            {discountPct}% OFF
          </span>
        </div>
      )}

      {/* ── Product Image ──────────────────────────────────────── */}
      <div className="relative aspect-square overflow-hidden bg-neutral-100 shrink-0">
        <img
          src={getProductThumbnail(product)}
          alt={product.name}
          className="
            w-full h-full object-cover
            group-hover:scale-105
            transition-transform duration-500 ease-out
            motion-reduce:transition-none motion-reduce:group-hover:scale-100
          "
          loading="lazy"
        />

        {/* Rating overlay */}
        {product.rating && (
          <div className="absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold text-[#2A2A28] shadow-sm">
            <Star className="w-3 h-3 text-[#D9A441] fill-[#D9A441]" />
            <span>{product.rating}</span>
            {product.reviewCount && (
              <span className="text-neutral-500 font-normal">({product.reviewCount})</span>
            )}
          </div>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="flex-1">

          {/* Trust / Verification Label — only shown when product.trustLabel is set */}
          {product.trustLabel && (
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[#2F5233] font-semibold mb-1 h-4">
              <ShieldCheck className="w-3 h-3 text-[#2F5233] shrink-0" />
              <span className="truncate">{product.trustLabel}</span>
            </div>
          )}
          {/* Reserve same height when no trustLabel so grids stay aligned */}
          {!product.trustLabel && <div className="h-4 mb-1" aria-hidden="true" />}

          {/* Product Title */}
          <h3 className="font-serif-brand font-bold text-xs sm:text-base text-[#2A2A28] leading-snug line-clamp-2 min-h-[2.1rem] sm:min-h-[3rem]">
            {product.name}
          </h3>

          {/* Short Description */}
          <p className="text-[11px] sm:text-xs text-[#2A2A28]/70 mt-1 line-clamp-2 min-h-[1.9rem] sm:min-h-[2.1rem] leading-snug">
            {product.shortDescription || '\u00A0'}
          </p>
        </div>

        <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-neutral-100">

          {/* ── Variant Selector Pills ─────────────────────────── */}
          <div
            className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3 min-h-[24px] sm:min-h-[28px] items-center"
            onClick={e => e.stopPropagation()}
          >
            {enabledVariants.length > 1 ? (
              <>
                {visibleVariants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    aria-pressed={selectedVariantId === v.id}
                    className={`
                      px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md
                      text-[10px] sm:text-[11px] font-bold
                      transition-colors duration-150
                      active:scale-95 motion-reduce:active:scale-100
                      ${
                        selectedVariantId === v.id
                          ? 'bg-[#2F5233] text-white shadow-sm'
                          : 'bg-[#FAF7F2] text-neutral-700 hover:bg-neutral-200'
                      }
                    `}
                  >
                    {v.label}
                  </button>
                ))}

                {/* Overflow expand / collapse */}
                {hasOverflow && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowAllVariants(prev => !prev);
                    }}
                    aria-expanded={showAllVariants}
                    aria-label={showAllVariants ? 'Show fewer sizes' : `Show ${hiddenCount} more sizes`}
                    className="
                      inline-flex items-center gap-0.5
                      px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md
                      text-[10px] sm:text-[11px] font-bold
                      bg-[#FAF7F2] text-[#2F5233] border border-[#2F5233]/25
                      hover:bg-[#2F5233]/10
                      transition-colors duration-150
                    "
                  >
                    {showAllVariants ? (
                      <>Less <ChevronUp className="w-2.5 h-2.5" /></>
                    ) : (
                      <>+{hiddenCount} <ChevronDown className="w-2.5 h-2.5" /></>
                    )}
                  </button>
                )}
              </>
            ) : (
              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold bg-[#FAF7F2] text-neutral-700 truncate max-w-full">
                {enabledVariants[0]?.label || '\u00A0'}
              </span>
            )}
          </div>

          {/* ── Price + Stock Row ──────────────────────────────── */}
          <div className="flex items-center justify-between gap-1 sm:gap-2 mb-2 sm:mb-3 min-h-[1.75rem] sm:min-h-[2rem]">
            <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap min-w-0">
              {/* Current / sale price */}
              <span className="font-serif-brand font-extrabold text-sm sm:text-lg lg:text-xl text-[#2F5233] whitespace-nowrap">
                {formatCurrency(currentPrice)}
              </span>

              {hasSale ? (
                /* Original price struck through */
                <span className="text-[10px] sm:text-xs text-neutral-400 line-through whitespace-nowrap">
                  {formatCurrency(selectedVariant!.price)}
                </span>
              ) : (
                /* Invisible placeholder to keep height consistent */
                <span className="text-[10px] sm:text-xs text-transparent select-none whitespace-nowrap" aria-hidden="true">
                  •
                </span>
              )}
            </div>

            {/* Stock status */}
            {selectedVariant && (
              <span
                className={`
                  text-[10px] sm:text-[11px] font-bold shrink-0 whitespace-nowrap
                  ${
                    isOutOfStock
                      ? 'text-red-600'
                      : isLowStock
                      ? 'text-amber-700'
                      : 'text-[#2F5233]'
                  }
                `}
              >
                {isOutOfStock
                  ? 'Out of Stock'
                  : isLowStock
                  ? `Only ${selectedVariant.stock} left`
                  : 'In Stock'}
              </span>
            )}
          </div>

          {/* ── Action CTAs ────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {/* Add to Cart — secondary / ghost */}
            <button
              id={`add-to-cart-${product.slug}`}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              aria-label={`Add ${product.name} to cart`}
              className={`
                py-2 sm:py-2.5 px-1.5 sm:px-2
                rounded-lg sm:rounded-xl
                border font-bold text-[11px] sm:text-xs
                flex items-center justify-center gap-1
                transition-all duration-150
                active:scale-[0.97] motion-reduce:active:scale-100
                disabled:opacity-50 disabled:pointer-events-none
                ${
                  addedFeedback
                    ? 'bg-[#2F5233]/10 border-[#2F5233] text-[#2F5233] scale-[0.97]'
                    : 'bg-[#FAF7F2] hover:bg-[#EAE4DC] text-[#2F5233] border-[#2F5233]/20'
                }
              `}
            >
              <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>{addedFeedback ? 'Added!' : 'Cart'}</span>
            </button>

            {/* Buy Now — primary / solid */}
            <button
              id={`buy-now-${product.slug}`}
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              aria-label={`Buy ${product.name} now`}
              className="
                py-2 sm:py-2.5 px-1.5 sm:px-2
                rounded-lg sm:rounded-xl
                bg-[#2F5233] hover:bg-[#3D6B45]
                text-white font-bold text-[11px] sm:text-xs
                flex items-center justify-center gap-1
                shadow-sm hover:shadow-md
                transition-all duration-150
                active:scale-[0.97] motion-reduce:active:scale-100
                disabled:opacity-50 disabled:pointer-events-none
              "
            >
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D9A441] shrink-0" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};