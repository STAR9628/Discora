import type {
  DiscussionClaim,
  DiscussionEvidence,
  DiscussionQuestion,
  DiscussionClaimRelation,
} from "@/features/discussions/types";

export interface EpistemicClaimSummary {
  claim: DiscussionClaim;
  supportingEvidenceCount: number;
  contradictingEvidenceCount: number;
  contextEvidenceCount: number;
  totalEvidenceCount: number;
  totalVotes: number;
  agreementPercentage: number | null;
  status: "supported" | "contested" | "unresolved";
  statusReason: string;
  sourceDomains: string[];
}

export interface UnresolvedQuestionSummary {
  question: DiscussionQuestion;
  answeringClaimsCount: number;
}

export interface StateOfUnderstandingMetrics {
  totalClaims: number;
  claimsWithEvidenceCount: number;
  evidenceCoveragePercentage: number;
  supportedClaims: EpistemicClaimSummary[];
  // Alias for backward compatibility
  substantiatedClaims: EpistemicClaimSummary[];
  contestedClaims: EpistemicClaimSummary[];
  unresolvedClaims: EpistemicClaimSummary[];
  // Alias for backward compatibility
  unevidencedClaims: EpistemicClaimSummary[];
  unresolvedQuestions: UnresolvedQuestionSummary[];
  totalInquiriesCount: number;
  hasSufficientData: boolean;
}

