import type { DiscussionClaim, DiscussionEvidence, DiscussionQuestion } from "@/features/discussions/types";

export interface UserContributions {
  claims: DiscussionClaim[];
  evidence: DiscussionEvidence[];
  questions: DiscussionQuestion[];
  discussionCount: number;
  debateCount: number;
  debateParticipations: string[];
  debateWins: number;
  debateLosses: number;
  evidenceAgreeCount: number;
  evidenceDisagreeCount: number;
}

export interface ReputationOptions {
  claimCreatedWeight: number;
  evidenceSubmittedWeight: number;
  questionAskedWeight: number;
  highConsensusBonus: number;
  agreeVoteMultiplier: number;
  disagreeVotePenalty: number;
  retractedClaimPenalty: number;
  retractedEvidencePenalty: number;
  debateCreatedWeight: number;
  debateJoinedWeight: number;
  debateWonWeight: number;
  debateLostPenalty: number;
  evidenceApprovedWeight: number;
  evidenceDisputedPenalty: number;
}

export interface ReputationScore {
  overall: number;
  positiveScore: number;
  negativeScore: number;
  factors: ReputationFactor[];
  options: ReputationOptions;
}

export interface ReputationFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface ClaimCredibility {
  score: number;
  level: "high" | "medium" | "low";
  factors: {
    evidenceCount: number;
    evidenceQuality: number;
    supportRatio: number;
    contradictionRatio: number;
    authorReputation: number;
  };
}

export interface ExpertiseArea {
  name: string;
  score: number;
}

export interface TrustBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export interface ReputationSnapshot {
  id: string;
  userId: string;
  score: number;
  expertise: ExpertiseArea[];
  createdAt: string;
}

export interface ContributionTimelineItem {
  id: string;
  type: "claim" | "evidence" | "question" | "debate" | "side_switch";
  content: string;
  roomTitle: string;
  roomSlug: string;
  createdAt: string;
  isRetracted: boolean;
  previousSide?: "proposition" | "opposition";
  newSide?: "proposition" | "opposition";
}

export interface BadgeProgress {
  badgeId: string;
  badgeName: string;
  description: string;
  icon: string;
  current: number;
  required: number;
  progress: number;
  earned: boolean;
}

export interface ReputationTrend {
  current: number;
  previous: number;
  direction: "up" | "down" | "stable";
  change: number;
  sampleSize: number;
}

export interface ExpertiseBreakdown {
  area: string;
  score: number;
  contributions: {
    claims: number;
    evidence: number;
    questions: number;
  };
}
