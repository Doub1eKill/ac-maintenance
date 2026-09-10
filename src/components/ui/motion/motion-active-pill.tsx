"use client";

import React from "react";
import { motion } from "motion/react";
import { springs } from "./motion-tokens";

export interface MotionActivePillProps {
  layoutId: string;
  className?: string;
  transition?: typeof springs.snappy;
}

export function MotionActivePill({
  layoutId,
  className = "absolute inset-0 bg-primary/10 rounded-md -z-10",
  transition = springs.snappy,
}: MotionActivePillProps) {
  return (
    <motion.div
      layoutId={layoutId}
      transition={transition}
      className={className}
    />
  );
}
