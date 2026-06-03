export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground">
        <p className="text-sm font-medium text-primary">Discora Foundation</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Structured discourse starts here.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Sprint 1 establishes the application shell, theme, shared types, and
          service foundations. Product workflows will begin in later sprints.
        </p>
      </section>
    </main>
  );
}
