"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { springs } from "./motion-tokens";

interface MotionFadeProps extends HTMLMotionProps<"div"> {
  delay?: number;
}

export function MotionFade({
  children,
  delay = 0,
  className = "",
  ...props
}: MotionFadeProps) {
  return (
    <motion.div
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
  return (
    <motion.div
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
  return (
    <motion.div
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
