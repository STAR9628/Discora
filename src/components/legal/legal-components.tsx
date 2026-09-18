import type { ReactNode } from "react";

export function OperatorPlaceholder({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] sm:text-xs font-medium text-muted-foreground border border-border/70 break-all">
      {children}
    </span>
  );
}

export function LegalCallout({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warning" | "caution";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    info: "border-primary/30 bg-primary/5 text-foreground",
    warning: "border-amber-500/30 bg-amber-500/5 text-foreground",
    caution: "border-destructive/30 bg-destructive/5 text-foreground",
  }[type];

  return (
    <div className={`my-6 rounded-xl border p-4 sm:p-5 text-xs sm:text-sm space-y-1.5 ${styles}`}>
      {title && <h4 className="font-semibold tracking-tight">{title}</h4>}
      <div className="leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function ResponsiveTable({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-border/60 bg-card/40">
      <div className="min-w-[540px]">{children}</div>
    </div>
  );
}
