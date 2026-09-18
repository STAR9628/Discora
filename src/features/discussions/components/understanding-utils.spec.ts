import { describe, expect, it } from "vitest";
import { deriveStateOfUnderstanding } from "./understanding-utils";
import type {
  DiscussionArgument,
  DiscussionClaim,
  DiscussionClaimRelation,
  DiscussionEvidence,
  DiscussionQuestion,
} from "@/features/discussions/types";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}`;

function claim(over: Partial<DiscussionClaim> = {}): DiscussionClaim {
  return {
    id: nid("c"),
    roomId: "room-1",
    originMessageId: null,
    questionId: null,
    content: "Test claim content",
    claimType: "fact",
    contextType: "observation",
    identityMode: "public",
    isRetracted: false,
    debateSide: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    createdBy: null,
    username: null,
    avatarUrl: null,
    ...over,
  };
}

function evidence(claimId: string, over: Partial<DiscussionEvidence> = {}): DiscussionEvidence {
  return {
    id: nid("e"),
    roomId: "room-1",
    sourceId: "s-1",
    content: "Test evidence",
    evidenceType: "documentary",
    identityMode: "public",
    isRetracted: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    claimId,
    direction: "support",
    createdBy: null,
    username: null,
    avatarUrl: null,
    sourceTitle: "Source",
    sourceUrl: "https://example.com/doc",
    sourceFilePath: null,
    sourceIsRetracted: false,
    ...over,
  };
}

function question(over: Partial<DiscussionQuestion> = {}): DiscussionQuestion {
  return {
    id: nid("q"),
    roomId: "room-1",
    content: "Test question?",
    questionType: "clarification",
    identityMode: "public",
    isRetracted: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    createdBy: null,
    username: null,
    avatarUrl: null,
    ...over,
  };
}

function relation(
  sourceClaimId: string,
  targetClaimId: string,
  relationType: DiscussionClaimRelation["relationType"] = "supports",
): DiscussionClaimRelation {
  return {
    id: nid("r"),
    roomId: "room-1",
    sourceClaimId,
    targetClaimId,
    relationType,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    sourceClaimContent: "source",
    sourceClaimType: "fact",
    targetClaimContent: "target",
    targetClaimType: "fact",
  };
}

function argument(claimId: string, over: Partial<DiscussionArgument> = {}): DiscussionArgument {
  return {
    id: nid("a"),
    roomId: "room-1",
    claimId,
    content: "Test argument",
    stance: "supporting",
    identityMode: "public",
    isRetracted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    createdBy: null,
    username: null,
    avatarUrl: null,
    ...over,
  };
}

describe("deriveStateOfUnderstanding — existing behavior preserved", () => {
  it("1. classifies a cited claim without contradiction as supported", () => {
    const c = claim();
    const m = deriveStateOfUnderstanding({ claims: [c], evidence: [evidence(c.id)] });
    expect(m.supportedClaims.map((s) => s.claim.id)).toEqual([c.id]);
    expect(m.contestedClaims).toHaveLength(0);
    expect(m.unresolvedClaims).toHaveLength(0);
    expect(m.supportedClaims[0].statusReason).toContain("without active contradiction");
  });

  it("2. classifies mixed-direction citations as contested", () => {
    const c = claim();
    const m = deriveStateOfUnderstanding({
      claims: [c],
      evidence: [evidence(c.id, { direction: "support" }), evidence(c.id, { direction: "contradict" })],
    });
    expect(m.contestedClaims.map((s) => s.claim.id)).toEqual([c.id]);
    expect(m.supportedClaims).toHaveLength(0);
  });

  it("2b. classifies pure contradicting citations as contested", () => {
    const c = claim();
    const m = deriveStateOfUnderstanding({
      claims: [c],
      evidence: [evidence(c.id, { direction: "contradict" })],
    });
    expect(m.contestedClaims).toHaveLength(1);
  });

  it("3. classifies citation-less claims as unresolved", () => {
    const c = claim();
    const m = deriveStateOfUnderstanding({ claims: [c], evidence: [] });
    expect(m.unresolvedClaims.map((s) => s.claim.id)).toEqual([c.id]);
    expect(m.unresolvedClaims[0].statusReason).toContain("Awaiting empirical citations");
  });

  it("3b. context-only citations stay unresolved with context reason", () => {
    const c = claim();
    const m = deriveStateOfUnderstanding({
      claims: [c],
      evidence: [evidence(c.id, { direction: "context" })],
    });
    expect(m.unresolvedClaims).toHaveLength(1);
    expect(m.unresolvedClaims[0].statusReason).toContain("awaiting directional evidence");
  });

  it("4. excludes retracted claims from every bucket", () => {
    const c = claim({ isRetracted: true });
    const m = deriveStateOfUnderstanding({ claims: [c], evidence: [evidence(c.id)] });
    expect(m.totalClaims).toBe(0);
    expect(m.supportedClaims).toHaveLength(0);
  });

  it("5. excludes soft-deleted claims", () => {
    const c = claim({ deletedAt: "2026-02-01T00:00:00Z" });
    const m = deriveStateOfUnderstanding({ claims: [c], evidence: [] });
    expect(m.totalClaims).toBe(0);
    expect(m.unresolvedClaims).toHaveLength(0);
  });

  it("6. supporting evidence keeps supported state", () => {
    const c = claim();
    const m = deriveStateOfUnderstanding({
      claims: [c],
      evidence: [evidence(c.id), evidence(c.id, { direction: "support" })],
    });
    expect(m.supportedClaims[0].supportingEvidenceCount).toBe(2);
  });

  it("7. contradicting evidence flips to contested", () => {
    const c = claim();
    const withSupport = deriveStateOfUnderstanding({ claims: [c], evidence: [evidence(c.id)] });
    expect(withSupport.supportedClaims).toHaveLength(1);
    const withChallenge = deriveStateOfUnderstanding({
      claims: [c],
      evidence: [evidence(c.id), evidence(c.id, { direction: "contradict" })],
    });
    expect(withChallenge.contestedClaims).toHaveLength(1);
    expect(withChallenge.supportedClaims).toHaveLength(0);
  });
});

describe("deriveStateOfUnderstanding — claim relations", () => {
  it("8a. supports-edges add connection context without changing state", () => {
    const a = claim({ content: "Claim A" });
    const b = claim({ content: "Claim B" });
    const m = deriveStateOfUnderstanding({
      claims: [a, b],
      evidence: [evidence(a.id), evidence(b.id)],
      claimRelations: [relation(a.id, b.id, "supports")],
    });
    expect(m.supportedClaims).toHaveLength(2);
    const summaryB = m.supportedClaims.find((s) => s.claim.id === b.id)!;
    expect(summaryB.connectionCounts.supports).toBe(1);
    expect(summaryB.connections[0].direction).toBe("incoming");
  });

  it("8b. refines-edges add connection context without changing state", () => {
    const a = claim();
    const b = claim();
    const m = deriveStateOfUnderstanding({
      claims: [a, b],
      evidence: [evidence(b.id)],
      claimRelations: [relation(a.id, b.id, "refines")],
    });
    expect(m.supportedClaims).toHaveLength(1);
    expect(m.supportedClaims[0].connectionCounts.refines).toBe(1);
  });

  it("8c. evidenced contradicts-edge elevates a supported target to contested", () => {
    const target = claim({ content: "Target claim" });
    const challenger = claim({ content: "Challenger claim" });
    const m = deriveStateOfUnderstanding({
      claims: [target, challenger],
      evidence: [evidence(target.id), evidence(challenger.id)],
      claimRelations: [relation(challenger.id, target.id, "contradicts")],
    });
    expect(m.supportedClaims.map((s) => s.claim.id)).toEqual([challenger.id]);
    expect(m.contestedClaims.map((s) => s.claim.id)).toEqual([target.id]);
    expect(m.contestedClaims[0].challengedByClaimIds).toEqual([challenger.id]);
    expect(m.contestedClaims[0].statusReason).toContain("evidenced connected claim");
  });

  it("8d. UNEVIDENCED challengers do not elevate (no assertion wars)", () => {
    const target = claim();
    const challenger = claim();
    const m = deriveStateOfUnderstanding({
      claims: [target, challenger],
      evidence: [evidence(target.id)],
      claimRelations: [relation(challenger.id, target.id, "contradicts")],
    });
    expect(m.supportedClaims.map((s) => s.claim.id)).toEqual([target.id]);
    expect(m.contestedClaims).toHaveLength(0);
    expect(m.unresolvedClaims.map((s) => s.claim.id)).toEqual([challenger.id]);
  });

  it("8e. relations touching retracted claims are ignored", () => {
    const target = claim();
    const challenger = claim({ isRetracted: true });
    const m = deriveStateOfUnderstanding({
      claims: [target, challenger],
      evidence: [evidence(target.id), evidence(challenger.id)],
      claimRelations: [relation(challenger.id, target.id, "contradicts")],
    });
    expect(m.supportedClaims.map((s) => s.claim.id)).toEqual([target.id]);
  });

  it("9. interconnected chains classify each claim independently", () => {
    const a = claim({ content: "A" });
    const b = claim({ content: "B" });
    const c = claim({ content: "C" });
    const m = deriveStateOfUnderstanding({
      claims: [a, b, c],
      evidence: [evidence(a.id), evidence(b.id, { direction: "contradict" })],
      claimRelations: [
        relation(a.id, b.id, "supports"),
        relation(b.id, c.id, "refines"),
      ],
    });
    expect(m.supportedClaims.map((s) => s.claim.id)).toEqual([a.id]);
    expect(m.contestedClaims.map((s) => s.claim.id)).toEqual([b.id]);
    expect(m.unresolvedClaims.map((s) => s.claim.id)).toEqual([c.id]);
  });

  it("10. cyclic relations terminate without oscillation", () => {
    const a = claim({ content: "A" });
    const b = claim({ content: "B" });
    const m = deriveStateOfUnderstanding({
      claims: [a, b],
      evidence: [evidence(a.id), evidence(b.id)],
      claimRelations: [
        relation(a.id, b.id, "contradicts"),
        relation(b.id, a.id, "contradicts"),
      ],
    });
    // Both challengers are evidenced: both elevate. Deterministic, single pass.
    expect(m.contestedClaims).toHaveLength(2);
    expect(m.supportedClaims).toHaveLength(0);
  });
});

describe("deriveStateOfUnderstanding — debate-side, positions, votes, headcount", () => {
  it("11. debate-side subsets classify independently", () => {
    const p = claim({ debateSide: "proposition" });
    const o = claim({ debateSide: "opposition" });
    const prop = deriveStateOfUnderstanding({
      claims: [p],
      evidence: [evidence(p.id)],
    });
    const opp = deriveStateOfUnderstanding({ claims: [o], evidence: [] });
    expect(prop.supportedClaims).toHaveLength(1);
    expect(opp.unresolvedClaims).toHaveLength(1);
  });

  it("12. position/side data has no epistemic effect (documented, not classified)", () => {
    const p1 = claim({ debateSide: "proposition" });
    const p2 = claim({ debateSide: "proposition" });
    const m = deriveStateOfUnderstanding({ claims: [p1, p2], evidence: [] });
    // Two same-side claims, zero evidence: both unresolved. Side counts change nothing.
    expect(m.unresolvedClaims).toHaveLength(2);
    expect(m.roomState.state).toBe("unresolved");
  });

  it("13. votes never affect state, however lopsided", () => {
    const c = claim({ agreeCount: 500, disagreeCount: 1 });
    const m = deriveStateOfUnderstanding({ claims: [c], evidence: [] });
    expect(m.unresolvedClaims).toHaveLength(1);
    expect(m.supportedClaims).toHaveLength(0);
    expect(m.unresolvedClaims[0].totalVotes).toBe(501);
  });

  it("14. headcount never becomes truth (many unevidenced claims stay unresolved)", () => {
    const many = Array.from({ length: 25 }, () => claim());
    const one = claim();
    const m = deriveStateOfUnderstanding({
      claims: [...many, one],
      evidence: [evidence(one.id)],
    });
    expect(m.unresolvedClaims).toHaveLength(25);
    expect(m.supportedClaims).toHaveLength(1);
    expect(m.roomState.state).toBe("unresolved");
  });

  it("14b. arguments are contextual only, even when one-sided", () => {
    const c = claim();
    const args = Array.from({ length: 5 }, () => argument(c.id, { stance: "supporting" }));
    const m = deriveStateOfUnderstanding({ claims: [c], evidence: [], arguments: args });
    expect(m.unresolvedClaims).toHaveLength(1);
    expect(m.unresolvedClaims[0].totalArgumentCount).toBe(5);
  });
});

describe("deriveStateOfUnderstanding — room scope and room-level state", () => {
  it("15. empty room reports framing unresolved with empty reasons", () => {
    const m = deriveStateOfUnderstanding({ claims: [], evidence: [], questions: [] });
    expect(m.hasSufficientData).toBe(false);
    expect(m.roomState).toEqual({
      state: "unresolved",
      framing: true,
      contestedClaimIds: [],
      unresolvedClaimIds: [],
      unresolvedQuestionIds: [],
      supportedClaimIds: [],
    });
  });

  it("16. low-data room (single question) is unresolved, not supported", () => {
    const q = question();
    const m = deriveStateOfUnderstanding({ claims: [], evidence: [], questions: [q] });
    expect(m.hasSufficientData).toBe(true);
    expect(m.roomState.state).toBe("unresolved");
    expect(m.roomState.unresolvedQuestionIds).toEqual([q.id]);
  });

  it("17a. room is contested when any claim is contested", () => {
    const s = claim();
    const c = claim();
    const m = deriveStateOfUnderstanding({
      claims: [s, c],
      evidence: [evidence(s.id), evidence(c.id, { direction: "contradict" })],
    });
    expect(m.roomState.state).toBe("contested");
    expect(m.roomState.contestedClaimIds).toEqual([c.id]);
    expect(m.roomState.supportedClaimIds).toEqual([s.id]);
  });

  it("17b. room is unresolved when open items exist but nothing contested", () => {
    const s = claim();
    const u = claim();
    const q = question();
    const m = deriveStateOfUnderstanding({
      claims: [s, u],
      evidence: [evidence(s.id)],
      questions: [q],
    });
    expect(m.roomState.state).toBe("unresolved");
  });

  it("17c. room is supported only when every item is resolved", () => {
    const a = claim();
    const b = claim();
    const m = deriveStateOfUnderstanding({
      claims: [a, b],
      evidence: [evidence(a.id), evidence(b.id)],
      questions: [],
    });
    expect(m.roomState.state).toBe("supported");
    expect(m.roomState.supportedClaimIds).toEqual(expect.arrayContaining([a.id, b.id]));
  });

  it("17d. room state is presence-based, not largest-bucket: one contested beats many supported", () => {
    const supported = Array.from({ length: 9 }, () => claim());
    const disputed = claim();
    const m = deriveStateOfUnderstanding({
      claims: [...supported, disputed],
      evidence: [
        ...supported.map((c) => evidence(c.id)),
        evidence(disputed.id, { direction: "contradict" }),
      ],
    });
    expect(m.supportedClaims).toHaveLength(9);
    expect(m.roomState.state).toBe("contested");
  });

  it("18. output shape is stable for UI consumers (aliases + roomState)", () => {
    const c = claim();
    const m = deriveStateOfUnderstanding({ claims: [c], evidence: [evidence(c.id)] });
    expect(m.substantiatedClaims).toBe(m.supportedClaims);
    expect(m.unevidencedClaims).toBe(m.unresolvedClaims);
    expect(m.roomState.supportedClaimIds).toEqual([c.id]);
    expect(typeof m.evidenceCoveragePercentage).toBe("number");
  });
});
