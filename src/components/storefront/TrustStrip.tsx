import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, Leaf, Zap, Truck } from 'lucide-react';
import { staggerContainer, staggerItem } from '../motion';

const trustItems = [
  {
    icon: ShieldCheck,
    iconClass: 'text-[#2F5233]',
    title: '100% Lab Verified Purity',
    subtitle: 'Zero corn syrup, zero chemicals',
  },
  {
    icon: Leaf,
    iconClass: 'text-[#2F5233]',
    title: 'Direct Farm & Moual Source',
    subtitle: 'Sundarban forest & local ghanis',
  },
  {
    icon: Zap,
    iconClass: 'text-[#D9A441]',
    title: 'Fast Guest Checkout',
    subtitle: 'No password or signup required',
  },
  {
    icon: Truck,
    iconClass: 'text-[#2F5233]',
    title: 'Dhaka & 64 Districts COD',
    subtitle: 'Cash on delivery + bKash/Nagad',
  },
];

export const TrustStrip: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="bg-white border-y border-[#2F5233]/10 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial={shouldReduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
        >
          {trustItems.map(item => {
            const Icon = item.icon;
            return (
              <motion.div key={item.title} variants={staggerItem} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#2F5233]/10 flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${item.iconClass}`} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#2A2A28]">{item.title}</h4>
                  <p className="text-[11px] text-[#2A2A28]/70 mt-0.5">{item.subtitle}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
