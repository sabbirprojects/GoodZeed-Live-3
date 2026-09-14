import type { Transition } from 'motion/react';

// GPU-friendly only: opacity + transform (x/y/scale). No width/height/top/left.
export const transitions = {
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 24,
  } as Transition,
  springBouncy: {
    type: 'spring',
    stiffness: 500,
    damping: 15,
  } as Transition,
  springStiff: {
    type: 'spring',
    stiffness: 700,
    damping: 30,
  } as Transition,
  smooth: {
    type: 'tween',
    duration: 0.3,
    ease: 'easeInOut',
  } as Transition,
  snappy: {
    type: 'tween',
    duration: 0.15,
    ease: [0.25, 0.1, 0.25, 1],
  } as Transition,
  fadeUp: {
    type: 'tween',
    duration: 0.5,
    ease: 'easeOut',
  } as Transition,
} as const;
