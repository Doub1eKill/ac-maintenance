"use client";

import React, { useLayoutEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "motion/react";

export interface MotionNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function formatNumber(n: number, prefix: string, suffix: string) {
  return `${prefix}${Math.round(n).toLocaleString()}${suffix}`;
}

/**
 * A number that counts up to its value.
 *
 * The text is a MotionValue rendered as the span's child, which motion writes
 * straight into the text node on every change — no React render per frame,
 * and (checked in motion-dom's DOMVisualElement) the write is synchronous, not
 * frame-scheduled. That second property is what the rest of this relies on.
 *
 * The count itself is driven by motion's frame loop, which runs on
 * requestAnimationFrame — and browsers stop rAF outright in a tab that is not
 * visible. Left to itself, a counter that lost visibility part-way would sit
 * on whatever frame it last drew, and that frame is a plausible-looking number
 * rather than an obvious blank: the overview was read as "29 เครื่อง" against a
 * database holding 73. So every path that can stop the frame loop has a path
 * that does not need it:
 *
 * - `onComplete` writes the exact target, not the last rounded frame.
 * - `visibilitychange` to hidden stops the animation and writes the target.
 * - A timer set for just past the animation's end writes the target anyway;
 *   timers are throttled in hidden tabs, but unlike rAF they still fire. This
 *   is the path that matters for an occluded window, which can lose rAF while
 *   visibilityState still says "visible".
 * - A tab that is already hidden at mount, or a user who has asked for reduced
 *   motion, gets the target straight away and no animation at all.
 *
 * Two smaller things the layout effect buys. The text server-renders as the
 * real value, so a slow hydration shows the right number rather than a zero;
 * jumping it to the count's starting point before first paint means there is
 * no one-frame flash of the target before the count begins. And the count
 * starts from where it visibly is, so a value that changes mid-count continues
 * from the current figure instead of snapping to the previous target first.
 */
export function MotionNumber({
  value,
  duration = 0.8,
  prefix = "",
  suffix = "",
  className = "",
}: MotionNumberProps) {
  const label = useMotionValue(formatNumber(value, prefix, suffix));
  // Where the count visibly is right now. Starts at zero so the first mount
  // counts up from nothing, the way a dashboard metric is expected to.
  const positionRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    let controls: AnimationPlaybackControls | null = null;
    const settle = () => {
      controls?.stop();
      positionRef.current = value;
      label.set(formatNumber(value, prefix, suffix));
    };

    // Only perform when somebody can watch it. A hidden tab would freeze the
    // count on its first frame, and reduced motion is a request not to count.
    const shouldAnimate = !reduceMotion && document.visibilityState !== "hidden";

    if (shouldAnimate) {
      // Before first paint: show the starting figure, not the target.
      label.set(formatNumber(positionRef.current, prefix, suffix));
      controls = animate(positionRef.current, value, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => {
          positionRef.current = latest;
          label.set(formatNumber(latest, prefix, suffix));
        },
        onComplete: settle,
      });
    }

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
  }, [value, duration, prefix, suffix, reduceMotion, label]);

  return <motion.span className={className}>{label}</motion.span>;
}
