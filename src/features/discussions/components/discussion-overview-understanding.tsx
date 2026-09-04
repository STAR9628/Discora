"use client";

import { useRouter } from "next/navigation";
import {
  useClaims,
  useRoomEvidence,
  useQuestions,
  useClaimRelations,
} from "@/features/discussions/hooks/use-discussions";
import { useInquiryCountsForRoom } from "@/features/debates/hooks/use-inquiries";
import { StateOfUnderstanding } from "./state-of-understanding";

export function DiscussionOverviewUnderstanding({
  roomId,
  slug,
}: {
  roomId: string;
  slug: string;
}) {
  const router = useRouter();
  const { data: claims, isLoading: isClaimsLoading } = useClaims(roomId);
  const { data: roomEvidence, isLoading: isEvidenceLoading } = useRoomEvidence(roomId);
  const { data: questions, isLoading: isQuestionsLoading } = useQuestions(roomId);
  const { data: claimRelations } = useClaimRelations(roomId);
  const { data: inquiryCounts } = useInquiryCountsForRoom(roomId);

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
      isLoading={isLoading}
      onNavigateToClaim={handleNavigateToClaim}
      onNavigateToEvidence={handleNavigateToEvidence}
      onNavigateToQuestions={handleNavigateToQuestions}
    />
  );
}
