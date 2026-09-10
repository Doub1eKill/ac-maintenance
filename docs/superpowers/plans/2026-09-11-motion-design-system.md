# Motion Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-ready, highly polished Motion Design System (`motion.dev` / `motion/react`) across the AC Maintenance platform, enhancing micro-interactions, layout transitions, and visual feedback for both Admin and Technician interfaces.

**Architecture:** Create modular, reusable Motion Primitives and Tokens (`src/components/ui/motion/`) wrapping React Server Component boundaries cleanly with `"use client"`. Integrate these primitives into Admin metrics, tabs, tables, and Technician mobile navigation and job cards.

**Tech Stack:** Next.js 16 (App Router), React 19, `motion` v12.42.2 (`motion/react`), Tailwind CSS v4, Radix UI Primitives, Lucide React icons.

**Spec:** [docs/superpowers/specs/2026-09-11-motion-design-system.md](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/docs/superpowers/specs/2026-09-11-motion-design-system.md)

## Global Constraints
- Strictly import from `"motion/react"` (official React entry point of `motion` v12).
- Zero emojis in any UI component, text label, or status indicator (strict Lucide React SVG icon rule).
- Keep animations snappy and performant (durations between 0.15s - 0.35s, spring-based physics).
- Respect `prefers-reduced-motion` to ensure accessibility and avoid motion sickness.
- Maintain Next.js Server / Client component separation.

---

### Task 1: Core Motion Tokens & Primitives (`src/components/ui/motion/`)

**Files:**
- Create: `src/components/ui/motion/motion-tokens.ts`
- Create: `src/components/ui/motion/motion-fade.tsx`
- Create: `src/components/ui/motion/motion-card.tsx`
- Create: `src/components/ui/motion/motion-active-pill.tsx`
- Create: `src/components/ui/motion/motion-number.tsx`
- Create: `src/components/ui/motion/motion-modal.tsx`
- Create: `src/components/ui/motion/index.ts`

**Interfaces:**
- Produces:
  - `springs`: `{ snappy, gentle, bouncy }`
  - `MotionFade`: `({ children, delay, className }: MotionFadeProps) => JSX.Element`
  - `MotionStagger`: `({ children, staggerDelay, className }: MotionStaggerProps) => JSX.Element`
  - `MotionStaggerItem`: `({ children, className }: MotionStaggerItemProps) => JSX.Element`
  - `MotionCard`: `({ children, className, hoverLift }: MotionCardProps) => JSX.Element`
  - `MotionActivePill`: `({ layoutId, className }: MotionActivePillProps) => JSX.Element`
  - `MotionNumber`: `({ value, className, prefix, suffix }: MotionNumberProps) => JSX.Element`
  - `MotionModalContainer`: `({ children, className }: MotionModalContainerProps) => JSX.Element`

- [ ] **Step 1: Create `src/components/ui/motion/motion-tokens.ts`**
Define shared spring configurations and timing constants:
```typescript
import { type Transition } from "motion/react";

export const springs = {
  snappy: { type: "spring", stiffness: 400, damping: 25 } as const satisfies Transition,
  gentle: { type: "spring", stiffness: 260, damping: 20 } as const satisfies Transition,
  bouncy: { type: "spring", stiffness: 500, damping: 15 } as const satisfies Transition,
};

export const durations = {
  fast: 0.15,
  normal: 0.25,
  relaxed: 0.35,
};
```

- [ ] **Step 2: Create `src/components/ui/motion/motion-fade.tsx`**
Implement staggered fade-in primitives with `"use client"`:
```tsx
"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { springs } from "./motion-tokens";

export function MotionFade({
  children,
  delay = 0,
  className = "",
  ...props
}: { delay?: number; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.gentle, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({
  children,
  staggerDelay = 0.05,
  className = "",
  ...props
}: { staggerDelay?: number; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerDelay },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  className = "",
  ...props
}: { className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: springs.gentle },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/motion/motion-card.tsx`**
Implement elevated card with subtle hover lift and tap squash:
```tsx
"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { springs } from "./motion-tokens";

interface MotionCardProps extends HTMLMotionProps<"div"> {
  hoverLift?: boolean;
}

export function MotionCard({
  children,
  className = "",
  hoverLift = true,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      whileHover={hoverLift ? { y: -3, transition: springs.snappy } : undefined}
      whileTap={{ scale: 0.985, transition: springs.snappy }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Create `src/components/ui/motion/motion-active-pill.tsx`**
Implement shared layout active indicator:
```tsx
"use client";

