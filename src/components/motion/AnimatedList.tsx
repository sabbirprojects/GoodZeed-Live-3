import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { transitions } from './transitions';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.spring },
};

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  itemClassName?: string;
  /** Animate on scroll into view instead of on mount */
  whileInView?: boolean;
}

/**
 * Staggered fade-in list. GPU-only (opacity + y).
 * Respects reduced motion by rendering a plain list.
 */
export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
  whileInView = false,
}: AnimatedListProps<T>) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <ul className={className}>
        {items.map((item, index) => (
          <li key={keyExtractor(item, index)} className={itemClassName}>
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
    );
  }

  if (whileInView) {
    return (
      <motion.ul
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className={className}
      >
        {items.map((item, index) => (
          <motion.li
            key={keyExtractor(item, index)}
            variants={itemVariants}
            className={itemClassName}
            layout
          >
            {renderItem(item, index)}
          </motion.li>
        ))}
      </motion.ul>
    );
  }

  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {items.map((item, index) => (
        <motion.li
          key={keyExtractor(item, index)}
          variants={itemVariants}
          className={itemClassName}
          layout
        >
          {renderItem(item, index)}
        </motion.li>
      ))}
    </motion.ul>
  );
}

export { containerVariants as animatedListContainer, itemVariants as animatedListItem };
