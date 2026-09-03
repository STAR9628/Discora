import { FileText, Award, HelpCircle, AlertCircle, ArrowRight, Swords, Shield } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/date";
import type { ContributionTimelineItem } from "../types";

interface ContributionTimelineProps {
  items: ContributionTimelineItem[];
  maxItems?: number;
}

const timelineIcons: Record<string, typeof Award> = {
  claim: Award,
  evidence: FileText,
  question: HelpCircle,
  debate: Award,
  side_switch: ArrowRight,
};

const timelineLabels: Record<string, string> = {
  claim: "Claim",
  evidence: "Evidence",
  question: "Question",
  debate: "Debate",
  side_switch: "Side Switch",
};

export function ContributionTimeline({ items, maxItems = 20 }: ContributionTimelineProps) {
  const display = items.slice(0, maxItems);

  if (display.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No contributions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {display.map((item, idx) => {
        const Icon = timelineIcons[item.type];
        const isLast = idx === display.length - 1;
        return (
          <div key={`${item.type}-${item.id}`} className="relative flex gap-3 pl-6">
            {!isLast && (
              <div className="absolute left-[11px] top-5 bottom-0 w-px bg-border" />
            )}
            <div className={`absolute left-1.5 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${
              item.isRetracted
                ? "border-red-500/30 bg-red-500/10"
                : "border-primary/20 bg-primary/5"
            }`}>
              <Icon className={`h-[10px] w-[10px] ${
                item.isRetracted ? "text-red-400" : "text-primary/70"
              }`} />
            </div>
            <div className={`pb-3 min-w-0 flex-1 ${item.isRetracted ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-0.5">
                <span className={`rounded px-1 py-px font-semibold uppercase ${
                  item.type === "claim" ? "bg-amber-500/10 text-amber-400" :
                  item.type === "evidence" ? "bg-emerald-500/10 text-emerald-400" :
                  item.type === "side_switch" ? "bg-amber-500/10 text-amber-400" :
                  "bg-sky-500/10 text-sky-400"
                }`}>
                  {timelineLabels[item.type]}
                </span>
                <span>{formatDate(item.createdAt)}</span>
                {item.isRetracted && (
                  <span className="flex items-center gap-0.5 text-red-400">
                    <AlertCircle className="h-2.5 w-2.5" /> Retracted
                  </span>
                )}
              </div>
              {item.type === "side_switch" ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="flex items-center gap-1 font-bold text-blue-400">
                    {item.previousSide === "proposition" ? <Swords className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {item.previousSide === "proposition" ? "Support" : "Challenge"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="flex items-center gap-1 font-bold text-rose-400">
                    {item.newSide === "proposition" ? <Swords className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {item.newSide === "proposition" ? "Support" : "Challenge"}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{item.content}</p>
              )}
              <Link
                href={`/discussions/${item.roomSlug}`}
                className="text-[10px] text-primary/60 hover:text-primary transition-colors mt-0.5 inline-block"
              >
                in {item.roomTitle}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
