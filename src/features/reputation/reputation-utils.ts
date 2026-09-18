import type { BadgeProgress, ExpertiseArea, ExpertiseBreakdown, ReputationOptions, ReputationFactor, ReputationScore, ReputationSnapshot, ReputationTrend, TrustBadge, UserContributions } from "./types";

const DEFAULT_OPTIONS: ReputationOptions = {
  claimCreatedWeight: 10,
  evidenceSubmittedWeight: 15,
  questionAskedWeight: 5,
  debateCreatedWeight: 15,
  debateJoinedWeight: 5,
};

export function computeReputation(
  contributions: UserContributions,
  options?: Partial<ReputationOptions>,
): ReputationScore {
  const opts: ReputationOptions = { ...DEFAULT_OPTIONS, ...options };
  const factors: ReputationFactor[] = [];
  let positiveScore = 0;
  const negativeScore = 0;

  const claims = contributions.claims.filter((c) => !c.isRetracted);
  const evidence = contributions.evidence.filter((e) => !e.isRetracted);
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

  const overall = Math.max(0, positiveScore - negativeScore);

return { overall, positiveScore, negativeScore, factors, options: opts };
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
      id: "research-contributor",
      name: "Research Contributor",
      description: "Submitted 10 or more pieces of evidence",
      icon: "BookOpen",
      earned: activeEvidence.length >= 10,
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
      id: "debate-creator",
      name: "Debate Creator",
      description: "Created 3 or more debates",
      icon: "Scale",
      earned: contributions.debateCount >= 3,
    },
  ];
}

export function computeBadgeProgress(contributions: UserContributions): BadgeProgress[] {
  const activeClaims = contributions.claims.filter((c) => !c.isRetracted);
  const activeEvidence = contributions.evidence.filter((e) => !e.isRetracted);
  const activeQuestions = contributions.questions.filter((q) => !q.isRetracted);
  const totalActive = activeClaims.length + activeEvidence.length + activeQuestions.length;

  const badges: { id: string; name: string; description: string; icon: string; current: number; required: number }[] = [
    { id: "first-claim", name: "First Steps", description: "Created your first claim", icon: "Feather", current: Math.min(activeClaims.length, 1), required: 1 },
    { id: "evidence-builder", name: "Evidence Builder", description: "Submitted 5 or more pieces of evidence", icon: "FileText", current: Math.min(activeEvidence.length, 5), required: 5 },
    { id: "question-explorer", name: "Question Explorer", description: "Asked 5 or more questions", icon: "HelpCircle", current: Math.min(activeQuestions.length, 5), required: 5 },
    { id: "research-contributor", name: "Research Contributor", description: "Submitted 10 or more pieces of evidence", icon: "BookOpen", current: Math.min(activeEvidence.length, 10), required: 10 },
    { id: "prolific-contributor", name: "Prolific Contributor", description: "Made 50 total contributions across all categories", icon: "Zap", current: Math.min(totalActive, 50), required: 50 },
    { id: "debate-creator", name: "Debate Creator", description: "Created 3 or more debates", icon: "Scale", current: Math.min(contributions.debateCount, 3), required: 3 },
  ];

  const earned = computeTrustBadges(contributions);
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
