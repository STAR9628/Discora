"use client";

import { ClaimList } from "./claim-list";
import { QuestionList } from "./question-list";
import { RoomEvidenceSection } from "./room-evidence-section";
import { SectionTargetCard, SectionTargetLoader, SectionTargetError, targetMetaForClaim, targetMetaForEvidence } from "./section-target-card";
import {
  usePaginatedClaims,
  useClaimTarget,
  usePaginatedEvidence,
  useEvidenceTarget,
  usePaginatedQuestions,
  useQuestionTarget,
  useClaimsByIds,
} from "@/features/discussions/hooks/use-discussions";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, HelpCircle, Loader2 } from "lucide-react";
import type { DiscussionQuestion } from "../types";

const DEFAULT_PAGE_SIZE = 15;

function LoadMoreButton({
  hasMore,
  isLoadingMore,
  onLoadMore,
  label,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  label: string;
}) {
  if (!hasMore) return null;
  return (
    <button
      onClick={onLoadMore}
      disabled={isLoadingMore}
      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/30 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-card/50 transition-colors cursor-pointer disabled:opacity-50"
    >
      {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      <span>{isLoadingMore ? "Loading…" : label}</span>
    </button>
  );
}

export function DiscussionClaimsSection({ roomId, highlightId }: { roomId: string; highlightId?: string | null }) {
  const {
    items: claims,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedClaims(roomId, { pageSize: DEFAULT_PAGE_SIZE });

  const inLoadedPage = claims.some((c) => c.id === highlightId);
  const targetQuery = useClaimTarget(!inLoadedPage ? highlightId : null, roomId);

  return (
    <div className="space-y-4">
      {highlightId && !inLoadedPage && (
        <>
          {targetQuery.isLoading ? (
            <SectionTargetLoader kind="claim" />
          ) : targetQuery.error ? (
            <SectionTargetError kind="claim" message={(targetQuery.error as Error).message} />
          ) : targetQuery.data ? (
            <SectionTargetCard
              label="Claim"
              content={targetQuery.data.content}
              meta={targetMetaForClaim(targetQuery.data)}
              kind="claim"
            />
          ) : null}
        </>
      )}

      <ClaimList roomId={roomId} scrollToClaimId={highlightId} debateSide={null} claims={claims} isLoading={isLoading} />

      {error ? (
        <div className="text-xs text-destructive">Failed to load claims: {(error as Error).message}</div>
      ) : null}

      <LoadMoreButton hasMore={hasMore} isLoadingMore={isLoadingMore} onLoadMore={loadMore} label="Load more claims" />
    </div>
  );
}

export function DiscussionEvidenceSection({ roomId, highlightId }: { roomId: string; highlightId?: string | null }) {
  const {
    items: evidence,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedEvidence(roomId, { pageSize: DEFAULT_PAGE_SIZE });

  const claimIds = useMemo(() => [...new Set(evidence.map((e) => e.claimId))], [evidence]);
  const { data: claims = [] } = useClaimsByIds(claimIds, roomId);

  const inLoadedPage = evidence.some((e) => e.id === highlightId);
  const targetQuery = useEvidenceTarget(!inLoadedPage ? highlightId : null, roomId);

  return (
    <div className="space-y-4">
      {highlightId && !inLoadedPage && (
        <>
          {targetQuery.isLoading ? (
            <SectionTargetLoader kind="evidence" />
          ) : targetQuery.error ? (
            <SectionTargetError kind="evidence" message={(targetQuery.error as Error).message} />
          ) : targetQuery.data ? (
            <SectionTargetCard
              label="Evidence"
              content={targetQuery.data.content}
              meta={targetMetaForEvidence(targetQuery.data)}
              kind="evidence"
            />
          ) : null}
        </>
      )}

      <RoomEvidenceSection roomId={roomId} claims={claims} evidenceList={evidence} isLoading={isLoading} />
      {error ? (
        <div className="text-xs text-destructive">Failed to load evidence: {(error as Error).message}</div>
      ) : null}
      <LoadMoreButton hasMore={hasMore} isLoadingMore={isLoadingMore} onLoadMore={loadMore} label="Load more evidence" />
    </div>
  );
}

export function DiscussionQuestionsSection({ roomId }: { roomId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const questionId = searchParams.get("question");

  const {
    items: questions,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMore,
  } = usePaginatedQuestions(roomId, { pageSize: DEFAULT_PAGE_SIZE });

  const inLoadedPage = questions.some((q) => q.id === questionId);
  const targetQuery = useQuestionTarget(!inLoadedPage ? questionId : null, roomId);

  useEffect(() => {
    if (!questionId) return;
    const timer = window.setTimeout(() => document.getElementById(`q-${questionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    return () => window.clearTimeout(timer);
  }, [questionId]);

  const selectedQuestion = questions?.find((question) => question.id === questionId) ?? null;

  if (selectedQuestion) {
    return <SelectedQuestion roomId={roomId} question={selectedQuestion} />;
  }

  return (
    <div className="space-y-4">
      {questionId && !inLoadedPage && (
        <>
          {targetQuery.isLoading ? (
            <SectionTargetLoader kind="question" />
          ) : targetQuery.error ? (
            <SectionTargetError kind="question" message={(targetQuery.error as Error).message} />
          ) : targetQuery.data ? (
            <SelectedQuestion roomId={roomId} question={targetQuery.data} />
          ) : null}
        </>
      )}

      <QuestionList
        roomId={roomId}
        questions={questions}
        isLoading={isLoading}
        onSelectQuestion={(question) => router.push(`?question=${question.id}`)}
        onReportQuestion={() => undefined}
      />

      <LoadMoreButton hasMore={hasMore} isLoadingMore={isLoadingMore} onLoadMore={loadMore} label="Load more questions" />
    </div>
  );
}

function SelectedQuestion({ roomId, question }: { roomId: string; question: DiscussionQuestion }) {
  return <div className="space-y-6"><div className="rounded-2xl border border-border bg-card/40 p-5 shadow-md"><button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to all questions</button><div className="mt-4 flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /><span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">{question.questionType}</span></div><h2 className="mt-2 text-lg font-bold text-foreground">{question.content}</h2></div><div><h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Claims answering this question</h3><ClaimList roomId={roomId} questionId={question.id} debateSide={null} /></div></div>;
}
