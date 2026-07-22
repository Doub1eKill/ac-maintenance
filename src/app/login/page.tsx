import { LoginForm } from "@/components/login-form";

// Server Component: this page itself has no interactivity, only the form
// (which needs onSubmit/useState) is a Client Component.
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Log in</h1>
      <LoginForm />
    </main>
  );
}
