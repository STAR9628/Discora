"use client";

import { useRouter } from "next/navigation";
import {
  useClaims,
  useRoomEvidence,
  useQuestions,
  useClaimRelations,
  useRoomArguments,
} from "@/features/discussions/hooks/use-discussions";
import { useInquiryCountsForRoom } from "@/features/debates/hooks/use-inquiries";
import { StateOfUnderstanding } from "./state-of-understanding";
import type {
  DiscussionArgument,
  DiscussionClaim,
  DiscussionClaimRelation,
  DiscussionEvidence,
  DiscussionQuestion,
} from "@/features/discussions/types";

export function DiscussionOverviewUnderstanding({
  roomId,
  slug,
  initialClaims,
  initialEvidence,
  initialQuestions,
  initialRelations,
  initialInquiryCounts,
  initialArguments,
}: {
  roomId: string;
  slug: string;
  /**
   * Server-rendered SoU inputs (public rooms only). Same calls the client
   * makes, executed once on the server so SSR HTML carries the deterministic
   * understanding; client interactivity continues unchanged.
   */
  initialClaims?: DiscussionClaim[];
  initialEvidence?: DiscussionEvidence[];
  initialQuestions?: DiscussionQuestion[];
  initialRelations?: DiscussionClaimRelation[];
  initialInquiryCounts?: Record<string, number>;
  initialArguments?: DiscussionArgument[];
}) {
  const router = useRouter();
  const { data: claims, isLoading: isClaimsLoading } = useClaims(roomId, undefined, true, initialClaims);
  const { data: roomEvidence, isLoading: isEvidenceLoading } = useRoomEvidence(roomId, true, initialEvidence);
  const { data: questions, isLoading: isQuestionsLoading } = useQuestions(roomId, true, initialQuestions);
  const { data: claimRelations } = useClaimRelations(roomId, true, initialRelations);
  const { data: inquiryCounts } = useInquiryCountsForRoom(roomId, initialInquiryCounts);
  const { data: roomArguments } = useRoomArguments(roomId, true, initialArguments);

  const isLoading = isClaimsLoading || isEvidenceLoading || isQuestionsLoading;

  const handleNavigateToClaim = (claimId: string, options?: { autoOpenEvidence?: boolean }) => {
    if (options?.autoOpenEvidence) {
      router.push(`/discussions/${slug}/claims?highlight=${claimId}&addEvidence=true`);
    } else {
      router.push(`/discussions/${slug}/claims?highlight=${claimId}`);
    }
  };

  const handleNavigateToEvidence = (evidenceId?: string) => {
    if (evidenceId) {
      router.push(`/discussions/${slug}/evidence?highlight=${evidenceId}`);
    } else {
      router.push(`/discussions/${slug}/evidence`);
    }
  };

  const handleNavigateToQuestions = (questionId?: string) => {
    if (questionId) {
      router.push(`/discussions/${slug}/questions?question=${questionId}`);
    } else {
      router.push(`/discussions/${slug}/questions`);
    }
  };

  return (
    <StateOfUnderstanding
      claims={claims}
      roomEvidence={roomEvidence}
      questions={questions}
      claimRelations={claimRelations}
      inquiryCounts={inquiryCounts}
      arguments={roomArguments}
      isLoading={isLoading}
      onNavigateToClaim={handleNavigateToClaim}
      onNavigateToEvidence={handleNavigateToEvidence}
      onNavigateToQuestions={handleNavigateToQuestions}
    />
  );
}
