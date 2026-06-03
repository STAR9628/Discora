import { AuthStatus } from "@/features/auth/components/auth-status";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Discora</p>
          <p className="text-xs text-muted-foreground">Authentication foundation</p>
        </div>
        <AuthStatus />
      </div>
    </header>
  );
}
