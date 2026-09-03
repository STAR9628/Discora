import type { DiscussionClaim } from "@/features/discussions/types";
import type { BadgeProgress, ClaimCredibility, ExpertiseArea, ExpertiseBreakdown, ReputationOptions, ReputationFactor, ReputationScore, ReputationSnapshot, ReputationTrend, TrustBadge, UserContributions } from "./types";

const DEFAULT_OPTIONS: ReputationOptions = {
  claimCreatedWeight: 10,
  evidenceSubmittedWeight: 15,
  questionAskedWeight: 5,
  highConsensusBonus: 5,
  agreeVoteMultiplier: 2,
  disagreeVotePenalty: 1,
  retractedClaimPenalty: 20,
  retractedEvidencePenalty: 15,
  debateCreatedWeight: 15,
  debateJoinedWeight: 5,
  debateWonWeight: 25,
  debateLostPenalty: 5,
  evidenceApprovedWeight: 2,
  evidenceDisputedPenalty: 1,
};

export function computeReputation(
  contributions: UserContributions,
  options?: Partial<ReputationOptions>,
): ReputationScore {
  const opts: ReputationOptions = { ...DEFAULT_OPTIONS, ...options };
  const factors: ReputationFactor[] = [];
  let positiveScore = 0;
  let negativeScore = 0;

  const claims = contributions.claims.filter((c) => !c.isRetracted);
  const retractedClaims = contributions.claims.filter((c) => c.isRetracted);
  const evidence = contributions.evidence.filter((e) => !e.isRetracted);
  const retractedEvidence = contributions.evidence.filter((e) => e.isRetracted);
  const questions = contributions.questions.filter((q) => !q.isRetracted);

  const claimCreatedScore = claims.length * opts.claimCreatedWeight;
  factors.push({ name: "Claims Created", value: claims.length, weight: opts.claimCreatedWeight, contribution: claimCreatedScore });
  positiveScore += claimCreatedScore;

  const evidenceScore = evidence.length * opts.evidenceSubmittedWeight;
  factors.push({ name: "Evidence Submitted", value: evidence.length, weight: opts.evidenceSubmittedWeight, contribution: evidenceScore });
  positiveScore += evidenceScore;

  const questionScore = questions.length * opts.questionAskedWeight;
  factors.push({ name: "Questions Asked", value: questions.length, weight: opts.questionAskedWeight, contribution: questionScore });
  positiveScore += questionScore;

  const debateCreatedScore = contributions.debateCount > 0 ? contributions.debateCount * opts.debateCreatedWeight : 0;
  if (debateCreatedScore > 0) {
    factors.push({ name: "Debates Created", value: contributions.debateCount, weight: opts.debateCreatedWeight, contribution: debateCreatedScore });
    positiveScore += debateCreatedScore;
  }

  const debateJoinedScore = contributions.debateParticipations.length * opts.debateJoinedWeight;
  if (debateJoinedScore > 0) {
    factors.push({ name: "Debates Joined", value: contributions.debateParticipations.length, weight: opts.debateJoinedWeight, contribution: debateJoinedScore });
    positiveScore += debateJoinedScore;
  }

  const debateWonScore = contributions.debateWins * opts.debateWonWeight;
  if (debateWonScore > 0) {
    factors.push({ name: "Debates Won", value: contributions.debateWins, weight: opts.debateWonWeight, contribution: debateWonScore });
    positiveScore += debateWonScore;
  }

  if (contributions.debateLosses > 0) {
    const debateLostPenalty = contributions.debateLosses * opts.debateLostPenalty;
    negativeScore += debateLostPenalty;
    factors.push({ name: "Debates Lost", value: contributions.debateLosses, weight: opts.debateLostPenalty, contribution: -debateLostPenalty });
  }

  let consensusBonus = 0;
  for (const c of claims) {
    if (c.agreeCount && c.disagreeCount !== undefined) {
      const total = c.agreeCount + c.disagreeCount;
      if (total > 0) {
        const ratio = c.agreeCount / total;
        if (ratio > 0.6) {
          const bonus = Math.round((ratio - 0.6) * 10 * opts.highConsensusBonus);
          consensusBonus += bonus;
        }
      }
    }
  }
  if (consensusBonus > 0) {
    factors.push({ name: "High Consensus Bonus", value: consensusBonus, weight: 1, contribution: consensusBonus });
    positiveScore += consensusBonus;
  }

  let voteBonus = 0;
  for (const c of claims) {
    if (c.agreeCount && c.disagreeCount !== undefined) {
      if (c.agreeCount > c.disagreeCount) {
        const net = c.agreeCount - c.disagreeCount;
        voteBonus += net * opts.agreeVoteMultiplier;
      } else if (c.disagreeCount > c.agreeCount) {
        const net = c.disagreeCount - c.agreeCount;
        negativeScore += net * opts.disagreeVotePenalty;
      }
    }
  }
  if (voteBonus > 0) {
    factors.push({ name: "Agreement Votes Received", value: voteBonus, weight: 1, contribution: voteBonus });
    positiveScore += voteBonus;
  }

  // Evidence vote quality
  let evidenceVoteBonus = 0;
  if (contributions.evidenceAgreeCount > contributions.evidenceDisagreeCount) {
    const net = contributions.evidenceAgreeCount - contributions.evidenceDisagreeCount;
    evidenceVoteBonus += net * opts.evidenceApprovedWeight;
  } else if (contributions.evidenceDisagreeCount > contributions.evidenceAgreeCount) {
    const net = contributions.evidenceDisagreeCount - contributions.evidenceAgreeCount;
    negativeScore += net * opts.evidenceDisputedPenalty;
  }
  if (evidenceVoteBonus > 0) {
    factors.push({ name: "Evidence Approved", value: evidenceVoteBonus, weight: 1, contribution: evidenceVoteBonus });
    positiveScore += evidenceVoteBonus;
  }

  if (retractedClaims.length > 0) {
    negativeScore += retractedClaims.length * opts.retractedClaimPenalty;
    factors.push({ name: "Retracted Claims", value: retractedClaims.length, weight: opts.retractedClaimPenalty, contribution: -retractedClaims.length * opts.retractedClaimPenalty });
  }

  if (retractedEvidence.length > 0) {
    negativeScore += retractedEvidence.length * opts.retractedEvidencePenalty;
    factors.push({ name: "Retracted Evidence", value: retractedEvidence.length, weight: opts.retractedEvidencePenalty, contribution: -retractedEvidence.length * opts.retractedEvidencePenalty });
  }

  const overall = Math.max(0, positiveScore - negativeScore);

  return { overall, positiveScore, negativeScore, factors, options: opts };
}

