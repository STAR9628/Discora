"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import {
  useMessages,
  useClaims,
  useRoomEvidence,
  useQuestions,
  useClaimRelations,
} from "@/features/discussions/hooks/use-discussions";
import type {
  DiscussionMessage,
  DiscussionClaim,
  DiscussionEvidence,
  DiscussionQuestion,
  DiscussionClaimRelation,
} from "@/features/discussions/types";

interface RelationCounts {
  outgoingSupports: number;
  outgoingContradicts: number;
  outgoingRefines: number;
  incoming: number;
}

interface DiscussionDataContextType {
  roomId: string;
  messages: DiscussionMessage[] | undefined;
  isMessagesLoading: boolean;
  claims: DiscussionClaim[] | undefined;
  isClaimsLoading: boolean;
  roomEvidence: DiscussionEvidence[] | undefined;
  isEvidenceLoading: boolean;
  questions: DiscussionQuestion[] | undefined;
  isQuestionsLoading: boolean;
  claimRelations: DiscussionClaimRelation[] | undefined;
  claimQuestionMap: Map<string, string>;
  messageToClaimMap: Map<string, DiscussionClaim>;
  messageEvidenceMap: Map<string, number>;
  evidenceCountByClaim: Record<string, number>;
  relationCountsByClaim: Record<string, RelationCounts>;
  claimedMessageIds: Set<string>;
}

const DiscussionDataContext = createContext<DiscussionDataContextType | null>(null);

export function DiscussionDataProvider({
  roomId,
  children,
}: {
  roomId: string;
  children: ReactNode;
}) {
  const { data: messages, isLoading: isMessagesLoading } = useMessages(roomId);
  const { data: claims, isLoading: isClaimsLoading } = useClaims(roomId);
  const { data: roomEvidence, isLoading: isEvidenceLoading } = useRoomEvidence(roomId);
  const { data: questions, isLoading: isQuestionsLoading } = useQuestions(roomId);
  const { data: claimRelations } = useClaimRelations(roomId);

  const claimedMessageIds = useMemo(
    () => new Set(claims?.map((c) => c.originMessageId).filter(Boolean) as string[]),
    [claims]
  );

  const claimQuestionMap = useMemo(() => {
    const map = new Map<string, string>();
    if (claims && questions) {
      const qMap = new Map(questions.map((q) => [q.id, q.content]));
      for (const c of claims) {
        if (c.questionId && qMap.has(c.questionId)) {
          map.set(c.id, qMap.get(c.questionId)!);
        }
      }
    }
    return map;
  }, [claims, questions]);

  const messageToClaimMap = useMemo(() => {
    const map = new Map<string, DiscussionClaim>();
    if (claims) {
      for (const c of claims) {
        if (c.originMessageId) {
          map.set(c.originMessageId, c);
        }
      }
    }
    return map;
  }, [claims]);

  const messageEvidenceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (roomEvidence && claims) {
      for (const c of claims) {
        if (c.originMessageId) {
          const count = roomEvidence.filter((ev) => ev.claimId === c.id).length;
          if (count > 0) {
            map.set(c.originMessageId, count);
          }
        }
      }
    }
    return map;
  }, [roomEvidence, claims]);

  const evidenceCountByClaim = useMemo(() => {
    const counts: Record<string, number> = {};
    if (roomEvidence) {
      for (const ev of roomEvidence) {
        counts[ev.claimId] = (counts[ev.claimId] || 0) + 1;
      }
    }
    return counts;
  }, [roomEvidence]);

  const relationCountsByClaim = useMemo(() => {
    const counts: Record<string, RelationCounts> = {};
    if (claimRelations) {
      for (const rel of claimRelations) {
        if (!counts[rel.sourceClaimId]) {
          counts[rel.sourceClaimId] = { outgoingSupports: 0, outgoingContradicts: 0, outgoingRefines: 0, incoming: 0 };
        }
        if (!counts[rel.targetClaimId]) {
          counts[rel.targetClaimId] = { outgoingSupports: 0, outgoingContradicts: 0, outgoingRefines: 0, incoming: 0 };
        }
        if (rel.relationType === "supports") counts[rel.sourceClaimId].outgoingSupports++;
        else if (rel.relationType === "contradicts") counts[rel.sourceClaimId].outgoingContradicts++;
        else if (rel.relationType === "refines") counts[rel.sourceClaimId].outgoingRefines++;
        counts[rel.targetClaimId].incoming++;
      }
    }
    return counts;
  }, [claimRelations]);

  const value = useMemo(
    () => ({
      roomId,
      messages,
      isMessagesLoading,
      claims,
      isClaimsLoading,
      roomEvidence,
      isEvidenceLoading,
      questions,
      isQuestionsLoading,
      claimRelations,
      claimQuestionMap,
      messageToClaimMap,
      messageEvidenceMap,
      evidenceCountByClaim,
      relationCountsByClaim,
      claimedMessageIds,
    }),
    [
      roomId,
      messages,
      isMessagesLoading,
      claims,
      isClaimsLoading,
      roomEvidence,
      isEvidenceLoading,
      questions,
      isQuestionsLoading,
      claimRelations,
      claimQuestionMap,
      messageToClaimMap,
      messageEvidenceMap,
      evidenceCountByClaim,
      relationCountsByClaim,
      claimedMessageIds,
    ]
  );

  return <DiscussionDataContext.Provider value={value}>{children}</DiscussionDataContext.Provider>;
}

export function useDiscussionData() {
  const ctx = useContext(DiscussionDataContext);
  if (!ctx) {
    throw new Error("useDiscussionData must be used within a DiscussionDataProvider");
  }
  return ctx;
}
