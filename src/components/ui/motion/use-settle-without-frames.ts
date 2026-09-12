"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Lands a mount animation on its resting state when the frame loop cannot.
 *
 * The mount animations in this folder (`initial={{ opacity: 0 }}` and
 * friends) are driven by motion's frame loop on requestAnimationFrame, which
 * browsers stop in a tab that is not visible — and, for an occluded window,
 * sometimes while `visibilityState` still says "visible". An element that
 * mounted under those conditions stays at opacity 0 until a frame arrives,
 * which for a screenshot, a print, or an automated read is never. Nobody sees
 * a wrong number, unlike MotionNumber, but a whole row of KPI cards was blank
 * in a capture of the overview.
 *
 * Every mount animation here ends at opacity 1 and no transform, so that is
 * where the element gets put, by the same routes MotionNumber uses: the tab
 * going hidden, a timer past the animation's due time (timers still fire in
 * hidden tabs; rAF does not), and immediately when the tab is already hidden
 * at mount or the user has asked for reduced motion.
 *
 * Two things about motion made this more than an inline-style write:
 *
 * - It runs opacity and transform through the Web Animations API where it
 *   can, and a running WAAPI animation outranks inline style in the cascade.
 *   The animation has to be finished — synchronous, no frame needed — and
 *   that also hands motion its finish event so it commits its own values.
 * - It starts the animation on a frame, not at mount. With the frame loop
 *   stopped, settle can run before there is anything to finish, and the
 *   animation then begins from opacity 0 when a frame finally arrives.
 *   (motion's onAnimationStart is no help: it fires when the animation is
 *   *requested*, in the same effect, before the frame that creates it.) So
 *   when settle finds nothing to finish, it watches for a short while and
 *   finishes whatever turns up. Only the mount animation: once it has
 *   completed, the element is left alone, so exit animations still play.
 *
 * Returns the motion event handler the element must be given. Spread it before
 * any caller-supplied props; a caller's own handler would replace it.
 *
 * @param settleAfterMs when to give up waiting for the animation: its delay
 *   plus its expected length, with some slack.
 */
export function useSettleWithoutFrames(
  ref: RefObject<HTMLElement | null>,
  settleAfterMs: number
) {
  const reduceMotion = useReducedMotion();
  // the mount animation reached its end, by any route; after this the element
  // belongs to motion again
  const mountDoneRef = useRef(false);
  const watchRef = useRef<number | null>(null);

  const stopWatching = useCallback(() => {
    if (watchRef.current !== null) {
      window.clearInterval(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const settle = useCallback(() => {
    const el = ref.current;
    if (!el || mountDoneRef.current) return;

    const finishAll = () => {
      const animations = el.getAnimations?.() ?? [];
      animations.forEach((a) => {
        try {
          a.finish();
        } catch {
          // an infinite animation cannot be finished; none of ours are
        }
      });
      el.style.opacity = "1";
      el.style.transform = "none";
      return animations.length > 0;
    };

    if (finishAll() || watchRef.current !== null) return;

    // Nothing to finish yet: the animation has not been created. Watch for it,
    // briefly — this only happens with the frame loop stopped, and the frame
    // that eventually creates the animation is also the one that would let a
    // second check run.
    const startedAt = Date.now();
    watchRef.current = window.setInterval(() => {
      if (mountDoneRef.current || finishAll() || Date.now() - startedAt > WATCH_FOR_LATE_START_MS) {
        stopWatching();
      }
    }, 200);
  }, [ref, stopWatching]);

  useEffect(() => {
    mountDoneRef.current = false;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") settle();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const immediate = reduceMotion || document.visibilityState === "hidden";
    const deadline = window.setTimeout(settle, immediate ? 0 : settleAfterMs);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(deadline);
      stopWatching();
    };
  }, [settle, stopWatching, settleAfterMs, reduceMotion]);

  const onAnimationComplete = useCallback(() => {
    mountDoneRef.current = true;
    stopWatching();
  }, [stopWatching]);

  return { onAnimationComplete };
}

/**
 * How long settle keeps watching for an animation that has not been created.
 *
 * Generous, because the frame that creates it is the one thing this hook
 * cannot hurry. In a real browser frames return with the tab, and the
 * animation then simply plays to completion on its own; the watch matters in
 * an occluded window that gets the odd single frame — the Claude Browser pane
 * on a screenshot — where the animation is created and then stalls at once.
 */
const WATCH_FOR_LATE_START_MS = 10_000;

/**
 * How long the gentle spring in motion-tokens takes to come to rest, with
 * slack. Stiffness 260 / damping 20 settles within about 700ms.
 */
export const GENTLE_SPRING_SETTLE_MS = 900;
