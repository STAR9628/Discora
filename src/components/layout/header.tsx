export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Discora</p>
          <p className="text-xs text-muted-foreground">Foundation shell</p>
        </div>
        <div className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">
          Dark mode
        </div>
      </div>
    </header>
  );
}