export function computeCredibility(
  claim: DiscussionClaim,
  evidenceForClaim: Array<{
    isRetracted: boolean;
    agreeCount?: number;
    disagreeCount?: number;
  }>,
  _claimRelations: unknown,
  authorReputation: number,
): ClaimCredibility {
  const activeEvidence = evidenceForClaim.filter((e) => !e.isRetracted);
  const evidenceCount = activeEvidence.length;

  let evidenceQuality = 0;
  for (const e of activeEvidence) {
    let quality = 1;
    if (e.agreeCount && e.disagreeCount !== undefined) {
      const total = e.agreeCount + e.disagreeCount;
      if (total > 0) quality += (e.agreeCount / total) * 2;
    }
    evidenceQuality += quality;
  }
  evidenceQuality = evidenceCount > 0 ? evidenceQuality / evidenceCount : 0;

  const totalVotes = (claim.agreeCount || 0) + (claim.disagreeCount || 0);
  const supportRatio = totalVotes > 0 ? (claim.agreeCount || 0) / totalVotes : 0;
  const contradictionRatio = totalVotes > 0 ? (claim.disagreeCount || 0) / totalVotes : 0;

  const evidenceScore = Math.min(evidenceCount / 5, 1) * 3;
  const qualityScore = evidenceQuality * 2;
  const supportScore = supportRatio * 3;
  const authorScore = Math.min(authorReputation / 100, 1) * 2;

  const maxScore = 3 + 2 + 3 + 2;
  const rawScore = evidenceScore + qualityScore + supportScore + authorScore;
  const score = Math.round((rawScore / maxScore) * 100);

  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return {
    score,
    level,
    factors: {
      evidenceCount,
      evidenceQuality: Math.round(evidenceQuality * 100) / 100,
      supportRatio: Math.round(supportRatio * 100) / 100,
      contradictionRatio: Math.round(contradictionRatio * 100) / 100,
      authorReputation,
    },
  };
}

