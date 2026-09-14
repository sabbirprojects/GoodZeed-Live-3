import type { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface PageTransitionProps {
  /** Key that changes per view/route to trigger exit+enter */
  viewKey: string;
  children: ReactNode;
  className?: string;
  y?: number;
}

/**
 * Clean page-transition layout: fade + slide, AnimatePresence exit.
 * Usage: <PageTransition viewKey={currentView}><ShopView/></PageTransition>
 * GPU-only (opacity + y). Reduced-motion renders plain div.
 */
export function PageTransition({ viewKey, children, className, y = 20 }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
