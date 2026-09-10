"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { springs } from "./motion-tokens";

export function MotionModalContainer({
  children,
  className = "",
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
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
