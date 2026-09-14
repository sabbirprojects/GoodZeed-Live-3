import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FadeInWhenVisible } from '../motion';

export const HomeFaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const shouldReduceMotion = useReducedMotion();

  const faqs = [
    {
      q: 'Does your raw Sundarban honey crystallize during winter in Bangladesh?',
      a: 'Yes, absolutely! Crystallization (granulation) is a 100% natural, physical property of genuine raw honey high in natural glucose and pollens. Only over-heated, pasteurized or corn-syrup-adulterated commercial honeys remain unnaturally liquid forever. To re-liquefy, simply warm the glass jar in a lukewarm water bath.'
    },
    {
      q: 'Can I open and check the package before paying the courier (Cash on Delivery)?',
      a: 'Yes! GoodZeed strongly encourages customers to inspect the outer seal, glass jar integrity, and invoice with our delivery rider before handing over payment.'
    },
    {
      q: 'How fast is delivery to Dhaka, Chittagong, Sylhet, and other districts?',
      a: 'Inside Dhaka Metropolitan, delivery takes 24 to 48 hours for ৳70. For Chittagong, Sylhet, Rajshahi, Khulna, and all nationwide upazilas, delivery takes 2 to 4 business days for ৳130 via reliable express couriers.'
    },
    {
      q: 'How are your mustard and black seed oils extracted?',
      a: 'We use traditional low-temperature cold expelling (wooden/stone ghani) where seeds are slowly cold-pressed without frictional heat exceeding 40°C. This keeps the pungent allyl isothiocyanate aroma, delicate antioxidants, and essential fatty acids fully active.'
    },
    {
      q: 'How do I pay with bKash or Nagad?',
      a: 'During checkout, select "bKash" or "Nagad". Our official payment number and step-by-step guide will be shown. Send the total amount, copy your Transaction ID (TrxID) from your SMS or app, and paste it into the checkout form. Our team will verify and dispatch promptly.'
    }
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#FAF7F2]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <FadeInWhenVisible className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441] flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Transparent Answers
          </span>
          <h2 className="font-serif-brand font-extrabold text-2xl sm:text-4xl text-[#2F5233]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
            Everything you need to know about raw honey authenticity, cold pressing, and home delivery.
          </p>
        </FadeInWhenVisible>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={idx}
                layout
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between font-bold text-xs sm:text-sm text-[#2A2A28] hover:bg-[#FAF7F2]/60 transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="w-4 h-4 text-[#2F5233]" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 bg-[#FAF7F2]/20">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
