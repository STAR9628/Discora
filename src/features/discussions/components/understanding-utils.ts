import type {
  DiscussionClaim,
  DiscussionEvidence,
  DiscussionQuestion,
  DiscussionClaimRelation,
  DiscussionArgument,
} from "@/features/discussions/types";

export type SoUClaimState = "supported" | "contested" | "unresolved";

export interface ClaimConnection {
  claimId: string;
  content: string;
  relationType: "supports" | "contradicts" | "refines";
  direction: "outgoing" | "incoming";
}

export interface RoomSoUState {
  state: SoUClaimState;
  framing: boolean;
  contestedClaimIds: string[];
  unresolvedClaimIds: string[];
  unresolvedQuestionIds: string[];
  supportedClaimIds: string[];
}

export interface EpistemicClaimSummary {
  claim: DiscussionClaim;
  supportingEvidenceCount: number;
  contradictingEvidenceCount: number;
  contextEvidenceCount: number;
  totalEvidenceCount: number;
  totalVotes: number;
  agreementPercentage: number | null;
  status: SoUClaimState;
  statusReason: string;
  sourceDomains: string[];
  openInquiryCount: number;
  totalArgumentCount: number;
  supportingArgumentCount: number;
  challengingArgumentCount: number;
  /** Structured claim-to-claim connections (display context; see relation rules below). */
  connections: ClaimConnection[];
  connectionCounts: { supports: number; contradicts: number; refines: number };
  /** Ids of evidenced challengers that elevated this claim to contested. */
  challengedByClaimIds: string[];
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
  totalArgumentsCount?: number;
  hasSufficientData: boolean;
  /**
   * Room-level SoU for the input scope (whole room when called with whole-room
   * inputs; side-scoped when called with a side subset — callers must only
   * present it as room state for whole-room scopes).
   *
   * Presence lattice (no numeric thresholds, no largest-bucket rule):
   * - any contested claim  -> contested (an open dispute exists in scope)
   * - else any unresolved claim/question -> unresolved (open inquiry exists)
   * - else any supported claim -> supported
   * - else unresolved + framing (no data)
   */
  roomState: RoomSoUState;
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
    return "No community votes yet";
  }
  if (totalVotes < 5) {
    return `${totalVotes} vote${totalVotes === 1 ? "" : "s"} (preliminary)`;
  }
  const support = Math.round(agreementPercentage);
  const challenge = 100 - support;
  return `${support}% support · ${challenge}% challenge · ${totalVotes} votes`;
}

