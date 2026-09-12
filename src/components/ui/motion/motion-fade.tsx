"use client";

import React, { useRef } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { springs } from "./motion-tokens";
import { useSettleWithoutFrames, GENTLE_SPRING_SETTLE_MS } from "./use-settle-without-frames";

interface MotionFadeProps extends HTMLMotionProps<"div"> {
  delay?: number;
}

export function MotionFade({
  children,
  delay = 0,
  className = "",
  ...props
}: MotionFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useSettleWithoutFrames(ref, delay * 1000 + GENTLE_SPRING_SETTLE_MS);
  return (
    <motion.div
      ref={ref}
      {...settle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ ...springs.gentle, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MotionStaggerProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number;
  initialDelay?: number;
}

export function MotionStagger({
  children,
  staggerDelay = 0.05,
  initialDelay = 0.02,
  className = "",
  ...props
}: MotionStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useSettleWithoutFrames(ref, initialDelay * 1000 + GENTLE_SPRING_SETTLE_MS);
  return (
    <motion.div
      ref={ref}
      {...settle}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
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
}: HTMLMotionProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  // An item cannot know its place in the stagger, so this allows for a
  // long list: twenty items at the default 50ms step, plus the spring.
  const settle = useSettleWithoutFrames(ref, 1000 + GENTLE_SPRING_SETTLE_MS);
  return (
    <motion.div
      ref={ref}
      {...settle}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: springs.gentle,
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
