import { motion, useScroll, useReducedMotion } from 'motion/react';

/** Top scroll-progress bar. GPU-only (scaleX). Hidden when reduced motion. */
export function ScrollProgress({ className = '' }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      style={{ scaleX: scrollYProgress }}
      className={`fixed top-0 left-0 right-0 h-1 bg-[#D9A441] origin-left z-[60] ${className}`}
      aria-hidden="true"
    />
  );
}
