"use client";

import type { FormEvent } from "react";

/**
 * Thai wording for the browser's own validation bubble.
 *
 * A `required` or `min` attribute is the right first line of defence — it
 * refuses the value before a round trip — but the bubble it produces is in
 * the browser's language ("Value must be greater than or equal to 0.") on a
 * form whose every other word is Thai (QA 20260913-1742, BUG-010). Spread
 * the result onto the input: onInvalid swaps the message in for the failing
 * constraint, onInput clears it so the field can become valid again — a
 * custom validity that is never cleared keeps the field invalid for good.
 */
export function nativeValidity(messages: {
  valueMissing?: string;
  rangeUnderflow?: string;
  rangeOverflow?: string;
  stepMismatch?: string;
  badInput?: string;
}) {
  return {
    onInvalid: (e: FormEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const v = el.validity;
      const message = v.valueMissing
        ? messages.valueMissing
        : v.rangeUnderflow
          ? messages.rangeUnderflow
          : v.rangeOverflow
            ? messages.rangeOverflow
            : v.stepMismatch
              ? messages.stepMismatch
              : v.badInput
                ? messages.badInput
                : undefined;
      el.setCustomValidity(message ?? "");
    },
    onInput: (e: FormEvent<HTMLInputElement>) => e.currentTarget.setCustomValidity(""),
  };
}
