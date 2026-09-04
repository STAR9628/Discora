"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuestions, useCreateQuestion, useRetractQuestion } from "@/features/discussions/hooks/use-discussions";
import { questionSchema, type QuestionFormValues } from "@/features/discussions/validation";
import { AlertCircle, HelpCircle, Loader2, User, Send, RotateCcw, ArrowRight, Flag } from "lucide-react";
import type { DiscussionQuestion } from "../types";
import type { QuestionType } from "@/types/domain";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/date";

interface QuestionListProps {
  roomId: string;
  onSelectQuestion: (question: DiscussionQuestion) => void;
  onReportQuestion: (question: DiscussionQuestion) => void;
  questions?: DiscussionQuestion[] | undefined;
  isLoading?: boolean;
}

export function QuestionList({
  roomId,
  onSelectQuestion,
  onReportQuestion,
  questions: externalQuestions,
  isLoading: externalLoading,
}: QuestionListProps) {
  const { user } = useAuth();
  const internalQuestions = useQuestions(roomId, externalQuestions === undefined);
  const questions = externalQuestions !== undefined ? externalQuestions : internalQuestions.data;
  const isQuestionsLoading = externalQuestions !== undefined ? (externalLoading ?? false) : internalQuestions.isLoading;
  const questionsError = externalQuestions !== undefined ? null : (internalQuestions.error as Error | null);
  const createMutation = useCreateQuestion(roomId);
  const retractMutation = useRetractQuestion(roomId);

  const [formError, setFormError] = useState<string | null>(null);
  const [pendingRetractId, setPendingRetractId] = useState<string | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      content: "",
      questionType: "information",
      identityMode: "public",
    },
  });

  const [anonymousQuestion, setAnonymousQuestion] = useState(false);

  const contentText = watch("content") || "";

  const onSubmit = async (data: QuestionFormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        roomId,
        content: data.content,
        questionType: data.questionType as QuestionType,
        identityMode: anonymousQuestion ? "anonymous" : "public",
      });
      reset();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to ask question.");
    }
  };

  const handleRetract = (e: React.MouseEvent, questionId: string) => {
    e.stopPropagation();
    setPendingRetractId(questionId);
  };

  const executeRetract = async () => {
    if (!pendingRetractId) return;
    try {
      await retractMutation.mutateAsync(pendingRetractId);
    } catch (err) {
      toast.error("Failed to retract question.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPendingRetractId(null);
    }
  };

  // Badge styles based on question type
  const getBadgeStyles = (type: string) => {
    switch (type) {
      case "information":
        return "bg-blue-500/10 border-blue-500/25 text-blue-400";
      case "clarification":
        return "bg-purple-500/10 border-purple-500/25 text-purple-400";
      case "perspective":
        return "bg-orange-500/10 border-orange-500/25 text-orange-400";
      case "evidence":
        return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
      case "directional":
        return "bg-amber-500/10 border-amber-500/25 text-amber-400";
      case "reflective":
        return "bg-pink-500/10 border-pink-500/25 text-pink-400";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Ask a Question Form (Only authenticated users) */}
      {user ? (
        <div className="rounded-2xl border border-border bg-card/35 p-6 backdrop-blur-md shadow-lg space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Ask a Discussion Question</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Propose an open guiding question to explore key facets and frame claims in this discussion.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Content Field */}
            <div className="space-y-1.5">
              <label htmlFor="content" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Question Statement
              </label>
              <div className="relative">
                <textarea
                  id="content"
                  rows={3}
                  placeholder="State a clear, open-minded question to frame claims and evidence..."
                  className={`w-full rounded-xl border bg-background/50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 ${errors.content ? "border-destructive" : "border-input"
                    }`}
                  disabled={createMutation.isPending}
                  {...register("content")}
                />
                <span className={`absolute bottom-3 right-3 text-[10px] font-semibold ${contentText.length > 500 || contentText.length < 5 ? "text-muted-foreground" : "text-primary/75"
                  }`}>
                  {contentText.length} / 500
                </span>
              </div>
              {errors.content && (
                <p className="text-xs font-semibold text-destructive mt-1">{errors.content.message}</p>
              )}
            </div>

            {/* Grid selectors for Question Type */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Question Type
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                {(["information", "clarification", "perspective", "evidence", "directional", "reflective"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card/40 cursor-pointer select-none transition-all hover:bg-card/70 hover:border-muted-foreground/30 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.04]"
                  >
                    <input
                      type="radio"
                      value={type}
                      className="sr-only"
                      disabled={createMutation.isPending}
                      {...register("questionType")}
                    />
                    <span className="text-[11px] font-bold capitalize text-foreground">{type}</span>
                  </label>
                ))}
              </div>
              {errors.questionType && (
                <p className="text-xs font-semibold text-destructive mt-1">{errors.questionType.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4">
              {/* Anonymous Mode Option */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={anonymousQuestion}
                  onChange={(e) => {
                    setAnonymousQuestion(e.target.checked);
                    setValue("identityMode", e.target.checked ? "anonymous" : "public");
                  }}
                  className="rounded border-input text-primary accent-primary h-4 w-4 cursor-pointer"
                  disabled={createMutation.isPending}
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">Ask Anonymously</p>
                  <p className="text-[10px] text-muted-foreground leading-none">Redact your identity from this question</p>
                </div>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={createMutation.isPending || contentText.trim().length < 5}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 self-end sm:self-auto"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Ask Question</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* 2. Question Listing */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span>Discussion Questions</span>
            {questions && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {questions.length}
              </span>
            )}
          </h4>
          <p className="text-xs text-muted-foreground">
            Open questions that help explore what this discussion is really about.
          </p>
        </div>

        {isQuestionsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl border border-border bg-card/25 p-5 animate-pulse space-y-3">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : questionsError ? (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">Failed to load questions: {(questionsError as Error).message}</p>
          </div>
        ) : questions?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-3">
            <div className="mx-auto rounded-full bg-muted/40 p-3 w-fit text-muted-foreground">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No questions asked yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Be the first to frame the room discussion with a question.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {questions?.map((question) => {
              const isQuestionAnon = question.identityMode === "anonymous";
              const isQuestionDeleted = question.username === "Deleted User";
              const isOwnQuestion = question.createdBy === user?.id;

              return (
                <div
                  id={`q-${question.id}`}
                  key={question.id}
                  onClick={() => onSelectQuestion(question)}
                  className={`rounded-2xl border border-border/50 bg-card/30 p-5 space-y-3 transition-all hover:bg-card/45 hover:shadow-md relative cursor-pointer border-l-4 border-l-violet-500/60 shadow-sm backdrop-blur-sm ${question.isRetracted ? "opacity-60 grayscale-[15%]" : ""
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Top Row: Type Badge & Retracted tag */}
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-violet-400 border border-violet-500/20">
                        Question
                      </span>
                      <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getBadgeStyles(question.questionType)
                        }`}>
                        {question.questionType}
                      </span>
                      {question.isRetracted && (
                        <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                          Retracted
                        </span>
                      )}
                    </div>

                    {/* Retraction & Report options */}
                    <div className="flex items-center gap-3">
                      {isOwnQuestion && !question.isRetracted && (
                        <button
                          onClick={(e) => handleRetract(e, question.id)}
                          disabled={retractMutation.isPending}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive hover:opacity-85 transition-opacity cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Retract</span>
                        </button>
                      )}
                      {user && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReportQuestion(question);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Flag className="h-3.5 w-3.5 text-destructive/75" />
                          <span>Report</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content Statement */}
                  <p className="text-sm leading-relaxed text-foreground font-semibold">
                    {question.content}
                  </p>

                  {/* Metadata Row: Profile, Date & View claims trigger */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
                        {question.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={question.avatarUrl}
                            alt={`${question.username}'s avatar`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground/60" />
                        )}
                      </div>
                      <span className={`font-bold ${isQuestionAnon
                          ? "text-muted-foreground"
                          : isQuestionDeleted
                            ? "text-destructive/75"
                            : "text-foreground"
                        }`}>
                        {isQuestionAnon ? "Anonymous" : question.username || "Unknown User"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">•</span>
                      <span className="text-[10px] text-muted-foreground/80">
                        {formatDate(question.createdAt, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-primary hover:underline">
                      <span>View & Assert Answers</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingRetractId}
        title="Retract question?"
        description="This action is irreversible. The question will be permanently retracted."
        confirmLabel="Retract"
        variant="danger"
        onConfirm={executeRetract}
        onCancel={() => setPendingRetractId(null)}
      />
    </div>
  );
}