export function deriveStateOfUnderstanding(params: {
  claims: DiscussionClaim[] | undefined;
  evidence: DiscussionEvidence[] | undefined;
  questions?: DiscussionQuestion[] | undefined;
  claimRelations?: DiscussionClaimRelation[] | undefined;
  inquiryCounts?: Record<string, number> | undefined;
  arguments?: DiscussionArgument[] | undefined;
}): StateOfUnderstandingMetrics {
  // Exclude retracted and soft-deleted claims from active understanding synthesis
  const activeClaims = (params.claims || []).filter((c) => !c.isRetracted && !c.deletedAt);
  const activeEvidence = (params.evidence || []).filter((e) => !e.isRetracted);
  const activeQuestions = (params.questions || []).filter((q) => !q.isRetracted);
  const activeArguments = (params.arguments || []).filter((a) => !a.isRetracted && !a.deletedAt);

  // Group evidence by claimId
  const evidenceByClaim = new Map<string, DiscussionEvidence[]>();
  for (const ev of activeEvidence) {
    const list = evidenceByClaim.get(ev.claimId) || [];
    list.push(ev);
    evidenceByClaim.set(ev.claimId, list);
  }

  // Group arguments by claimId
  const argumentsByClaim = new Map<string, DiscussionArgument[]>();
  for (const arg of activeArguments) {
    const list = argumentsByClaim.get(arg.claimId) || [];
    list.push(arg);
    argumentsByClaim.set(arg.claimId, list);
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

  // Per-claim evidence tallies (first pass; relation elevation below reads these).
  const evidenceTallyByClaim = new Map<
    string,
    { supporting: number; contradicting: number; context: number; total: number; domains: Set<string> }
  >();
  for (const claim of activeClaims) {
    const claimEvidence = evidenceByClaim.get(claim.id) || [];
    const tally = { supporting: 0, contradicting: 0, context: 0, total: claimEvidence.length, domains: new Set<string>() };
    for (const ev of claimEvidence) {
      if (ev.direction === "support") tally.supporting++;
      else if (ev.direction === "contradict") tally.contradicting++;
      else if (ev.direction === "context") tally.context++;
      const domain = extractDomain(ev.sourceUrl);
      if (domain) tally.domains.add(domain);
    }
    evidenceTallyByClaim.set(claim.id, tally);
    if (tally.total > 0) claimsWithEvidenceCount++;
  }

  // Claim-relation index (active endpoints only; self-edges excluded by DB check).
  // Relations NEVER decide state by themselves. The single state-affecting rule:
  // an EVIDENCED structured challenge (a contradicts-edge from a claim that itself
  // carries supporting citations) elevates an otherwise-supported target to
  // contested — the "divided stance" the Contested pillar describes. Bare
  // (unevidenced) challengers, supports-edges, and refines-edges only add
  // connection context, never state. Single pass over tallies: cycles cannot
  // recurse or oscillate.
  const activeClaimById = new Map(activeClaims.map((c) => [c.id, c]));
  const connectionsByClaim = new Map<string, ClaimConnection[]>();
  const seenEdge = new Set<string>();
  const relations = params.claimRelations || [];
  for (const rel of relations) {
    const source = activeClaimById.get(rel.sourceClaimId);
    const target = activeClaimById.get(rel.targetClaimId);
    if (!source || !target || source.id === target.id) continue;
    const outKey = `${source.id}>${target.id}:${rel.relationType}`;
    const inKey = `${target.id}<${source.id}:${rel.relationType}`;
    if (!seenEdge.has(outKey)) {
      seenEdge.add(outKey);
      const list = connectionsByClaim.get(source.id) || [];
      list.push({ claimId: target.id, content: target.content, relationType: rel.relationType, direction: "outgoing" });
      connectionsByClaim.set(source.id, list);
    }
    if (!seenEdge.has(inKey)) {
      seenEdge.add(inKey);
      const list = connectionsByClaim.get(target.id) || [];
      list.push({ claimId: source.id, content: source.content, relationType: rel.relationType, direction: "incoming" });
      connectionsByClaim.set(target.id, list);
    }
  }

  const challengedByClaimIds = new Map<string, string[]>();
  for (const rel of relations) {
    if (rel.relationType !== "contradicts") continue;
    const challenger = activeClaimById.get(rel.sourceClaimId);
    const target = activeClaimById.get(rel.targetClaimId);
    if (!challenger || !target || challenger.id === target.id) continue;
    const challengerTally = evidenceTallyByClaim.get(challenger.id);
    const targetTally = evidenceTallyByClaim.get(target.id);
    // Evidenced challenge against a citation-supported target with no
    // contradicting citations of its own: the target's standing is disputed.
    if (
      challengerTally && challengerTally.supporting > 0 &&
      targetTally && targetTally.supporting > 0 && targetTally.contradicting === 0
    ) {
      const list = challengedByClaimIds.get(target.id) || [];
      if (!list.includes(challenger.id)) list.push(challenger.id);
      challengedByClaimIds.set(target.id, list);
    }
  }

  function buildSummary(
    claim: DiscussionClaim,
    tally: { supporting: number; contradicting: number; context: number; total: number; domains: Set<string> },
    status: SoUClaimState,
    statusReason: string,
  ): EpistemicClaimSummary {
    const agree = claim.agreeCount ?? 0;
    const disagree = claim.disagreeCount ?? 0;
    const totalVotes = agree + disagree;
    const agreementPercentage = totalVotes > 0 ? (agree / totalVotes) * 100 : null;
    const connections = (connectionsByClaim.get(claim.id) || []).slice(0, 6);
    const connectionCounts = { supports: 0, contradicts: 0, refines: 0 };
    for (const conn of connectionsByClaim.get(claim.id) || []) {
      connectionCounts[conn.relationType]++;
    }
    const claimArguments = argumentsByClaim.get(claim.id) || [];
    let supportingArgumentCount = 0;
    let challengingArgumentCount = 0;
    for (const arg of claimArguments) {
      if (arg.stance === "supporting") supportingArgumentCount++;
      else if (arg.stance === "challenging") challengingArgumentCount++;
    }
    return {
      claim,
      supportingEvidenceCount: tally.supporting,
      contradictingEvidenceCount: tally.contradicting,
      contextEvidenceCount: tally.context,
      totalEvidenceCount: tally.total,
      totalVotes,
      agreementPercentage,
      status,
      statusReason,
      sourceDomains: Array.from(tally.domains).slice(0, 3),
      openInquiryCount: params.inquiryCounts?.[claim.id] || 0,
      totalArgumentCount: claimArguments.length,
      supportingArgumentCount,
      challengingArgumentCount,
      connections,
      connectionCounts,
      challengedByClaimIds: challengedByClaimIds.get(claim.id) || [],
    };
  }

  for (const claim of activeClaims) {
    const tally = evidenceTallyByClaim.get(claim.id)!;
    const challengers = challengedByClaimIds.get(claim.id) || [];

    // Epistemic Classification (evidence-led only; community stance never decides state):
    // 1. Contested: Direct contradicting evidence exists, mixed directional
    //    citations, or an evidenced structured challenge via claim relations.
    if (tally.contradicting > 0) {
      const reason =
        tally.supporting > 0
          ? `Mixed evidence (${tally.supporting} supporting, ${tally.contradicting} contradicting)`
          : `Challenged by ${tally.contradicting} contradicting citation${tally.contradicting === 1 ? "" : "s"}`;

      contestedClaims.push(buildSummary(claim, tally, "contested", reason));
    } else if (challengers.length > 0) {
      const challenger = activeClaimById.get(challengers[0])!;
      const reason =
        `Challenged by an evidenced connected claim` +
        (challengers.length > 1 ? ` (+${challengers.length - 1} more)` : "") +
        `: "${truncateForReason(challenger.content)}"`;

      contestedClaims.push(buildSummary(claim, tally, "contested", reason));
    } else if (tally.supporting > 0) {
      // 2. Supported by Current Evidence: At least 1 supporting citation and 0 contradicting citations
      const reason = `Supported by ${tally.supporting} citation${tally.supporting === 1 ? "" : "s"} without active contradiction`;

      supportedClaims.push(buildSummary(claim, tally, "supported", reason));
    } else {
      // Zero evidence attached of any direction
      // Votes and community stance are descriptive social signals only.
      // They must NOT determine epistemic state.
      // All zero-evidence claims remain unresolved regardless of vote counts.
      let reason = "";
      if (tally.context > 0) {
        reason = `${tally.context} context source${tally.context === 1 ? "" : "s"} attached; awaiting directional evidence`;
      } else {
        reason = "Awaiting empirical citations";
      }

      unresolvedClaims.push(buildSummary(claim, tally, "unresolved", reason));
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

  // Room-level SoU for the input scope (presence lattice — see RoomSoUState docs).
  const framing = !hasSufficientData;
  const roomState: RoomSoUState = framing
    ? {
        state: "unresolved",
        framing: true,
        contestedClaimIds: [],
        unresolvedClaimIds: [],
        unresolvedQuestionIds: [],
        supportedClaimIds: [],
      }
    : contestedClaims.length > 0
      ? {
          state: "contested",
          framing: false,
          contestedClaimIds: contestedClaims.map((s) => s.claim.id),
          unresolvedClaimIds: unresolvedClaims.map((s) => s.claim.id),
          unresolvedQuestionIds: unresolvedQuestions.map((q) => q.question.id),
          supportedClaimIds: supportedClaims.map((s) => s.claim.id),
        }
      : unresolvedClaims.length > 0 || unresolvedQuestions.length > 0
        ? {
            state: "unresolved",
            framing: false,
            contestedClaimIds: [],
            unresolvedClaimIds: unresolvedClaims.map((s) => s.claim.id),
            unresolvedQuestionIds: unresolvedQuestions.map((q) => q.question.id),
            supportedClaimIds: supportedClaims.map((s) => s.claim.id),
          }
        : supportedClaims.length > 0
          ? {
              state: "supported",
              framing: false,
              contestedClaimIds: [],
              unresolvedClaimIds: [],
              unresolvedQuestionIds: [],
              supportedClaimIds: supportedClaims.map((s) => s.claim.id),
            }
          : {
              // Data exists but no classifiable claims (e.g. evidence without
              // claims): understanding cannot be described as supported.
              state: "unresolved",
              framing: false,
              contestedClaimIds: [],
              unresolvedClaimIds: [],
              unresolvedQuestionIds: unresolvedQuestions.map((q) => q.question.id),
              supportedClaimIds: [],
            };

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
    totalArgumentsCount: activeArguments.length,
    hasSufficientData,
    roomState,
  };
}

function truncateForReason(content: string, maxLength = 80): string {
  const text = content.trim().replace(/\s+/g, " ");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
