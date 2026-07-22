"use client";

import { useActionState } from "react";
import { requestPasswordReset, type RequestResetState } from "./actions";

export default function RequestPasswordResetPage() {
  const [state, formAction, isPending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    null
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Reset your password</h1>
      <p className="mb-6 text-sm text-gray-500">
        Enter your account email and we&apos;ll generate a reset link.
      </p>

      {state?.message && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </main>
  );
}
