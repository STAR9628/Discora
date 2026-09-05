"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useTopics } from "@/features/discussions/hooks/use-discussions";
import { useCreateDebate, useCreatePrivateDebate } from "@/features/debates/hooks/use-debates";
import { debateSchema, type DebateFormValues } from "@/features/discussions/validation";
import type { CreatedDebateResult } from "@/features/debates/services/debate-service";
import { Loader2, AlertCircle, Swords, Check, Lock, Globe } from "lucide-react";

export function CreateDebateForm() {
  const router = useRouter();
  const { user, status } = useAuth();
  const { data: topics, isLoading: isTopicsLoading, error: topicsError } = useTopics();
  const createDebateMutation = useCreateDebate();
  const createPrivateDebateMutation = useCreatePrivateDebate();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DebateFormValues>({
    resolver: zodResolver(debateSchema),
    defaultValues: {
      title: "",
      description: "",
      openingStatement: "",
      topicId: "",
    },
  });

  const selectedTopicId = watch("topicId");
  const openingStatementText = watch("openingStatement") || "";

  useEffect(() => {
    if (status === "guest") {
      router.push("/login?redirectedFrom=/debates/create");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying authentication status...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const onSubmit = async (values: DebateFormValues) => {
    setFormError(null);
    try {
      let roomSlug: string | undefined;
      if (isPrivate) {
        const debateResult = await createPrivateDebateMutation.mutateAsync({
          title: values.title,
          description: values.description || undefined,
          topicId: values.topicId,
          propositionTitle: "Supports the motion",
          oppositionTitle: "Opposes the motion",
          openingStatement: values.openingStatement,
        }) as CreatedDebateResult;
        roomSlug = debateResult?.room?.slug;
      } else {
        const debateResult = await createDebateMutation.mutateAsync({
          title: values.title,
          description: values.description || undefined,
          topicId: values.topicId,
          openingStatement: values.openingStatement,
        });
        roomSlug = debateResult?.room?.slug;
      }

      if (roomSlug) {
        router.push(`/debates/${roomSlug}`);
      } else {
        throw new Error("Invalid response received from service layer.");
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while creating the debate.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur-md md:p-8">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Swords className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Create a New Debate
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up a structured debate with proposition and opposition sides. Participants choose sides and assert claims.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {formError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">{formError}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold flex items-center justify-between">
            <span>Debate Title</span>
            <span className="text-xs text-muted-foreground font-normal">Required</span>
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Universal Basic Income: Solution or Burden?"
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

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-semibold flex items-center justify-between">
            <span>Description</span>
            <span className="text-xs text-muted-foreground font-normal">Optional (Max 300 chars)</span>
          </label>
          <input
            id="description"
            type="text"
            placeholder="Provide context or a brief sub-headline for this debate."
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

        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center justify-between">
            <span>Visibility</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                !isPrivate
                  ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                  : "border-border bg-card hover:border-muted-foreground/30"
              }`}
            >
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Public</p>
                <p className="text-xs text-muted-foreground">Anyone can discover and join</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                isPrivate
                  ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                  : "border-border bg-card hover:border-muted-foreground/30"
              }`}
            >
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Private</p>
                <p className="text-xs text-muted-foreground">Invite-only or access code</p>
              </div>
            </button>
          </div>
        </div>

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

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-muted-foreground space-y-2">
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="font-semibold text-blue-400">Proposition &mdash; <span className="text-foreground/70">Supports the motion</span></span>
          </p>
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="font-semibold text-rose-400">Opposition &mdash; <span className="text-foreground/70">Opposes the motion</span></span>
          </p>
          <p className="text-[10px] text-muted-foreground/60 pt-1">You will automatically join the Proposition side. Other participants can join either side.</p>
        </div>

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
            placeholder="Frame the debate by introducing the core tension, context, and what is at stake. (Minimum 100 characters)"
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
                <span>Launching Debate...</span>
              </>
            ) : (
              <>
                <Swords className="h-4 w-4" />
                <span>Launch Debate</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
