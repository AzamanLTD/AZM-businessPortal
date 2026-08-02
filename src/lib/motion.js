/**
 * INSTRUMENT MOTION — §2 of the spec.
 *
 * Every animated element imports from here, never hand-writes a spring.
 *
 * New INSTRUMENT components use:
 *   import { m } from 'motion/react'
 *   import { SPRING, V } from '@/lib/motion'
 *
 * Legacy compat exports (spring, rowsV, etc.)
 * preserved for backward-compat.
 */

// ── INSTRUMENT Spring lexicon (§2.2) ────────────────────────────────────────
export const SPRING = {
  /** Snappy positional snap — rail markers, tab indicators, layout animations */
  snap:    { type: 'spring', stiffness: 520, damping: 46, mass: 0.6 },

  /** Content settle — sheets, dialogs, cards landing into place */
  detent:  { type: 'spring', stiffness: 320, damping: 34, mass: 0.8 },

  /** Heavier UI — sidebars sliding, panels rearranging */
  glide:   { type: 'spring', stiffness: 220, damping: 30, mass: 1.0 },

  /** Reassurance — a confirmation pulse, a success checkmark */
  settle:  { type: 'spring', stiffness: 380, damping: 28, mass: 0.7 },

  /** Interruptible — drag release, gesture-following */
  follow:  { type: 'spring', stiffness: 180, damping: 22, mass: 1.0 },
};

// ── INSTRUMENT Variant presets (§2.4) ──────────────────────────────────────
export const V = {
  scrim: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  },
  sheetUp: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 16 },
    transition: SPRING.detent,
  },
  dialog: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: SPRING.detent,
  },
  palette: {
    initial: { opacity: 0, y: -8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -4, scale: 0.98 },
    transition: SPRING.snap,
  },
  item: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
  },
  toast: {
    initial: { opacity: 0, x: 40, scale: 0.96 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 20, scale: 0.98 },
    transition: SPRING.snap,
  },
};

// ── INSTRUMENT Easing / Duration tokens ─────────────────────────────────────
export const EASE = {
  out: [0.0, 0.0, 0.2, 1],
  io:  [0.4, 0.0, 0.2, 1],
  in:  [0.4, 0.0, 1, 1],
};

export const DUR = {
  hover: 0.12,
  press: 0.06,
  release: 0.16,
};

// ════════════════════════════════════════════════════════════════════════════
// COMPAT LAYER — preserved for backward-compat
// Legacy components import these.
// screens are cut over to Instrument.
// ════════════════════════════════════════════════════════════════════════════

export const ease = {
  out: [0.16, 1, 0.3, 1],
  io:  [0.4, 0, 0.2, 1],
  in:  [0.4, 0, 1, 1],
};

export const spring = {
  press:    { type:'spring', stiffness:700, damping:30, mass:0.4 },
  hover:    { type:'spring', stiffness:400, damping:25, mass:0.5 },
  popover:  { type:'spring', stiffness:500, damping:32, mass:0.8 },
  modal:    { type:'spring', stiffness:300, damping:30, mass:1   },
  drawer:   { type:'spring', stiffness:380, damping:34, mass:0.9 },
  indicator:{ type:'spring', stiffness:500, damping:40, mass:1   },
  reorder:  { type:'spring', stiffness:350, damping:25, mass:0.8 },
  toast:    { type:'spring', stiffness:500, damping:35, mass:0.6 },
};

export const tween = {
  fast:   { duration:0.10, ease: ease.out },
  hover:  { duration:0.12, ease: ease.io  },
  page:   { duration:0.20, ease: ease.io  },
  number: { duration:0.60, ease: 'easeOut' },
};

export const pageV = {
  initial:{ opacity:0, y:2 },
  animate:{ opacity:1, y:0, transition: tween.page },
  exit:   { opacity:0, y:0, transition: tween.fast },
};

export const popoverV = {
  initial:{ opacity:0, scale:0.97, y:-4 },
  animate:{ opacity:1, scale:1, y:0,
            transition:{ ...spring.popover, opacity: tween.fast } },
  exit:   { opacity:0, scale:0.98, y:-2, transition: tween.fast },
};

export const modalV = {
  initial:{ opacity:0, scale:0.985, y:6 },
  animate:{ opacity:1, scale:1, y:0,
            transition:{ ...spring.modal, opacity: tween.fast } },
  exit:   { opacity:0, scale:0.99, y:4, transition: tween.fast },
};

export const scrimV = {
  initial:{ opacity:0 }, animate:{ opacity:1, transition: tween.hover },
  exit:{ opacity:0, transition: tween.fast },
};

export const toastV = {
  initial:{ opacity:0, y:12, scale:0.97 },
  animate:{ opacity:1, y:0, scale:1,
            transition:{ ...spring.toast, opacity: tween.fast } },
  exit:   { opacity:0, scale:0.97, transition: tween.fast },
};

export const rowsV = {
  hidden:{},
  visible:{ transition:{ staggerChildren:0.018, delayChildren:0.02 } },
};
export const rowV = {
  hidden:{ opacity:0, y:3 },
  visible:{ opacity:1, y:0, transition:{ duration:0.16, ease: ease.out } },
};

// backward-compatible aliases
export const pageVariants = pageV;
export const listVariants = rowsV;
export const listItemVariants = rowV;
export const sidebarVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: tween.page },
};
export const ContainerV = { hidden: {}, visible: { transition: { staggerChildren: 0.03 } } };
export const ItemV = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: ease.out } } };
