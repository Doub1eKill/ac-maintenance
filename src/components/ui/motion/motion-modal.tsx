"use client";

import React, { useRef } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { springs } from "./motion-tokens";
import { useSettleWithoutFrames, GENTLE_SPRING_SETTLE_MS } from "./use-settle-without-frames";

export function MotionModalContainer({
  children,
  className = "",
  ...props
}: HTMLMotionProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useSettleWithoutFrames(ref, GENTLE_SPRING_SETTLE_MS);
  return (
    <motion.div
      ref={ref}
      {...settle}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 6 }}
      transition={springs.gentle}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