export function computeExpertise(contributions: UserContributions): ExpertiseArea[] {
  const topicCount: Record<string, number> = {};

  for (const c of contributions.claims) {
    if (!c.isRetracted) {
      const topic = inferTopicFromContext(c.claimType);
      topicCount[topic] = (topicCount[topic] || 0) + 3;
    }
  }

  for (const e of contributions.evidence) {
    if (!e.isRetracted) {
      const topic = inferTopicFromEvidence(e.evidenceType);
      topicCount[topic] = (topicCount[topic] || 0) + 2;
    }
  }

  for (const q of contributions.questions) {
    if (!q.isRetracted) {
      topicCount["General"] = (topicCount["General"] || 0) + 1;
    }
  }

  return Object.entries(topicCount)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);
}

function inferTopicFromContext(claimType: string): string {
  if (claimType === "fact") return "Science";
  if (claimType === "prediction") return "Economics";
  if (claimType === "proposal") return "Politics";
  if (claimType === "observation") return "Technology";
  return "General";
}

function inferTopicFromEvidence(evidenceType: string): string {
  if (evidenceType === "scientific") return "Science";
  if (evidenceType === "statistical") return "Economics";
  if (evidenceType === "expert") return "Health";
  if (evidenceType === "documentary" || evidenceType === "historical") return "Politics";
  if (evidenceType === "technological") return "Technology";
  return "General";
}

export function computeTrustBadges(
  contributions: UserContributions,
  reputation: ReputationScore,
): TrustBadge[] {
  const activeClaims = contributions.claims.filter((c) => !c.isRetracted);
  const activeEvidence = contributions.evidence.filter((e) => !e.isRetracted);
  const activeQuestions = contributions.questions.filter((q) => !q.isRetracted);

  return [
    {
      id: "evidence-builder",
      name: "Evidence Builder",
      description: "Submitted 5 or more pieces of evidence",
      icon: "FileText",
      earned: activeEvidence.length >= 5,
    },
    {
      id: "question-explorer",
      name: "Question Explorer",
      description: "Asked 5 or more questions",
      icon: "HelpCircle",
      earned: activeQuestions.length >= 5,
    },
    {
      id: "consensus-builder",
      name: "Consensus Builder",
      description: "Achieved reputation score of 200 or higher",
      icon: "Target",
      earned: reputation.overall >= 200,
    },
    {
      id: "research-contributor",
      name: "Research Contributor",
      description: "Submitted 10 or more pieces of evidence",
      icon: "BookOpen",
      earned: activeEvidence.length >= 10,
    },
    {
      id: "top-analyst",
      name: "Top Analyst",
      description: "Created 20 or more claims with high credibility",
      icon: "BarChart3",
      earned: activeClaims.length >= 20 && reputation.overall >= 300,
    },
    {
      id: "prolific-contributor",
      name: "Prolific Contributor",
      description: "Made 50 or total contributions across all categories",
      icon: "Zap",
      earned: activeClaims.length + activeEvidence.length + activeQuestions.length >= 50,
    },
    {
      id: "first-claim",
      name: "First Steps",
      description: "Created your first claim",
      icon: "Feather",
      earned: activeClaims.length >= 1,
    },
    {
      id: "debate-participant",
      name: "Debater",
      description: "Participated in a debate",
      icon: "Swords",
      earned: contributions.debateParticipations.length >= 1,
    },
    {
      id: "debate-champion",
      name: "Debate Champion",
      description: "Won 3 or more debates",
      icon: "Trophy",
      earned: contributions.debateWins >= 3,
    },
    {
      id: "debate-creator",
      name: "Debate Creator",
      description: "Created 3 or more debates",
      icon: "Scale",
      earned: contributions.debateCount >= 3,
    },
  ];
}

