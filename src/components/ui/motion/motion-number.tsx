"use client";

import React, { useEffect, useState, useRef } from "react";
import { animate, useReducedMotion, type AnimationPlaybackControls } from "motion/react";

export interface MotionNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * A number that counts up to its value.
 *
 * The count is driven by motion's frame loop, which runs on
 * requestAnimationFrame — and browsers stop rAF outright in a tab that is not
 * visible. Left to itself, a counter that started while the tab was showing
 * and lost visibility part-way would sit on whatever frame it last drew, and
 * that frame is a plausible-looking number rather than an obvious blank: the
 * overview was read as "29 เครื่อง" against a database holding 73. So every
 * path that can stop the frame loop has a path that does not need it:
 *
 * - `onComplete` writes the exact target, not the last rounded frame.
 * - `visibilitychange` to hidden stops the animation and writes the target.
 * - A timer set for just past the animation's end writes the target anyway;
 *   timers are throttled in hidden tabs, but unlike rAF they still fire.
 * - A tab that is already hidden at mount, or a user who has asked for reduced
 *   motion, gets the target straight away and no animation at all.
 */
export function MotionNumber({
  value,
  duration = 0.8,
  prefix = "",
  suffix = "",
  className = "",
}: MotionNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let controls: AnimationPlaybackControls | null = null;
    const settle = () => {
      controls?.stop();
      setDisplayValue(value);
    };

    // Only perform when somebody can watch it. A hidden tab would freeze the
    // count on its first frame, and reduced motion is a request not to count.
    const shouldAnimate = !reduceMotion && document.visibilityState !== "hidden";

    if (shouldAnimate) {
      controls = animate(prevValueRef.current, value, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => setDisplayValue(Math.round(latest)),
        onComplete: settle,
      });
    }
    prevValueRef.current = value;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") settle();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // The backstop. If the frame loop never ran, or ran and stalled, this
    // lands the real number a moment after the animation was due to finish.
    // Zero delay when not animating, so a hidden mount is not left showing
    // its initial state any longer than a tick.
    const deadline = window.setTimeout(settle, shouldAnimate ? duration * 1000 + 200 : 0);

    return () => {
      controls?.stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(deadline);
    };
  }, [value, duration, reduceMotion]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}
