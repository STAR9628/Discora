"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, MessageSquare, Scale } from "lucide-react";

// ─── Section metadata for smart presentation navigation ───────────────────────
const SECTIONS = [
  { id: "section-hero", label: "Overview" },
  { id: "section-problem", label: "The Problem" },
  { id: "section-why", label: "Why Discora Exists" },
  { id: "section-conversation", label: "Conversation" },
  { id: "section-understanding", label: "Understanding Layer" },
  { id: "section-evidence", label: "Evidence" },
  { id: "section-philosophy", label: "Philosophy" },
  { id: "section-ai", label: "AI & Technology" },
  { id: "section-vision", label: "Closing Vision" },
] as const;

// ─── Utility: intersection observer hook for reveal animations ───────────────
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

// ─── Animated conversation demo ───────────────────────────────────────────────
const DEMO_MESSAGES = [
  {
    id: 1,
    side: "left",
    text: "The evidence on this is actually pretty clear.",
    delay: 0,
    type: "message",
  },
  {
    id: 2,
    side: "right",
    text: "I'd push back on that. Which evidence specifically?",
    delay: 700,
    type: "message",
  },
  {
    id: 3,
    side: "left",
    text: "A published study is cited as evidence.",
    delay: 1400,
    type: "message",
  },
  {
    id: 4,
    side: "left",
    text: "AI systems trained on human feedback tend to overfit to evaluator preferences.",
    delay: 2200,
    type: "claim",
    label: "CLAIM",
  },
] as const;

