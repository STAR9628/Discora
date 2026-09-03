import { Shield, Award } from "lucide-react";
import Link from "next/link";
import type { ExpertiseArea, ReputationScore, TrustBadge } from "../types";

interface AuthorTrustSignalProps {
  userId: string | null;
  username: string | null;
  reputationScore?: number;
  reputation?: ReputationScore;
  expertise?: ExpertiseArea[];
  badges?: TrustBadge[];
  compact?: boolean;
}

export function AuthorTrustSignal({ userId, username, reputationScore, reputation, expertise, badges, compact }: AuthorTrustSignalProps) {
  if (!userId || !username) return null;

  const earnedBadges = badges?.filter((b) => b.earned) || [];
  const topExpertise = expertise && expertise.length > 0 ? expertise[0].name : null;
  const score = reputationScore ?? reputation?.overall;

  return (
    <Link
      href={`/u/${username}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-card/30 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-all cursor-pointer"
      title={`View ${username}'s profile`}
    >
      <Shield className="h-3 w-3 text-primary/70" />
      {score !== undefined && (
        <span className="font-mono font-semibold">{score}</span>
      )}
      {topExpertise && !compact && (
        <>
          <span className="text-muted-foreground/40">|</span>
          <Award className="h-2.5 w-2.5 text-amber-400" />
          <span className="text-[9px]">{topExpertise}</span>
        </>
      )}
      {earnedBadges.length > 0 && !compact && (
        <>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-[9px]">{earnedBadges.length} badge{earnedBadges.length !== 1 ? "s" : ""}</span>
        </>
      )}
    </Link>
  );
}