export function computeClaimCredibilityLabel(score: number): string {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function computeBadgeProgress(contributions: UserContributions, reputation: ReputationScore): BadgeProgress[] {
  const activeClaims = contributions.claims.filter((c) => !c.isRetracted);
  const activeEvidence = contributions.evidence.filter((e) => !e.isRetracted);
  const activeQuestions = contributions.questions.filter((q) => !q.isRetracted);
  const totalActive = activeClaims.length + activeEvidence.length + activeQuestions.length;

  const badges: { id: string; name: string; description: string; icon: string; current: number; required: number }[] = [
    { id: "first-claim", name: "First Steps", description: "Created your first claim", icon: "Feather", current: Math.min(activeClaims.length, 1), required: 1 },
    { id: "evidence-builder", name: "Evidence Builder", description: "Submitted 5 or more pieces of evidence", icon: "FileText", current: Math.min(activeEvidence.length, 5), required: 5 },
    { id: "question-explorer", name: "Question Explorer", description: "Asked 5 or more questions", icon: "HelpCircle", current: Math.min(activeQuestions.length, 5), required: 5 },
    { id: "consensus-builder", name: "Consensus Builder", description: "Achieved reputation score of 200 or higher", icon: "Target", current: Math.min(Math.floor(reputation.overall / 200 * 100), 100), required: 100 },
    { id: "research-contributor", name: "Research Contributor", description: "Submitted 10 or more pieces of evidence", icon: "BookOpen", current: Math.min(activeEvidence.length, 10), required: 10 },
    { id: "top-analyst", name: "Top Analyst", description: "Created 20 or more claims with high credibility", icon: "BarChart3", current: Math.min(activeClaims.length, 20), required: 20 },
    { id: "prolific-contributor", name: "Prolific Contributor", description: "Made 50 total contributions across all categories", icon: "Zap", current: Math.min(totalActive, 50), required: 50 },
    { id: "debate-participant", name: "Debater", description: "Participated in a debate", icon: "Swords", current: Math.min(contributions.debateParticipations.length, 1), required: 1 },
    { id: "debate-champion", name: "Debate Champion", description: "Won 3 or more debates", icon: "Trophy", current: Math.min(contributions.debateWins, 3), required: 3 },
    { id: "debate-creator", name: "Debate Creator", description: "Created 3 or more debates", icon: "Scale", current: Math.min(contributions.debateCount, 3), required: 3 },
  ];

  const earned = computeTrustBadges(contributions, reputation);
  const earnedMap = new Set(earned.filter((b) => b.earned).map((b) => b.id));

  return badges.map((b) => ({
    badgeId: b.id,
    badgeName: b.name,
    description: b.description,
    icon: b.icon,
    current: b.current,
    required: b.required,
    progress: Math.min(b.current / b.required, 1),
    earned: earnedMap.has(b.id),
  }));
}

export function computeTrend(history: ReputationSnapshot[]): ReputationTrend | null {
  if (history.length < 2) {
    if (history.length === 1) {
      return { current: history[0].score, previous: 0, direction: "up", change: history[0].score, sampleSize: 1 };
    }
    return null;
  }
  const current = history[0].score;
  const previous = history[1].score;
  const diff = current - previous;
  return {
    current,
    previous,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "stable",
    change: Math.abs(diff),
    sampleSize: history.length,
  };
}

export function computeExpertiseBreakdown(contributions: UserContributions): ExpertiseBreakdown[] {
  const areaData: Record<string, { score: number; claims: number; evidence: number; questions: number }> = {};

  for (const c of contributions.claims) {
    if (!c.isRetracted) {
      const topic = inferTopicFromContext(c.claimType);
      if (!areaData[topic]) areaData[topic] = { score: 0, claims: 0, evidence: 0, questions: 0 };
      areaData[topic].score += 3;
      areaData[topic].claims++;
    }
  }

  for (const e of contributions.evidence) {
    if (!e.isRetracted) {
      const topic = inferTopicFromEvidence(e.evidenceType);
      if (!areaData[topic]) areaData[topic] = { score: 0, claims: 0, evidence: 0, questions: 0 };
      areaData[topic].score += 2;
      areaData[topic].evidence++;
    }
  }

  for (const q of contributions.questions) {
    if (!q.isRetracted) {
      if (!areaData["General"]) areaData["General"] = { score: 0, claims: 0, evidence: 0, questions: 0 };
      areaData["General"].score += 1;
      areaData["General"].questions++;
    }
  }

  return Object.entries(areaData)
    .map(([area, data]) => ({
      area,
      score: data.score,
      contributions: { claims: data.claims, evidence: data.evidence, questions: data.questions },
    }))
    .sort((a, b) => b.score - a.score);
}
