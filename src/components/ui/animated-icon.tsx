"use client";

import React from "react";
import { motion, HTMLMotionProps, Variants } from "motion/react";
import { LucideIcon } from "lucide-react";

export type AnimationType = "bounce" | "spin" | "pulse" | "wiggle" | "lift" | "sparkle";

interface AnimatedIconProps extends Omit<HTMLMotionProps<"div">, "children"> {
  icon: LucideIcon;
  size?: number;
  className?: string;
  animation?: AnimationType;
}

const animationVariants: Record<AnimationType, Variants> = {
  bounce: {
    hover: { scale: 1.18, rotate: 6, transition: { type: "spring", stiffness: 400, damping: 10 } },
    tap: { scale: 0.9 },
  },
  spin: {
    hover: { rotate: 180, scale: 1.1, transition: { duration: 0.4, ease: "easeInOut" } },
    tap: { rotate: 360, transition: { duration: 0.4 } },
  },
  pulse: {
    hover: { scale: [1, 1.2, 1], transition: { duration: 0.6, repeat: Infinity } },
    tap: { scale: 0.95 },
  },
  wiggle: {
    hover: {
      rotate: [0, -12, 12, -8, 8, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    },
    tap: { scale: 0.9 },
  },
  lift: {
    hover: { y: -3, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 15 } },
    tap: { y: 0, scale: 0.95 },
  },
  sparkle: {
    hover: {
      scale: [1, 1.2, 1.1],
      rotate: [0, 15, -15, 0],
      transition: { duration: 0.5 },
    },
    tap: { scale: 0.9 },
  },
};

export function AnimatedIcon({
  icon: Icon,
  size = 20,
  className = "",
  animation = "bounce",
  ...props
}: AnimatedIconProps) {
  const variants = animationVariants[animation];

  return (
    <motion.div
      className={`inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      whileHover="hover"
      whileTap="tap"
      variants={variants}
      {...props}
    >
      <Icon style={{ width: size, height: size }} />
    </motion.div>
  );
}
