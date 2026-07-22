"use client";

import { useActionState } from "react";
import { resetPassword, type ResetPasswordState } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    null
  );

  if (state?.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Password updated. You can now{" "}
        <a href="/login" className="font-semibold underline">
          log in
        </a>
        .
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}
