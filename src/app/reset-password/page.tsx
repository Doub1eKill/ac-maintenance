import { ResetPasswordForm } from "./reset-password-form";

// Server Component: reads the token straight out of the URL server-side,
// the form itself is the only part that needs client interactivity.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <p className="text-sm text-red-800">Missing reset token.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Set a new password</h1>
      <ResetPasswordForm token={token} />
    </main>
  );
}
