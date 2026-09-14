import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { ShieldCheck, Award, HeartHandshake, CheckCircle2, ArrowRight } from 'lucide-react';
import { staggerContainer, staggerItem } from '../motion';

export const BrandStorySection: React.FC = () => {
  const { setCurrentView } = useStore();
  const shouldReduceMotion = useReducedMotion();

  const pillars = [
    {
      title: 'Fair Pay to Bangladeshi Primary Harvesters',
      subtitle: 'Direct village procurement eliminating exploitative middlemen.',
    },
    {
      title: 'Independent Lab Tested Every Harvest',
      subtitle: 'Every batch passes sugar-syrup adulteration and heavy metal assays.',
    },
    {
      title: 'Inspected On Your Doorstep',
      subtitle: 'Open and inspect your jars before paying our delivery rider.',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-y border-neutral-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Visual Sourcing Collage */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: -48 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-[#FAF7F2]">
              <img
                src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80"
                alt="Direct Moual Honey Harvest"
                className="w-full h-96 sm:h-[440px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#D9A441]">
                  Sundarban Mangrove Expedition
                </span>
                <p className="font-serif-brand font-bold text-lg mt-1">
                  Wild hives harvested sustainably by generational Mouals without killing bees or harming forests.
                </p>
              </div>
            </div>

            {/* Float badge */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
              className="absolute -bottom-4 -right-4 sm:bottom-6 sm:-right-6 bg-[#2F5233] text-white p-4 sm:p-5 rounded-2xl shadow-xl border-2 border-[#D9A441] max-w-[200px]"
            >
              <span className="font-serif-brand font-black text-2xl text-[#D9A441]">0%</span>
              <p className="text-xs font-bold leading-tight mt-1">
                Zero Corn Syrup • Zero Chemical Fragrance • 100% Raw
              </p>
            </motion.div>
          </motion.div>

          {/* Right Column: Mission & Commitments */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: 48 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="lg:col-span-6 space-y-6"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441] flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4" />
                Artisanal Food Integrity
              </span>
              <h2 className="font-serif-brand font-extrabold text-3xl sm:text-4xl text-[#2F5233] mt-2 leading-tight">
                Real Everyday Food, Kept Exactly as Nature Intended
              </h2>
            </div>

            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
              Most commercial food in our supermarkets undergoes high-temperature industrial heating, bleaching, and chemical adulteration to extend shelf life and mimic visual perfection.
            </p>

            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
              At <strong className="text-[#2F5233]">GoodZeed</strong>, we reject short cuts. Our mustard seeds are pressed at low temperatures below 40°C on traditional cold ghanis. Our raw honey is hand-strained and packed without boiling off vital invertase and amylase enzymes.
            </p>

            {/* Pillar List */}
            <motion.div
              variants={staggerContainer}
              initial={shouldReduceMotion ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="space-y-3 pt-2"
            >
              {pillars.map(pillar => (
                <motion.div key={pillar.title} variants={staggerItem} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#2F5233] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-[#2A2A28]">{pillar.title}</h4>
                    <p className="text-xs text-neutral-500">{pillar.subtitle}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="pt-2">
              <motion.button
                onClick={() => setCurrentView('shop')}
                whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                className="px-6 py-3.5 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-colors"
              >
                <span>Browse Lab-Tested Staples</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
