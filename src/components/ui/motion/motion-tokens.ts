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
