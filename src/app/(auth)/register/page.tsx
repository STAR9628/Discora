import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground">
        <p className="text-sm font-medium text-primary">Account access</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">Register</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Create an account. You will receive a verification email — click the link to activate your account and get started.
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
