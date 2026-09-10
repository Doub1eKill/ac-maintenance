"use client";

import React, { useEffect, useState, useRef } from "react";
import { animate } from "motion/react";

export interface MotionNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function MotionNumber({
  value,
  duration = 0.8,
  prefix = "",
  suffix = "",
  className = "",
}: MotionNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    const controls = animate(prevValueRef.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });
    prevValueRef.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}
