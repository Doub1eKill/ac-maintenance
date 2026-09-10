"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { springs } from "./motion-tokens";

export interface MotionCardProps extends HTMLMotionProps<"div"> {
  hoverLift?: boolean;
  tapFeedback?: boolean;
}

export function MotionCard({
  children,
  className = "",
  hoverLift = true,
  tapFeedback = true,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      whileHover={
        hoverLift
          ? {
              y: -3,
              transition: springs.snappy,
            }
          : undefined
      }
      whileTap={
        tapFeedback
          ? {
              scale: 0.985,
              transition: springs.snappy,
            }
          : undefined
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
