---
name: framer-motion
description: Production-ready animations, layout transitions, micro-interactions, and gesture handling using Motion (Framer Motion). Triggers on "framer motion", "motion", "motion.div", "AnimatePresence", "animation".
---

# Motion (Framer Motion) Skill Guide

## Overview
Motion (formerly Framer Motion) is the leading animation library for React and JavaScript, enabling smooth layout transitions, page enter/exit animations, and complex gestures.

## Core Concepts & Patterns
1. **Basic Motion Component**:
```tsx
import { motion } from 'framer-motion';

export function FadeInCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

2. **Variants & Staggered Animations**:
```tsx
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};
```

3. **AnimatePresence (Unmounting Animations)**:
```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      Modal Content
    </motion.div>
  )}
</AnimatePresence>
```

4. **Layout Animations (`layout`)**:
   - Add `layout` prop to automatically animate layout changes (reordering lists, accordion toggles).
