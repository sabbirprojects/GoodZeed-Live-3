import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
import { staggerContainer, staggerItem } from '../motion';

interface FeaturedProductsSectionProps {
  onOpenDetail?: (product: Product) => void;
}

const PAGE_SIZE = 8;

export const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({ onOpenDetail }) => {
  const { products, setCurrentView } = useStore();
  const shouldReduceMotion = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Full candidate list — no cap; slice is applied separately for rendering
  const allFeatured = products.filter(
    p => p.isEnabled !== false && (p.isBestSeller || p.isFeatured)
  );

  // Graceful handling for all edge cases:
  // 0 products → return null (no section rendered)
  if (allFeatured.length === 0) return null;

  const visibleProducts = allFeatured.slice(0, visibleCount);

  // Only show Load More when the total exceeds PAGE_SIZE AND there are still
  // more items beyond what is currently visible.
  // - total <= PAGE_SIZE  → button never appears
  // - total > PAGE_SIZE, all visible → button disappears
  // - total > PAGE_SIZE, more remain → button shown
  const totalExceedsPage = allFeatured.length > PAGE_SIZE;
  const hasMore = totalExceedsPage && visibleCount < allFeatured.length;

  return (
    <section className="py-14 sm:py-20 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Pure Harvest
            </span>
            <h2 className="font-serif-brand font-extrabold text-2xl sm:text-4xl text-[#2F5233] mt-1">
              Customer Favorites &amp; Best Sellers
            </h2>
          </div>

          <button
            id="view-all-favorites-btn"
            onClick={() => setCurrentView('shop')}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#2F5233] hover:text-[#3D6B45] group self-start sm:self-auto"
          >
            <span>Explore Entire Catalog</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Product Grid */}
        <motion.div
          variants={staggerContainer}
          initial={shouldReduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-5 items-stretch"
        >
          <AnimatePresence mode="popLayout">
            {visibleProducts.map(product => (
              <motion.div
                key={product.id}
                variants={staggerItem}
                layout
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="h-full"
              >
                <ProductCard
                  product={product}
                  onOpenDetail={onOpenDetail}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Load More — only rendered when total > PAGE_SIZE and more items remain */}
        {hasMore && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex justify-center pt-2"
          >
            <button
              id="featured-load-more-btn"
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="
                inline-flex items-center gap-2
                px-7 py-3
                rounded-xl
                bg-white border border-[#2F5233]/20
                text-[#2F5233] font-bold text-sm
                shadow-sm hover:shadow-md
                hover:bg-[#2F5233] hover:text-white hover:border-[#2F5233]
                transition-all duration-200
                active:scale-[0.97]
              "
              aria-label={`Load more products (${allFeatured.length - visibleCount} remaining)`}
            >
              <ChevronDown className="w-4 h-4" />
              <span>Load More</span>
              <span className="text-xs font-normal opacity-70">
                ({allFeatured.length - visibleCount} more)
              </span>
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
};
