"use client";

import { Check, Compass, MessageSquare, Scale, Sparkles } from "lucide-react";
import type { ExplorationTopicId, PreferredFormat } from "../types";

interface ExplorationInterestSelectorProps {
  selectedTopics: ExplorationTopicId[];
  preferredFormat: PreferredFormat;
  onToggleTopic: (topic: ExplorationTopicId) => void;
  onSelectFormat: (format: PreferredFormat) => void;
}

const TOPICS: {
  id: ExplorationTopicId;
  title: string;
  badge: string;
  description: string;
}[] = [
  {
    id: "ai_tech",
    title: "AI & Technology",
    badge: "Tech",
    description: "Autonomous agents, compute scaling, algorithmic ethics, and cognitive systems.",
  },
  {
    id: "science_climate",
    title: "Science & Climate",
    badge: "Science",
    description: "Grid decarbonization, biotech, complex systems, and empirical discoveries.",
  },
  {
    id: "philosophy_ethics",
    title: "Philosophy & Epistemology",
    badge: "Philosophy",
    description: "Reasoning models, consciousness, rational inquiry, and ethical frameworks.",
  },
  {
    id: "society_governance",
    title: "Society & Governance",
    badge: "Policy",
    description: "Institutional architecture, economic coordination, and deliberative systems.",
  },
];

const FORMAT_OPTIONS: {
  id: PreferredFormat;
  label: string;
  description: string;
  icon: typeof MessageSquare;
}[] = [
  {
    id: "both",
    label: "Both Formats",
    description: "Explore both collaborative discussions and formal proposition/opposition debates.",
    icon: Compass,
  },
  {
    id: "discussion",
    label: "Discussions First",
    description: "Collaborative inquiry: exploring questions, extracting claims, and collecting evidence.",
    icon: MessageSquare,
  },
  {
    id: "debate",
    label: "Debates First",
    description: "Structured deliberation: evaluating proposition vs. opposition arguments around a motion.",
    icon: Scale,
  },
];

export function ExplorationInterestSelector({
  selectedTopics,
  preferredFormat,
  onToggleTopic,
  onSelectFormat,
}: ExplorationInterestSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Guiding Principle Header */}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <span>Personalize Your Exploration</span>
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tell us what domains and discourse formats interest you. Discora personalizes where you
          explore, never your beliefs, worldview, or political stances.
        </p>
      </div>

      {/* Topics Selection Grid */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          Topics of Interest
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TOPICS.map((topic) => {
            const isSelected = selectedTopics.includes(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onToggleTopic(topic.id)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-transparent"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{topic.title}</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                      {topic.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {topic.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format Preference Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          Preferred Discourse Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {FORMAT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = preferredFormat === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectFormat(opt.id)}
                className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{opt.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ethical Guarantee Note */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>
          These preferences are stored privately on your device to guide suggestions. We never profile
          or monetize your identity.
        </span>
      </div>
    </div>
  );
}
