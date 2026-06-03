import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground">
        <p className="text-sm font-medium text-primary">Account recovery</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Send a Supabase Auth password reset link to your email.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