import React from "react";
import { motion } from "motion/react";
import { springs } from "./motion-tokens";

export function MotionActivePill({
  layoutId,
  className = "absolute inset-0 bg-primary/10 rounded-md -z-10",
}: {
  layoutId: string;
  className?: string;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      transition={springs.snappy}
      className={className}
    />
  );
}
```

- [ ] **Step 5: Create `src/components/ui/motion/motion-number.tsx`**
Implement rolling spring counter for metrics:
```tsx
"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";

export function MotionNumber({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (latest) =>
    Math.round(latest).toLocaleString()
  );
  const [currentText, setCurrentText] = useState(value.toLocaleString());

  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.on("change", (val) => setCurrentText(val));
    return () => unsubscribe();
  }, [value, spring, display]);

  return (
    <span className={className}>
      {prefix}
      {currentText}
      {suffix}
    </span>
  );
}
```

- [ ] **Step 6: Create `src/components/ui/motion/motion-modal.tsx` and `index.ts`**
Export all primitives from `src/components/ui/motion/index.ts`.

- [ ] **Step 7: Commit Task 1**
```bash
git add src/components/ui/motion/
git commit -m "feat(ui): add core motion design system tokens and primitives"
```

---

### Task 2: Admin Portal Motion Integration

**Files:**
- Modify: `src/components/admin/overview-metrics-grid.tsx`
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `src/components/admin/upcoming-maintenance-table.tsx`

**Interfaces:**
- Consumes: `MotionStagger`, `MotionStaggerItem`, `MotionCard`, `MotionNumber`, `MotionActivePill` from `@/components/ui/motion`

- [ ] **Step 1: Enhance `overview-metrics-grid.tsx`**
Wrap the grid in `MotionStagger` and metric cards in `MotionStaggerItem` + `MotionCard`. Replace static metric values with `MotionNumber`.

- [ ] **Step 2: Enhance `admin-shell.tsx` Tabs**
Add `MotionActivePill` with `layoutId="admin-active-tab"` to the active tab navigation button so the active indicator glides smoothly between tabs.

- [ ] **Step 3: Enhance `upcoming-maintenance-table.tsx`**
Add row entrance animations and fluid `layout` transitions on table rows during filtering and pagination.

- [ ] **Step 4: Commit Task 2**
```bash
git add src/components/admin/
git commit -m "feat(admin): integrate motion animations in metrics, tabs, and tables"
```

---

### Task 3: Technician Mobile Portal Motion Integration

**Files:**
- Modify: `src/components/tech/tech-bottom-nav.tsx`
- Modify: `src/components/tech/tech-shell.tsx`
- Modify: `src/components/tech/job-pool-panel.tsx`

**Interfaces:**
- Consumes: `MotionActivePill`, `MotionCard`, `MotionFade`, `AnimatePresence`

- [ ] **Step 1: Enhance `tech-bottom-nav.tsx`**
Add `MotionActivePill` with `layoutId="tech-nav-pill"` for mobile bottom navigation. Add micro-tap spring scale on tab selection.

- [ ] **Step 2: Enhance `tech-shell.tsx`**
Wrap tab view transitions with `<AnimatePresence mode="wait">` and `<motion.div>` for fluid slide/fade screen transitions.

- [ ] **Step 3: Enhance `job-pool-panel.tsx`**
Wrap job list with staggered entry, add interactive card touch response, and gentle pulse indicator on Urgent items.

- [ ] **Step 4: Commit Task 3**
```bash
git add src/components/tech/
git commit -m "feat(tech): integrate mobile-first motion transitions and feedback"
```

---

### Task 4: Verification & Build Validation

- [ ] **Step 1: Run Next.js build**
Execute `npm run build` to verify clean TypeScript compilation and Next.js 16 webpack compatibility.

- [ ] **Step 2: Verify No-Emoji & Accessibility Standards**
Confirm all icons are Lucide SVG icons. Verify that elements have no unexpected layout shifts.

- [ ] **Step 3: Final Commit & Summary**
Commit any remaining polish and record validation results.
