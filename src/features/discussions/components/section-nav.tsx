"use client";

import { useState, useEffect, useMemo } from "react";
import { HelpCircle, GitBranch, FileText, MessageSquare } from "lucide-react";

interface SectionNavProps {
  questionCount: number;
  claimCount: number;
  evidenceCount: number;
  contributionCount: number;
  activeSection?: string;
  onSelectSection?: (sectionId: string) => void;
}

export function SectionNav({
  questionCount,
  claimCount,
  evidenceCount,
  contributionCount,
  activeSection: externalActiveSection,
  onSelectSection,
}: SectionNavProps) {
  const [internalActiveSection, setInternalActiveSection] = useState("questions");
  const activeSection = externalActiveSection || internalActiveSection;

  const sections = useMemo(
    () => [
      { id: "questions", label: "Questions", count: questionCount, icon: HelpCircle },
      { id: "claims", label: "Claims", count: claimCount, icon: GitBranch },
      { id: "evidence", label: "Evidence Bank", count: evidenceCount, icon: FileText },
      { id: "contributions", label: "Contributions", count: contributionCount, icon: MessageSquare },
    ],
    [questionCount, claimCount, evidenceCount, contributionCount]
  );

  // Observe active section on scroll
  useEffect(() => {
    if (externalActiveSection) return;

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    };

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInternalActiveSection(entry.target.id);
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [externalActiveSection, sections]);

  const handleNavClick = (sectionId: string) => {
    setInternalActiveSection(sectionId);
    onSelectSection?.(sectionId);

    const targetEl = document.getElementById(sectionId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      aria-label="Discussion navigation sections"
      className="sticky top-0 z-30 rounded-xl border border-border/80 bg-background/90 p-1.5 backdrop-blur-md shadow-md"
    >
      <div role="tablist" className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              role="tab"
              id={`tab-${sec.id}`}
              aria-selected={isActive}
              aria-controls={sec.id}
              onClick={() => handleNavClick(sec.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{sec.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {sec.count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
