"use client";

import { useEffect, useRef } from "react";

/**
 * Closes a hand-rolled modal when Escape is pressed.
 *
 * The dialogs in this app are plain `fixed inset-0` divs rather than the Radix
 * Dialog, which does this for itself. Nobody noticed while the modals were few,
 * but Escape is the one dismissal people try without looking, and every one of
 * these left them hunting for the X instead.
 *
 * Written once as a hook rather than as a `useEffect` copied into each modal:
 * there are a dozen of them, and the details below are exactly the sort that
 * get dropped from the fourth copy onwards.
 *
 * `enabled` is for modals a parent renders conditionally. A hook cannot be
 * called from inside the `renderSomething()` helpers those components use, so
 * it is called at the top level and switched on by the same state that decides
 * whether the modal is on screen.
 *
 * Applied only to modals that show things. A modal holding text the user typed
 * keeps its explicit cancel button, so a stray Escape cannot throw the typing
 * away — that trade is worth more there than the convenience is.
 */
export function useEscapeToClose(onClose: () => void, enabled = true) {
  // Callers pass an inline arrow, so the identity changes every render. Reading
  // it through a ref keeps the listener from being torn down and re-added on
  // each one, and still calls the current version.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Escape during IME composition cancels the composition — the text field
      // has already consumed that press, and closing the modal on it too would
      // take the panel away mid-word.
      if (event.isComposing) return;
      onCloseRef.current();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
