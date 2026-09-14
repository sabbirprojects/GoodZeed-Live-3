import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Star, CheckCircle2, Quote } from 'lucide-react';
import { staggerContainer, staggerItem } from '../motion';

export const TestimonialsSection: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const testimonials = [
    {
      name: 'Dr. Tanzina Akhter',
      location: 'Uttara Sector 7, Dhaka',
      rating: 5,
      product: 'Pure Sundarban Honey',
      text: 'Having tested numerous honey brands that taste like inverted sugar syrup, GoodZeed is a genuine breath of fresh air. The raw pollen sediment and floral fragrance are unmatched. My kids take it every morning with warm water.'
    },
    {
      name: 'Farhan Ahmed Chowdhury',
      location: 'Khulshi, Chittagong',
      rating: 5,
      product: 'Cold-Pressed Black Seed Oil',
      text: 'The pungent aroma of their kalonji oil confirms cold extraction without high heat destruction. Ordered via Cash on Delivery and received in Chittagong within 3 days in safe bubble wrap.'
    },
    {
      name: 'Mahmuda Begum',
      location: 'Dhanmondi, Dhaka',
      rating: 5,
      product: 'Artisanal Bilona Ghee',
      text: 'Reminds me of my grandmother village home in Manikganj. The granular (dana-dar) texture and golden color make khichuri and parathas taste heavenly.'
    }
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center max-w-2xl mx-auto space-y-2"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441]">
            Real Family Experiences
          </span>
          <h2 className="font-serif-brand font-extrabold text-2xl sm:text-4xl text-[#2F5233]">
            Trusted by 5,000+ Bangladeshi Homes
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial={shouldReduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              variants={staggerItem}
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-[#2F5233]/15 shadow-xs flex flex-col justify-between space-y-4 relative"
            >
              <Quote className="w-8 h-8 text-[#2F5233]/15 absolute top-6 right-6" />

              <div className="space-y-3">
                <div className="flex text-[#D9A441] text-xs">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed italic">
                  "{t.text}"
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-200/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#2A2A28]">{t.name}</h4>
                  <span className="text-[11px] text-neutral-500">{t.location}</span>
                </div>

                <span className="inline-flex items-center gap-1 bg-[#2F5233]/10 text-[#2F5233] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
