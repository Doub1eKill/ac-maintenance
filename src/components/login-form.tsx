"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// Maps the CredentialsSignin subclass `code`s thrown in auth.ts to the
// message shown here — kept in one place so the wording used to explain an
// account's state stays consistent with what the server actually decided.
const ERROR_MESSAGES: Record<string, string> = {
  "account-pending": "Your account is awaiting approval from your university administrator.",
  "account-suspended": "Your account has been suspended. Please contact your university administrator.",
  "password-reset-required": "Please reset your password before signing in for the first time.",
  CredentialsSignin: "Invalid email or password.",
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.CredentialsSignin);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Signing in..." : "Log in"}
      </button>

      <a href="/request-password-reset" className="block text-center text-sm text-blue-600 hover:underline">
        Forgot your password?
      </a>
    </form>
  );
}
