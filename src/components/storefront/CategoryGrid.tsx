import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { ArrowRight } from 'lucide-react';
import { staggerContainer, staggerItem } from '../motion';

export const CategoryGrid: React.FC = () => {
  const { categories, products, setSelectedCategorySlug, setCurrentView } = useStore();
  const shouldReduceMotion = useReducedMotion();

  const activeCategories = categories
    .filter(c => c.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const getProductCount = (categoryId: string) => {
    return products.filter(p => p.categoryId === categoryId && p.isEnabled).length;
  };

  const handleCategoryClick = (slug: string) => {
    setSelectedCategorySlug(slug);
    setCurrentView('category');
  };

  return (
    <section id="homepage-category-section" className="pt-6 sm:pt-8 pb-12 sm:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441] block mb-1">
              Natural Categories
            </span>
            <h2 className="font-serif-brand text-2xl sm:text-3xl font-extrabold text-[#2F5233]">
              Shop By Daily Essentials
            </h2>
          </div>
          <button
            onClick={() => {
              setSelectedCategorySlug(null);
              setCurrentView('shop');
            }}
            className="text-xs sm:text-sm font-bold text-[#2F5233] hover:text-[#3D6B45] flex items-center gap-1.5 transition-colors group"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial={shouldReduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 items-stretch"
        >
          {activeCategories.map(cat => {
            const count = getProductCount(cat.id);
            return (
              <motion.button
                key={cat.id}
                id={`category-card-${cat.slug}`}
                variants={staggerItem}
                whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.02 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                onClick={() => handleCategoryClick(cat.slug)}
                className="group text-left bg-white rounded-2xl overflow-hidden border border-[#2F5233]/15 shadow-xs hover:shadow-md transition-shadow flex flex-col h-full"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-neutral-100">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif-brand font-bold text-sm sm:text-base text-[#2A2A28] group-hover:text-[#2F5233] transition-colors leading-snug">
                      {cat.name}
                    </h3>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                    <span>{count} products</span>
                    <span className="font-bold text-[#2F5233] group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
