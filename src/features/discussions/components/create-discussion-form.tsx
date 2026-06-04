"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useTopics, useCreateDiscussion } from "@/features/discussions/hooks/use-discussions";
import { discussionSchema, type DiscussionFormValues } from "@/features/discussions/validation";
import { Loader2, AlertCircle, Sparkles, MessageSquarePlus, Check } from "lucide-react";

export function CreateDiscussionForm() {
  const router = useRouter();
  const { user, status } = useAuth();
  const { data: topics, isLoading: isTopicsLoading, error: topicsError } = useTopics();
  const createDiscussionMutation = useCreateDiscussion();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DiscussionFormValues>({
    resolver: zodResolver(discussionSchema),
    defaultValues: {
      title: "",
      description: "",
      openingStatement: "",
      summary: "",
      topicId: "",
    },
  });

  const selectedTopicId = watch("topicId");
  const openingStatementText = watch("openingStatement") || "";

  // Redirect guest users to login
  useEffect(() => {
    if (status === "guest") {
      router.push("/login?redirectedFrom=/discussions/create");
    }
  }, [status, router]);

  // Loading state for auth check
  if (status === "loading") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying authentication status...</p>
      </div>
    );
  }

  // Prevent flash of form before redirect completes
  if (!user) {
    return null;
  }

  const onSubmit = async (values: DiscussionFormValues) => {
    setFormError(null);
    try {
      const result = await createDiscussionMutation.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        topicId: values.topicId,
        openingStatement: values.openingStatement,
        summary: values.summary || undefined,
      });

      if (result?.room?.slug) {
        // Successful submission -> Redirect to new discussion room
        router.push(`/discussions/${result.room.slug}`);
      } else {
        throw new Error("Invalid response received from service layer.");
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while creating the discussion.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur-md md:p-8">
      {/* Form Header */}
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <MessageSquarePlus className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Create a New Discussion
          </h1>
          <p className="text-sm text-muted-foreground">
            Start an open-ended discourse under any topic. Encourage structured arguments and constructive inputs.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Alert banner */}
        {formError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">{formError}</p>
          </div>
        )}

        {/* Title Field */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold flex items-center justify-between">
            <span>Title</span>
            <span className="text-xs text-muted-foreground font-normal">Required</span>
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Is remote work sustainably productive?"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.title.message}</span>
            </p>
          )}
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-semibold flex items-center justify-between">
            <span>Description</span>
            <span className="text-xs text-muted-foreground font-normal">Optional (Max 300 chars)</span>
          </label>
          <input
            id="description"
            type="text"
            placeholder="Provide context or a brief sub-headline for this discussion."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.description.message}</span>
            </p>
          )}
        </div>

        {/* Topic Selection Field */}
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center justify-between">
            <span>Select Category / Topic</span>
            <span className="text-xs text-muted-foreground font-normal">Required</span>
          </label>
          
          {isTopicsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted/30" />
              ))}
            </div>
          ) : topicsError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <p>Failed to load topics. Please try reloading the page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-56 overflow-y-auto p-1 border border-border/40 rounded-xl bg-muted/10 scrollbar-thin">
              {topics?.map((topic) => {
                const isSelected = selectedTopicId === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setValue("topicId", topic.id, { shouldValidate: true })}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200 outline-none select-none hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold truncate pr-4 text-foreground">{topic.name}</span>
                      {isSelected && (
                        <span className="rounded-full bg-primary p-0.5 text-primary-foreground shadow-sm">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    {topic.description && (
                      <p className="mt-1.5 text-[9px] text-muted-foreground leading-snug line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {errors.topicId && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.topicId.message}</span>
            </p>
          )}
        </div>

        {/* Opening Statement Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="openingStatement" className="text-sm font-semibold">
              Opening Statement
            </label>
            <span
              className={`text-[10px] font-medium transition-colors ${
                openingStatementText.length < 100
                  ? "text-amber-500"
                  : openingStatementText.length > 5000
                  ? "text-destructive"
                  : "text-emerald-500"
              }`}
            >
              {openingStatementText.length} / 5000 (Min 100 chars required)
            </span>
          </div>
          <textarea
            id="openingStatement"
            rows={6}
            placeholder="Write a thorough, evidence-based opening statement introducing the primary premises and context of this discussion. (Minimum 100 characters)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            {...register("openingStatement")}
          />
          {errors.openingStatement && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.openingStatement.message}</span>
            </p>
          )}
        </div>

        {/* Summary Field */}
        <div className="space-y-2">
          <label htmlFor="summary" className="text-sm font-semibold flex items-center justify-between">
            <span>Summary Preview</span>
            <span className="text-xs text-muted-foreground font-normal">Optional (Max 200 chars)</span>
          </label>
          <textarea
            id="summary"
            rows={2}
            placeholder="A short elevator pitch shown in the discussions list so users understand the core argument at a glance."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            {...register("summary")}
          />
          {errors.summary && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.summary.message}</span>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => router.back()}
            className="rounded-lg border border-border bg-card hover:bg-accent/40 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary hover:opacity-90 px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all shadow-md disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Launching Discussion...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Launch Discussion</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
