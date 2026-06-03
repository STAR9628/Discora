import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground">
        <p className="text-sm font-medium text-primary">Account access</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">Login</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Access your Discora account through Supabase Auth.
        </p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