function ConversationDemo() {
  const { ref, inView } = useInView();
  const [visible, setVisible] = useState<number[]>([]);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!inView) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timers: ReturnType<typeof setTimeout>[] = [];

    DEMO_MESSAGES.forEach((msg) => {
      const timer = setTimeout(
        () => {
          setVisible((prev) => [...prev, msg.id]);
        },
        prefersReduced ? 0 : msg.delay
      );
      timers.push(timer);
    });

    timerRefs.current = timers;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [inView]);

  return (
    <div ref={ref} className="py-4">
      <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Discussion excerpt
        </span>
        <span className="rounded bg-muted/70 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/80 uppercase">
          Illustrative example
        </span>
      </div>

      <div className="space-y-3">
        {DEMO_MESSAGES.map((msg) => {
          const isVisible = visible.includes(msg.id);
          const isRight = msg.side === "right";
          const isClaim = msg.type === "claim";

          return (
            <div
              key={msg.id}
              className={`flex transition-all duration-500 ${
                isRight ? "justify-end" : "justify-start"
              } ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-3"
              }`}
              style={{ transitionDelay: isVisible ? "0ms" : undefined }}
            >
              {isClaim ? (
                <div className="max-w-[85%] rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                      {msg.label}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {msg.text}
                  </p>
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                    isRight
                      ? "rounded-tr-xs bg-card/90 border border-border/70 text-foreground"
                      : "rounded-tl-xs bg-card/65 border border-border/50 text-foreground/90"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Structure diagram ─────────────────────────────────────────────────────────
const STRUCTURE_STEPS = [
  {
    label: "Message",
    color: "text-foreground/90",
    dotColor: "bg-muted-foreground/70 ring-2 ring-muted/80",
    badge: "bg-muted/70 text-foreground/80 border-border/70",
    desc: "Conversation starts naturally in standard conversational flow",
  },
  {
    label: "Claim",
    color: "text-blue-400",
    dotColor: "bg-blue-400 ring-2 ring-blue-500/20",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    desc: "A meaningful statement is formalized for focused examination",
  },
  {
    label: "Evidence",
    color: "text-teal-400",
    dotColor: "bg-teal-400 ring-2 ring-teal-500/20",
    badge: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    desc: "Supporting, contradicting & contextual sources attached",
  },
  {
    label: "Arguments",
    color: "text-violet-400",
    dotColor: "bg-violet-400 ring-2 ring-violet-500/20",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    desc: "Reasoned positions formed on both sides of a claim",
  },
  {
    label: "Targeted Inquiries",
    color: "text-amber-400",
    dotColor: "bg-amber-400 ring-2 ring-amber-500/20",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    desc: "Specific questions aimed at clarifying or testing the claim",
  },
  {
    label: "State of Understanding",
    color: "text-primary",
    dotColor: "bg-primary ring-2 ring-primary/30",
    badge: "bg-primary/10 text-primary border-primary/30",
    desc: "Deterministic summary of what can be learned from the discussion",
  },
] as const;

function StructureDiagram() {
  const { ref, inView } = useInView();

  return (
    <div ref={ref} className="relative ml-2 sm:ml-4">
      {/* Vertical connector line */}
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border/60" />

      <div className="space-y-4">
        {STRUCTURE_STEPS.map((step, i) => (
          <div
            key={step.label}
            className={`relative flex items-start gap-4 transition-all duration-500 ${
              inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
            }`}
            style={{
              transitionDelay: inView ? `${i * 90}ms` : undefined,
            }}
          >
            {/* Dot */}
            <div
              className={`relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full transition-all ${step.dotColor}`}
            />
            <div className="flex-1 rounded-xl border border-border/50 bg-card/40 px-3.5 py-2.5 sm:px-4 sm:py-3 transition-colors hover:border-border/80">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold tracking-tight ${step.color}`}>
                  {step.label}
                </p>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider border ${step.badge}`}>
                  Layer {i + 1}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Evidence types demo (Neutral epistemic palette) ───────────────────────────
const EVIDENCE_TYPES = [
  {
    label: "Supporting",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    desc: "Studies, data, and sources that strengthen the claim",
    dot: "bg-blue-400",
  },
  {
    label: "Contradicting",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    desc: "Evidence that challenges or refutes the claim",
    dot: "bg-amber-400",
  },
  {
    label: "Contextual",
    badge: "bg-muted/70 text-muted-foreground border-border/80",
    desc: "Background information that frames the discussion",
    dot: "bg-muted-foreground/60",
  },
] as const;

function EvidenceDemo() {
  const { ref, inView } = useInView();

  return (
    <div ref={ref} className="space-y-3">
      {EVIDENCE_TYPES.map((ev, i) => (
        <div
          key={ev.label}
          className={`flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4 transition-all duration-500 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: inView ? `${i * 120}ms` : undefined }}
        >
          <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ev.dot}`} />
          <div>
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ev.badge}`}
            >
              {ev.label}
            </span>
            <p className="mt-1.5 text-sm text-muted-foreground">{ev.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper with reveal animation ────────────────────────────────────
function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const { ref, inView } = useInView();

  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-700 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AboutPageClient() {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Scroll tracking to determine active section in presentation flow
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY < 80) {
            setActiveSectionIndex(0);
            ticking = false;
            return;
          }

          for (let i = SECTIONS.length - 1; i >= 0; i--) {
            const el = document.getElementById(SECTIONS[i].id);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= 200) {
                setActiveSectionIndex(i);
                break;
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const target = SECTIONS[index];
    if (!target) return;
    const el = document.getElementById(target.id);
    if (!el) return;

    setActiveSectionIndex(index);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    el.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const isLastSection = activeSectionIndex >= SECTIONS.length - 1;

  const handleNextClick = () => {
    if (isLastSection) {
      scrollToSection(0);
    } else {
      scrollToSection(activeSectionIndex + 1);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── SMART PRESENTATION NAVIGATION CONTROL ───────────────────────────── */}
      <div
        className="fixed bottom-20 md:bottom-8 right-5 md:right-8 z-20 flex items-center"
        role="navigation"
        aria-label="Section presentation navigation"
      >
        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3.5 py-1.5 shadow-lg backdrop-blur-md transition-all hover:border-border">
          <span
            className="text-[11px] font-semibold text-muted-foreground/70 tabular-nums select-none"
            title={`Section ${activeSectionIndex + 1} of ${SECTIONS.length}: ${SECTIONS[activeSectionIndex]?.label}`}
          >
            {String(activeSectionIndex + 1).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
          </span>
          <span className="h-3 w-px bg-border/60" aria-hidden="true" />
          <button
            type="button"
            onClick={handleNextClick}
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm cursor-pointer"
            aria-label={
              isLastSection
                ? "Back to beginning of presentation"
                : `Navigate to next section: ${SECTIONS[activeSectionIndex + 1]?.label}`
            }
          >
            <span>{isLastSection ? "Top" : "Next"}</span>
            {isLastSection ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ── SECTION 0: HERO ─────────────────────────────────────────────────── */}
      <div
        id="section-hero"
        className="relative border-b border-border/50 px-4 py-20 text-center sm:px-6 sm:py-28 md:py-36 scroll-mt-20"
      >
        {/* Subtle radial gradient backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
            style={{
              background:
                "radial-gradient(circle, #60a5fa 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-2xl">
          {/* Wordmark */}
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <Image
              src="/discora-mark.png"
              alt="Discora"
              width={48}
              height={48}
              className="h-11 w-11 sm:h-12 sm:w-12 shrink-0"
              priority
            />
            <span className="text-2xl font-bold tracking-tight text-foreground">Discora</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Discussion built for{" "}
            <span className="text-primary">understanding</span>, not engagement
          </h1>

          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Online conversations move fast and rarely go anywhere. Discora
            provides a structured environment where ideas can be examined,
            challenged, and understood — without turning disagreement into
            conflict.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/discussions"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Browse discussions
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-border/80 bg-card/60 px-5 py-2.5 text-sm font-semibold text-foreground/90 shadow-xs transition-colors hover:border-border hover:bg-card hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Join Discora
            </Link>
          </div>
        </div>
      </div>

      {/* ── CONTENT SECTIONS ────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl space-y-24 px-4 py-20 sm:px-6 sm:py-28">

        {/* SECTION 1 — The problem */}
        <Section id="section-problem" className="scroll-mt-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            The problem
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Most discussions go nowhere
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Platforms optimized for engagement tend to reward speed, emotion,
            and reaction — not careful reasoning. Important conversations get
            buried under replies. Evidence competes with opinion without any
            structure to separate them. Disagreements become tribal because
            there&apos;s no mechanism to actually examine what each side is
            claiming.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Popularity can override good evidence. Loud voices can drown out
            careful ones. People often end up talking past each other, and
            questions that deserve careful examination get reduced to reactions.
          </p>
        </Section>

        {/* SECTION 2 — Why Discora exists */}
        <Section id="section-why" className="scroll-mt-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Why Discora exists
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What if disagreement could be structured without removing the
            freedom to disagree?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Discora doesn&apos;t try to prevent conflict or enforce consensus.
            It provides a layer of structure that makes the content of a
            discussion easier to examine. Conversation remains natural. But
            when a statement deserves scrutiny, it can be formalized. Evidence
            can be attached. Questions can be asked specifically.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            The goal is not to determine who is right. The goal is to make it
            easier to understand what each side is actually claiming, what
            evidence exists, and what questions remain open.
          </p>
        </Section>

        {/* SECTION 3 — The conversation */}
        <Section id="section-conversation" className="scroll-mt-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            How it works
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            It starts with conversation
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Discora begins where every discussion begins — with messages.
            Participants can read, write, reply, and react in a familiar
            conversational flow. The interface feels like a collaborative
            space, not an academic database.
          </p>
          <p className="mt-4 mb-6 text-base leading-relaxed text-muted-foreground">
            When a message contains a meaningful statement worth examining
            closely, it can be formalized as a{" "}
            <span className="font-medium text-blue-400">Claim</span> — a
            distinct contribution that others can then evaluate with evidence
            and arguments.
          </p>

          <div className="rounded-2xl border border-border/50 bg-card/30 px-4 py-2 sm:px-6">
            <ConversationDemo />
          </div>

          <p className="mt-4 text-sm text-muted-foreground/70 text-center">
            A normal message becomes a Claim when participants want to examine
            it more carefully.
          </p>
        </Section>

        {/* SECTION 4 — Structure */}
        <Section id="section-understanding" className="scroll-mt-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            The understanding layer
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            From conversation to understanding
          </h2>
          <p className="mt-4 mb-8 text-base leading-relaxed text-muted-foreground">
            Structure is added progressively, only when it helps. Not every
            message becomes a Claim. Not every Claim needs extensive evidence.
            Discora reveals depth when participants choose to go deeper.
          </p>

          <div className="rounded-2xl border border-border/50 bg-card/30 p-6 sm:p-8">
            <StructureDiagram />
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            The{" "}
            <span className="font-medium text-primary">
              State of Understanding
            </span>{" "}
            is a deterministic summary of what can be reasonably concluded from
            a discussion at any point. It reflects the evidence and arguments
            submitted — not a popularity vote, not an AI verdict, not a
            consensus score.
          </p>

          {/* Two Formats: Discussions vs Debates */}
          <div className="mt-8 pt-8 border-t border-border/40 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Two formats for different kinds of inquiry
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Discora organizes discourse into two distinct room architectures
              depending on whether an inquiry is open-ended or centered on a
              specific proposition.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Discussions Card */}
              <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400 border border-blue-500/20">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">
                    Discussions
                  </h4>
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                    Collaborative Inquiry
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Open-ended, collaborative exploration of multifaceted topics.
                  Questions remain open, allowing participants to develop claims,
                  evidence, arguments, and follow-up questions to deepen shared
                  understanding.
                </p>
                <div className="text-[11px] text-muted-foreground/80 space-y-1 pt-2 border-t border-border/30">
                  <div>• Questions remain open-ended and exploratory</div>
                  <div>• Participants build claims and evidence collaboratively</div>
                  <div>• Goal: deepen understanding without forced conclusions</div>
                </div>
              </div>

              {/* Debates Card */}
              <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400 border border-amber-500/20">
                    <Scale className="h-4 w-4" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">
                    Debates
                  </h4>
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                    Structured Deliberation
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Structured examination of a defined motion with Proposition
                  and Opposition sides. Claims and evidence are evaluated within
                  the structure, and participants may change positions when
                  stronger evidence warrants it.
                </p>
                <div className="text-[11px] text-muted-foreground/80 space-y-1 pt-2 border-t border-border/30">
                  <div>• Structured deliberation around a defined motion</div>
                  <div>• Switching sides reflects intellectual integrity, not loss</div>
                  <div>• No winners, losers, scorecards, or rhetorical point-scoring</div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* SECTION 5 — Evidence */}
        <Section id="section-evidence" className="scroll-mt-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Evidence
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Supporting information, made visible
          </h2>
          <p className="mt-4 mb-8 text-base leading-relaxed text-muted-foreground">
            Discora makes evidence visible and organized around specific
            Claims. It doesn&apos;t determine which evidence is true — that
            remains for participants to evaluate. But it makes it possible to
            see what evidence exists, what direction it points, and what remains
            unaddressed.
          </p>

          <EvidenceDemo />
        </Section>

        {/* SECTION 6 — Disagreement is not failure */}
        <Section id="section-philosophy" className="scroll-mt-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Philosophy
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Changing your mind is not losing
          </h2>
          <div className="mt-6 space-y-6">
            <div className="flex gap-4">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <p className="text-base leading-relaxed text-muted-foreground">
                You can disagree with someone without them being an enemy.
                Discora is built on the assumption that people can hold
                different views in good faith.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <p className="text-base leading-relaxed text-muted-foreground">
                You can challenge an idea without attacking the person who
                holds it. The structure of Discora keeps arguments directed at
                Claims and Evidence, not at people.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <p className="text-base leading-relaxed text-muted-foreground">
                You can encounter evidence that changes your view, and that is
                not a sign of weakness. It is what careful thinking looks like.
                Discora does not penalize updated positions.
              </p>
            </div>
          </div>
        </Section>

        {/* SECTION 7 — AI's role */}
        <Section id="section-ai" className="scroll-mt-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            AI & Technology
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What AI does — and does not — do
          </h2>

          {/* Explicit Beta Availability Disclosure */}
          <div className="mt-4 rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/90">Planned functionality:</span>{" "}
            AI assistance is planned for future updates. These capabilities are not yet available in the current beta.
          </div>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            In future updates, AI can help Discora organize information, surface relationships
            between claims and evidence, summarize long discussions, and help
            participants navigate complex threads. These are comprehension tools designed
            to support human examination.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-400">
                AI can help with (Planned)
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">→</span> Organizing and
                  summarizing information
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">→</span> Surfacing
                  connections between contributions
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">→</span> Helping navigate
                  complex threads
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">
                AI does not (Boundaries)
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-amber-400/80 font-bold">×</span> Decide what is true
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400/80 font-bold">×</span> Decide who is right
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400/80 font-bold">×</span> Enforce ideological
                  or political conclusions
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Humans remain responsible for their own judgment. Discora
            facilitates examination — it does not manufacture conclusions.
          </p>
        </Section>

        {/* SECTION 8 — Closing Vision */}
        <Section id="section-vision" className="border-t border-border/50 pt-16 scroll-mt-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Not a place to win arguments.
              <br />
              <span className="text-primary">A place to understand them.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Discora is being built for beta. The epistemic engine, discussion
              rooms, debate rooms, evidence architecture, and structured inquiry
              system are functional. We believe better conversation is possible
              — and we&apos;re building the environment for it.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/discussions"
                className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Enter a discussion
              </Link>
              <Link
                href="/debates"
                className="rounded-lg border border-border/60 px-6 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:border-border hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Browse debates
              </Link>
            </div>

            <div className="mt-4 flex justify-center">
              <Link
                href="/"
                className="text-xs font-medium text-muted-foreground/60 hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Explore Platform Overview
              </Link>
            </div>
          </div>
        </Section>

        {/* Contact */}
        <Section>
          <div className="rounded-2xl border border-border/40 bg-card/20 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Questions or feedback?{" "}
              <a
                href="mailto:hello@discora.com"
                className="font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
              >
                hello@discora.com
              </a>
            </p>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8 text-center sm:px-6 space-y-3">
        <nav aria-label="Legal and policy links" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/guidelines" className="hover:text-foreground transition-colors">
            Community Guidelines
          </Link>
          <Link href="/grievance" className="hover:text-foreground transition-colors">
            Grievance Redressal
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} Discora · Structured discussion &
          debate
        </p>
      </footer>
    </div>
  );
}