function extractDomain(urlStr: string | null | undefined): string | null {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function formatCommunityStance(
  totalVotes: number,
  agreementPercentage: number | null
): string {
  if (totalVotes === 0 || agreementPercentage === null) {
    return "No votes recorded";
  }
  if (totalVotes < 5) {
    return `Preliminary stance (${totalVotes} ${totalVotes === 1 ? "vote" : "votes"})`;
  }
  return `Current stance: ${Math.round(agreementPercentage)}% agree across ${totalVotes} votes`;
}

export function deriveStateOfUnderstanding(params: {
  claims: DiscussionClaim[] | undefined;
  evidence: DiscussionEvidence[] | undefined;
  questions: DiscussionQuestion[] | undefined;
  claimRelations?: DiscussionClaimRelation[] | undefined;
  inquiryCounts?: Record<string, number> | undefined;
}): StateOfUnderstandingMetrics {
  const activeClaims = (params.claims || []).filter((c) => !c.isRetracted);
  const activeEvidence = (params.evidence || []).filter((e) => !e.isRetracted);
  const activeQuestions = (params.questions || []).filter((q) => !q.isRetracted);

  // Group evidence by claimId
  const evidenceByClaim = new Map<string, DiscussionEvidence[]>();
  for (const ev of activeEvidence) {
    const list = evidenceByClaim.get(ev.claimId) || [];
    list.push(ev);
    evidenceByClaim.set(ev.claimId, list);
  }

  // Count claims answering each question
  const answeringClaimsCountByQuestion = new Map<string, number>();
  for (const c of activeClaims) {
    if (c.questionId) {
      answeringClaimsCountByQuestion.set(
        c.questionId,
        (answeringClaimsCountByQuestion.get(c.questionId) || 0) + 1
      );
    }
  }

  const supportedClaims: EpistemicClaimSummary[] = [];
  const contestedClaims: EpistemicClaimSummary[] = [];
  const unresolvedClaims: EpistemicClaimSummary[] = [];
  let claimsWithEvidenceCount = 0;

  for (const claim of activeClaims) {
    const claimEvidence = evidenceByClaim.get(claim.id) || [];
    let supportingCount = 0;
    let contradictingCount = 0;
    let contextCount = 0;
    const domainSet = new Set<string>();

    for (const ev of claimEvidence) {
      if (ev.direction === "support") supportingCount++;
      else if (ev.direction === "contradict") contradictingCount++;
      else if (ev.direction === "context") contextCount++;

      const domain = extractDomain(ev.sourceUrl);
      if (domain) domainSet.add(domain);
    }

    // Evidence coverage: does the claim have at least one attached evidence record of ANY direction?
    const totalEvidenceCount = claimEvidence.length;
    if (totalEvidenceCount > 0) {
      claimsWithEvidenceCount++;
    }

    const agree = claim.agreeCount ?? 0;
    const disagree = claim.disagreeCount ?? 0;
    const totalVotes = agree + disagree;
    const agreementPercentage = totalVotes > 0 ? (agree / totalVotes) * 100 : null;
    const sourceDomains = Array.from(domainSet).slice(0, 3);

    // Epistemic Classification:
    // 1. Contested: Direct contradicting evidence exists OR mixed directional citations OR approved stance division (>=5 votes, 35%-65%)
    if (contradictingCount > 0) {
      const reason =
        supportingCount > 0
          ? `Mixed evidence (${supportingCount} supporting, ${contradictingCount} contradicting)`
          : `Challenged by ${contradictingCount} contradicting citation${contradictingCount === 1 ? "" : "s"}`;

      contestedClaims.push({
        claim,
        supportingEvidenceCount: supportingCount,
        contradictingEvidenceCount: contradictingCount,
        contextEvidenceCount: contextCount,
        totalEvidenceCount,
        totalVotes,
        agreementPercentage,
        status: "contested",
        statusReason: reason,
        sourceDomains,
      });
    } else if (supportingCount > 0) {
      // 2. Supported by Current Evidence: At least 1 supporting citation and 0 contradicting citations
      const reason = `Supported by ${supportingCount} citation${supportingCount === 1 ? "" : "s"} without active contradiction`;

      supportedClaims.push({
        claim,
        supportingEvidenceCount: supportingCount,
        contradictingEvidenceCount: contradictingCount,
        contextEvidenceCount: contextCount,
        totalEvidenceCount,
        totalVotes,
        agreementPercentage,
        status: "supported",
        statusReason: reason,
        sourceDomains,
      });
    } else {
      // 3. No directional evidence (supporting === 0 && contradicting === 0)
      // Check if community votes indicate significant division with >= 5 votes
      if (
        totalVotes >= 5 &&
        agreementPercentage !== null &&
        agreementPercentage >= 35 &&
        agreementPercentage <= 65
      ) {
        contestedClaims.push({
          claim,
          supportingEvidenceCount: 0,
          contradictingEvidenceCount: 0,
          contextEvidenceCount: contextCount,
          totalEvidenceCount,
          totalVotes,
          agreementPercentage,
          status: "contested",
          statusReason: `Divided community stance (${Math.round(agreementPercentage)}% agree, 0 directional citations)`,
          sourceDomains,
        });
      } else {
        // Unresolved / Awaiting directional evidence
        let reason = "";
        if (contextCount > 0) {
          // Context evidence is present, but no directional support or contradiction
          reason =
            totalVotes >= 5
              ? `${contextCount} context source${contextCount === 1 ? "" : "s"} attached; awaiting directional evidence (${formatCommunityStance(totalVotes, agreementPercentage)})`
              : `${contextCount} context source${contextCount === 1 ? "" : "s"} attached; awaiting directional evidence`;
        } else {
          // Zero evidence attached of any direction
          reason =
            totalVotes >= 5
              ? `Awaiting citations (${formatCommunityStance(totalVotes, agreementPercentage)})`
              : "Awaiting empirical citations";
        }

        unresolvedClaims.push({
          claim,
          supportingEvidenceCount: 0,
          contradictingEvidenceCount: 0,
          contextEvidenceCount: contextCount,
          totalEvidenceCount,
          totalVotes,
          agreementPercentage,
          status: "unresolved",
          statusReason: reason,
          sourceDomains,
        });
      }
    }
  }

  // Open framing questions (no answering claims linked yet)
  const unresolvedQuestions: UnresolvedQuestionSummary[] = [];
  for (const q of activeQuestions) {
    const count = answeringClaimsCountByQuestion.get(q.id) || 0;
    if (count === 0) {
      unresolvedQuestions.push({ question: q, answeringClaimsCount: 0 });
    }
  }

  // Count total open inquiries
  let totalInquiriesCount = 0;
  if (params.inquiryCounts) {
    for (const count of Object.values(params.inquiryCounts)) {
      totalInquiriesCount += count;
    }
  }

  const totalClaims = activeClaims.length;
  // Evidence Coverage: Percentage of active claims that have at least one attached evidence record of ANY direction
  const evidenceCoveragePercentage =
    totalClaims > 0
      ? Math.round((claimsWithEvidenceCount / totalClaims) * 100)
      : 0;

  const hasSufficientData =
    totalClaims > 0 || activeEvidence.length > 0 || activeQuestions.length > 0;

  return {
    totalClaims,
    claimsWithEvidenceCount,
    evidenceCoveragePercentage,
    supportedClaims,
    substantiatedClaims: supportedClaims,
    contestedClaims,
    unresolvedClaims,
    unevidencedClaims: unresolvedClaims,
    unresolvedQuestions,
    totalInquiriesCount,
    hasSufficientData,
  };
}
