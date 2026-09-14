import type { MouseEvent, ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

const buttonVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  hover: { scale: 1.04, opacity: 1 },
  tap: { scale: 0.95, opacity: 1 },
  disabled: { scale: 1, opacity: 0.5 },
};

interface AnimatedButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
}

/**
 * Hover/tap micro-interaction button (spring physics).
 * GPU-only: scale + opacity. Reduced-motion safe.
 */
export function AnimatedButton({
  children,
  disabled,
  variant = 'primary',
  className = '',
  onClick,
  type = 'button',
  id,
}: AnimatedButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  const base =
    variant === 'primary'
      ? 'bg-[#2F5233] hover:bg-[#3D6B45] text-white shadow-xs'
      : 'bg-[#FAF7F2] hover:bg-[#EAE4DC] text-[#2F5233] border border-[#2F5233]/20';

  if (shouldReduceMotion) {
    return (
      <button
        id={id}
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${base} ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      id={id}
      type={type}
      variants={buttonVariants}
      initial="initial"
      whileHover={disabled ? 'disabled' : 'hover'}
      whileTap={disabled ? 'disabled' : 'tap'}
      animate={disabled ? 'disabled' : 'initial'}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-xl font-bold text-sm disabled:pointer-events-none ${base} ${className}`}
    >
      {children}
    </motion.button>
  );
}
