"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Shield, Users, HelpCircle, ArrowLeft, AlertTriangle } from "lucide-react";

const LEGAL_TABS = [
  { href: "/terms", label: "Terms of Service", icon: FileText },
  { href: "/privacy", label: "Privacy Policy", icon: Shield },
  { href: "/guidelines", label: "Community Guidelines", icon: Users },
  { href: "/grievance", label: "Grievance Redressal", icon: HelpCircle },
] as const;

export default function LegalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-background text-foreground">
      {/* Top Banner & Header Shell */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Back link & Category Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <Link
              href="/about"
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to About Discora</span>
            </Link>

            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              Legal & Epistemic Governance
            </span>
          </div>

          <div className="space-y-1 pb-6">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Discora Governance & Policies
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Foundational terms, privacy frameworks, community standards, and statutory grievance mechanisms
              governing participation in the Discora structured discourse platform.
            </p>
          </div>

          {/* Tab Navigation */}
          <nav
            aria-label="Legal Document Navigation"
            className="flex items-center gap-1 overflow-x-auto border-b border-border/40 pb-px -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {LEGAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-accent/40 text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/20 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Draft Notice Banner */}
      <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-start gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="text-xs text-amber-950 dark:text-amber-200 space-y-0.5">
            <p className="font-semibold tracking-tight uppercase text-[11px]">
              Draft Status: For Internal & Legal Review Only (Version 0.1-Beta)
            </p>
            <p className="text-amber-900/80 dark:text-amber-300/80">
              These documents are technical and regulatory drafts prepared for Public Beta readiness. Operator-dependent
              identities and addresses are marked with placeholders pending formal deployment.
            </p>
          </div>
        </div>
      </div>

      {/* Main Document Body */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border/60 bg-card/30 p-6 sm:p-10 shadow-xs backdrop-blur-xs">
          {children}
        </div>
      </main>

      {/* Legal Footer */}
      <footer className="border-t border-border/50 py-8 px-4 text-center text-xs text-muted-foreground sm:px-6">
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {LEGAL_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="hover:text-foreground transition-colors"
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <p className="text-muted-foreground/60">
            © {new Date().getFullYear()} Discora Platform · Epistemic Discourse & Understanding
          </p>
        </div>
      </footer>
    </div>
  );
}
