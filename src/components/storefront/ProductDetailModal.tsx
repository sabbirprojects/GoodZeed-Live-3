import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Product, ProductVariant } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../utils/formatters';
import {
  X,
  ShoppingBag,
  Zap,
  Star,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Plus,
  Minus,
  Sparkles,
  Award,
  Truck,
  MessageSquarePlus,
  Play
} from 'lucide-react';
import { normalizeProductMedia, parseVideoUrl } from '../../utils/mediaUtils';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const {
    addToCart,
    setBuyNowItem,
    setCurrentView,
    reviews,
    submitReview
  } = useStore();

  const enabledVariants = product.variants.filter(v => v.isEnabled);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    enabledVariants[0]?.id || ''
  );
  const mediaItems = normalizeProductMedia(product);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'nutrition' | 'purity' | 'origin' | 'reviews'>('desc');

  // Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewPhone, setReviewPhone] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const selectedVariant: ProductVariant | undefined =
    enabledVariants.find(v => v.id === selectedVariantId) || enabledVariants[0];

  const hasSale =
    selectedVariant?.salePrice != null &&
    selectedVariant.salePrice > 0 &&
    selectedVariant.salePrice < selectedVariant.price;

  const currentPrice = hasSale ? selectedVariant!.salePrice! : selectedVariant?.price || 0;
  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;

  const productReviews = reviews.filter(
    r => r.productId === product.id && r.moderationStatus === 'APPROVED'
  );

  const handleAddToCart = () => {
    if (selectedVariant) {
      addToCart(product, selectedVariant.id, quantity);
    }
  };

  const handleBuyNow = () => {
    if (selectedVariant && !isOutOfStock) {
      setBuyNowItem({
        productId: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        variantLabel: selectedVariant.label,
        unitPrice: currentPrice,
        quantity,
        image: product.images[0] || '',
        stock: selectedVariant.stock
      });
      onClose();
      setCurrentView('checkout');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewPhone || !reviewText) return;
    submitReview(product.id, reviewName, reviewPhone, reviewRating, reviewText);
    setReviewName('');
    setReviewPhone('');
    setReviewText('');
    setShowReviewForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-6 overscroll-contain"
      onClick={onClose}
    >
      <motion.div
        id="product-detail-modal-container"
        onClick={e => e.stopPropagation()}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative bg-white rounded-3xl max-w-4xl w-full my-auto max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 text-[#2A2A28]"
      >
        {/* Close Button */}
        <button
          id="product-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-[#FAF7F2] hover:bg-neutral-200 text-neutral-600 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 p-4 sm:p-8">
          {/* Left Column: Gallery & Video Player */}
          <div className="md:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 flex items-center justify-center">
              {(() => {
                const current = mediaItems[selectedMediaIndex] || mediaItems[0];
                if (!current) {
                  return (
                    <img
                      src={product.images[0] || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  );
                }

                if (current.type === 'video') {
                  const videoInfo = parseVideoUrl(current.url);
                  if (videoInfo.type === 'direct') {
                    return (
                      <video
                        src={current.url}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    );
                  }
                  return (
                    <iframe
                      src={videoInfo.embedUrl}
                      title={current.title || product.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  );
                }

                return (
                  <img
                    src={current.url}
                    alt={current.altText || product.name}
                    className="w-full h-full object-contain bg-[#FAF7F2]/40"
                  />
                );
              })()}

              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#2F5233] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs pointer-events-none">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>100% Tested Pure</span>
              </div>
            </div>

            {/* Thumbnail Row */}
            {mediaItems.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1.5">
                {mediaItems.map((item, idx) => {
                  const isSelected = selectedMediaIndex === idx;
                  const isVideo = item.type === 'video';
                  const thumb =
                    item.thumbnailUrl ||
                    (isVideo && item.videoSource === 'youtube'
                      ? parseVideoUrl(item.url).thumbnailUrl
                      : item.url);

                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => setSelectedMediaIndex(idx)}
                      className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-neutral-100 ${
                        isSelected
                          ? 'border-[#2F5233] ring-2 ring-[#2F5233]/20 shadow-xs'
                          : 'border-neutral-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt="thumbnail"
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=200&q=60';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {isVideo && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-xs">
                            <Play className="w-2.5 h-2.5 text-neutral-900 ml-0.5" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Guarantees Box */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#2F5233]/15 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#2F5233]">
                <Truck className="w-4 h-4 text-[#D9A441]" />
                <span>Fast Home Delivery Across Bangladesh</span>
              </div>
              <p className="text-neutral-600 leading-relaxed">
                Dhaka: 24-48 Hours (৳70) • Outside Dhaka: 2-4 Days (৳130). Cash on delivery available.
              </p>
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="md:col-span-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441]">
                  Natural Everyday Staple
                </span>
                {product.rating && (
                  <span className="flex items-center gap-1 bg-[#D9A441]/15 text-[#2A2A28] px-2 py-0.5 rounded text-xs font-bold">
                    <Star className="w-3 h-3 text-[#D9A441] fill-[#D9A441]" />
                    {product.rating} ({productReviews.length} reviews)
                  </span>
                )}
              </div>

              <h1 className="font-serif-brand font-extrabold text-2xl sm:text-3xl text-[#2F5233] leading-tight">
                {product.name}
              </h1>

              <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                {product.shortDescription}
              </p>
            </div>

            {/* Price Box */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#2F5233]/15 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-neutral-500 block">Unit Price:</span>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-serif-brand font-black text-3xl text-[#2F5233]">
                    {formatCurrency(currentPrice)}
                  </span>
                  {hasSale && (
                    <span className="text-sm text-neutral-400 line-through">
                      {formatCurrency(selectedVariant!.price)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-neutral-500 block">Availability:</span>
                <span
                  className={`text-xs font-bold ${
                    isOutOfStock
                      ? 'text-red-600'
                      : selectedVariant && selectedVariant.stock <= selectedVariant.lowStockThreshold
                      ? 'text-amber-700'
                      : 'text-[#2F5233]'
                  }`}
                >
                  {isOutOfStock
                    ? 'Out of Stock'
                    : selectedVariant && selectedVariant.stock <= selectedVariant.lowStockThreshold
                    ? `Only ${selectedVariant.stock} left`
                    : 'In Stock (Fresh Pack)'}
                </span>
              </div>
            </div>

            {/* Variant Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                Select Size / Weight:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {enabledVariants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setQuantity(1);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      selectedVariantId === v.id
                        ? 'border-[#2F5233] bg-[#2F5233] text-white shadow-xs'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <div>{v.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">
                      {formatCurrency(v.salePrice || v.price)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Quantity:
              </label>
              <div className="flex items-center border border-neutral-300 rounded-xl bg-white p-1">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 disabled:opacity-30"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-bold text-[#2A2A28]">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(q =>
                      selectedVariant ? Math.min(selectedVariant.stock, q + 1) : q + 1
                    )
                  }
                  disabled={
                    isOutOfStock ||
                    (selectedVariant ? quantity >= selectedVariant.stock : false)
                  }
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 disabled:opacity-30"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-neutral-500">
                Subtotal: <strong className="text-[#2F5233]">{formatCurrency(currentPrice * quantity)}</strong>
              </span>
            </div>

            {/* Action Buttons: Add to Cart + Buy Now */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2">
              <motion.button
                id="modal-add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                className="py-3 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#eae4dc] text-[#2F5233] border-2 border-[#2F5233]/25 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </motion.button>

              <motion.button
                id="modal-buy-now-btn"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                className="py-3 px-4 rounded-xl bg-[#2F5233] hover:bg-[#3D6B45] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-[#D9A441]" />
                <span>Buy Now (Express)</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Detailed Tabs: Description, Nutrition, Purity, Origin, Reviews */}
        <div className="border-t border-neutral-200 px-4 sm:px-8 py-5 sm:py-6 bg-[#FAF7F2]/50">
          <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 mb-6">
            <button
              onClick={() => setActiveTab('desc')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'desc'
                  ? 'bg-[#2F5233] text-white'
                  : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Full Description
            </button>
            <button
              onClick={() => setActiveTab('purity')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'purity'
                  ? 'bg-[#2F5233] text-white'
                  : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Lab Purity Guarantee
            </button>
            <button
              onClick={() => setActiveTab('origin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'origin'
                  ? 'bg-[#2F5233] text-white'
                  : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Source & Moual Story
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'nutrition'
                  ? 'bg-[#2F5233] text-white'
                  : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Ingredients & Nutrition
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-[#2F5233] text-white'
                  : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Customer Reviews ({productReviews.length})
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="text-sm leading-relaxed text-neutral-700 min-h-[160px]">
            {activeTab === 'desc' && (
              <div className="space-y-3">
                <p>{product.fullDescription}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                  <div className="p-3 bg-white rounded-xl border border-neutral-200">
                    <strong className="text-xs text-[#2F5233] block mb-1">Storage Instructions:</strong>
                    <span className="text-xs">{product.storageInstructions}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-neutral-200">
                    <strong className="text-xs text-[#2F5233] block mb-1">Recommended Usage:</strong>
                    <span className="text-xs">{product.usageInstructions}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'purity' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#2F5233]/20">
                  <ShieldCheck className="w-6 h-6 text-[#2F5233] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-[#2F5233]">Purity & Quality Verification</h4>
                    <p className="text-xs text-neutral-600 mt-1">{product.purityInfo}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-neutral-200">
                    <strong className="block text-[#2F5233] font-bold mb-1">0% Artificial Additives</strong>
                    No corn syrup, inverted sugar, artificial fragrances, or chemical preservatives.
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-neutral-200">
                    <strong className="block text-[#2F5233] font-bold mb-1">Freshly Sealed</strong>
                    Air-tight food grade glass jars and multi-layer food-grade packaging.
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-neutral-200">
                    <strong className="block text-[#2F5233] font-bold mb-1">Authentic Taste</strong>
                    Natural pollen aroma and raw live enzymes intact.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'origin' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-neutral-200">
                  <Award className="w-5 h-5 text-[#D9A441] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-[#2A2A28]">Geographic Origin & Producer Story</h4>
                    <p className="text-xs text-neutral-600 mt-1">{product.originInfo}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-600">
                  GoodZeed maintains transparent, direct-supply relationships with generational Mouals
                  (forest honey harvesters), local oil ghani operators, and verified organic cooperatives.
                  By buying direct, we guarantee fair prices to primary producers and 100% unadulterated
                  food to your family.
                </p>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-neutral-200">
                  <strong className="text-xs text-[#2F5233] block mb-1">Ingredients:</strong>
                  <p className="text-xs">{product.ingredients}</p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-neutral-200">
                  <strong className="text-xs text-[#2F5233] block mb-1">Nutritional Values:</strong>
                  <p className="text-xs">{product.nutritionInfo}</p>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#2A2A28]">
                    Verified Customer Reviews ({productReviews.length})
                  </h4>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2F5233] text-white text-xs font-bold hover:bg-[#3D6B45] transition-colors"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>Write a Review</span>
                  </button>
                </div>

                {/* Review Submission Form */}
                {showReviewForm && (
                  <form onSubmit={handleReviewSubmit} className="bg-white p-4 rounded-xl border border-[#2F5233]/20 space-y-3">
                    <h5 className="font-bold text-xs text-[#2F5233]">Submit Your Experience</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 block mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={reviewName}
                          onChange={e => setReviewName(e.target.value)}
                          placeholder="e.g. Tanzina Akhter"
                          className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F5233]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 block mb-1">Phone Number * (for verification)</label>
                        <input
                          type="tel"
                          required
                          value={reviewPhone}
                          onChange={e => setReviewPhone(e.target.value)}
                          placeholder="017XXXXXXXX"
                          className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F5233]"
                        />
                        <span className="text-[10px] text-neutral-400 block mt-0.5">Will never be displayed publicly</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 block mb-1">Rating</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(r => (
                          <button
                            type="button"
                            key={r}
                            onClick={() => setReviewRating(r)}
                            className={`p-1 text-sm rounded ${reviewRating >= r ? 'text-[#D9A441]' : 'text-neutral-300'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 block mb-1">Your Review *</label>
                      <textarea
                        required
                        rows={3}
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        placeholder="Tell others about taste, aroma, purity, and delivery..."
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F5233]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#2F5233] text-white text-xs font-bold rounded-lg hover:bg-[#3D6B45]"
                      >
                        Submit Review
                      </button>
                    </div>
                  </form>
                )}

                {/* Reviews List */}
                {productReviews.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-4">
                    No approved reviews yet. Be the first to share your experience!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {productReviews.map(rev => (
                      <div key={rev.id} className="p-3.5 bg-white rounded-xl border border-neutral-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#2A2A28]">{rev.reviewerName}</span>
                            {rev.isVerifiedPurchase && (
                              <span className="inline-flex items-center gap-1 bg-[#2F5233]/10 text-[#2F5233] text-[10px] font-bold px-1.5 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 text-[#2F5233]" /> Verified Purchase
                              </span>
                            )}
                          </div>
                          <div className="flex text-[#D9A441] text-xs">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-neutral-600">{rev.reviewText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
