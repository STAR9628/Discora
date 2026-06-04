"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useHasRole } from "@/features/auth/hooks/use-role";
import {
  useModerationHistory,
  usePendingFlags,
  useResolveFlag,
} from "@/features/discussions/hooks/use-discussions";
import type { ModerationFlag, ModerationStatus } from "@/features/discussions/types";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  EyeOff,
  HelpCircle,
  Link2,
  Loader2,
  MessageSquare,
  RotateCcw,
  Shield,
  Trash2,
  User,
} from "lucide-react";

type ModerationAction =
  | "resolved_hidden"
  | "resolved_dismissed"
  | "resolved_restored";

type DashboardTab = "pending" | "history";

export default function ModerationDashboardPage() {
  const { status: authStatus } = useAuth();
  const { data: hasRole, isLoading: isRoleLoading } = useHasRole("moderator");
  const [activeTab, setActiveTab] = useState<DashboardTab>("pending");
  const [confirmAction, setConfirmAction] = useState<{
    flag: ModerationFlag;
    action: ModerationAction;
  } | null>(null);

  const pendingQuery = usePendingFlags();
  const historyQuery = useModerationHistory();
  const resolveMutation = useResolveFlag();

  if (authStatus === "loading" || isRoleLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Verifying authorization...
          </span>
        </div>
      </main>
    );
  }

  if (!hasRole) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center shadow-xl backdrop-blur-md">
          <div className="mx-auto w-fit rounded-full bg-destructive/10 p-3 text-destructive">
            <Shield className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              You do not have the required moderator or administrator privileges
              to view this page.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Go to Home
          </Link>
        </div>
      </main>
    );
  }

  const activeFlags =
    activeTab === "pending" ? pendingQuery.data : historyQuery.data;
  const isLoading =
    activeTab === "pending" ? pendingQuery.isLoading : historyQuery.isLoading;
  const activeError =
    activeTab === "pending" ? pendingQuery.error : historyQuery.error;

  async function handleResolve(flagId: string, action: ModerationAction) {
    try {
      await resolveMutation.mutateAsync({
        id: flagId,
        status: action,
      });
      setConfirmAction(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve report.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            <Shield className="h-7 w-7 text-primary" />
            <span>Moderation Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review pending reports and revisit resolved moderation history.
          </p>
        </div>
        <Link
          href="/settings/profile"
          className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-accent/40"
        >
          Profile settings
        </Link>
      </div>

      <div className="mb-6 inline-flex rounded-xl border border-border bg-card/40 p-1">
        <TabButton
          active={activeTab === "pending"}
          label={`Pending (${pendingQuery.data?.length ?? 0})`}
          onClick={() => setActiveTab("pending")}
        />
        <TabButton
          active={activeTab === "history"}
          label={`History (${historyQuery.data?.length ?? 0})`}
          onClick={() => setActiveTab("history")}
        />
      </div>

      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading moderation {activeTab}...
          </span>
        </div>
      ) : activeError ? (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="font-medium">
            Failed to load moderation {activeTab}: {(activeError as Error).message}
          </p>
        </div>
      ) : !activeFlags || activeFlags.length === 0 ? (
        <EmptyState activeTab={activeTab} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
            <span>
              {activeTab === "pending" ? "Pending Review" : "Resolved History"} (
              {activeFlags.length})
            </span>
            <span>
              {activeTab === "pending"
                ? "Newest pending first"
                : "Newest resolution first"}
            </span>
          </div>

          {activeFlags.map((flag) => (
            <ModerationFlagCard
              key={flag.id}
              flag={flag}
              mode={activeTab}
              isResolving={resolveMutation.isPending}
              onAction={(action) => setConfirmAction({ flag, action })}
            />
          ))}
        </div>
      )}

      {confirmAction && (
        <ConfirmModerationAction
          flag={confirmAction.flag}
          action={confirmAction.action}
          isPending={resolveMutation.isPending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() =>
            void handleResolve(confirmAction.flag.id, confirmAction.action)
          }
        />
      )}
    </main>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ activeTab }: { activeTab: DashboardTab }) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center">
      <div className="mx-auto w-fit rounded-full bg-emerald-500/10 p-3.5 text-emerald-500">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {activeTab === "pending"
            ? "Clean Moderation Queue"
            : "No Moderation History"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {activeTab === "pending"
            ? "There are no pending flags to review at this moment."
            : "Resolved reports will appear here after moderation actions."}
        </p>
      </div>
    </div>
  );
}

function ModerationFlagCard({
  flag,
  mode,
  isResolving,
  onAction,
}: {
  flag: ModerationFlag;
  mode: DashboardTab;
  isResolving: boolean;
  onAction: (action: ModerationAction) => void;
}) {
  const badge = getEntityBadge(flag);
  const BadgeIcon = badge.icon;
  const timestamp = new Date(
    mode === "pending" ? flag.createdAt : flag.resolvedAt ?? flag.createdAt,
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-5 shadow-sm backdrop-blur-md transition-colors hover:bg-card/40 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badge.style}`}
          >
            <BadgeIcon className="h-3 w-3" />
            <span>{badge.label}</span>
          </span>
          <StatusBadge status={flag.status} />
          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{timestamp}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
            {flag.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flag.authorAvatarUrl}
                alt="Author avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-3 w-3 text-muted-foreground/60" />
            )}
          </div>
          <span className="font-bold text-foreground/80">
            {flag.authorUsername || "Anonymous"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-background/45 p-4 text-sm leading-relaxed text-foreground/95">
        <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          Flagged content
        </span>
        <p className="whitespace-pre-wrap italic">
          &ldquo;{flag.content || "[Content hidden or unavailable]"}&rdquo;
        </p>
      </div>

      <div className="space-y-1">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-destructive/80">
          Report Reason
        </span>
        <p className="rounded-lg border border-destructive/10 bg-destructive/5 p-3 text-xs font-medium leading-relaxed text-foreground/90">
          {flag.reason}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/30 pt-4">
        <span className="text-[10px] italic text-muted-foreground/60">
          Flag ID: {flag.id}
        </span>

        {mode === "pending" ? (
          <div className="flex items-center gap-2">
            <ModerationButton
              icon={Trash2}
              label="Dismiss Report"
              disabled={isResolving}
              onClick={() => onAction("resolved_dismissed")}
            />
            <ModerationButton
              icon={EyeOff}
              label="Hide Content"
              variant="destructive"
              disabled={isResolving}
              onClick={() => onAction("resolved_hidden")}
            />
          </div>
        ) : flag.status === "resolved_hidden" ? (
          <ModerationButton
            icon={RotateCcw}
            label="Restore Hidden Content"
            disabled={isResolving}
            onClick={() => onAction("resolved_restored")}
          />
        ) : null}
      </div>
    </div>
  );
}

function ModerationButton({
  icon: Icon,
  label,
  variant = "default",
  disabled,
  onClick,
}: {
  icon: typeof RotateCcw;
  label: string;
  variant?: "default" | "destructive";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === "destructive"
          ? "bg-destructive text-destructive-foreground hover:opacity-90"
          : "border border-border text-foreground hover:bg-accent/40"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  const label = status.replace("resolved_", "");

  return (
    <span className="rounded-lg border border-border bg-muted px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
  );
}

function ConfirmModerationAction({
  flag,
  action,
  isPending,
  onCancel,
  onConfirm,
}: {
  flag: ModerationFlag;
  action: ModerationAction;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md duration-150">
        <div className="flex items-center gap-2.5 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-lg font-bold text-foreground">
            Confirm Moderation Action
          </h3>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            You are about to resolve this report as{" "}
            <span className="font-extrabold capitalize text-foreground">
              {action.replace("resolved_", "")}
            </span>
            .
          </p>
          <ActionWarning flag={flag} action={action} />
        </div>

        <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent/40"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50 ${
              action === "resolved_hidden"
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>Confirm Action</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionWarning({
  flag,
  action,
}: {
  flag: ModerationFlag;
  action: ModerationAction;
}) {
  if (action === "resolved_hidden") {
    return (
      <div className="space-y-1 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
        <span className="block font-bold uppercase tracking-wider">
          Cascade Warning
        </span>
        {flag.claimId ? (
          <p>
            Hiding a claim will hide and cascade-filter all evidence attached to
            this claim in the room.
          </p>
        ) : null}
        {flag.messageId ? (
          <p>
            Hiding a message will redact its content and remove all author
            metadata in the feed view.
          </p>
        ) : null}
        {flag.questionId ? (
          <p>
            Hiding a question will remove it from listings and omit answers from
            question-filtered views.
          </p>
        ) : null}
        {flag.evidenceId ? (
          <p>This evidence card will be removed from associated claim views.</p>
        ) : null}
      </div>
    );
  }

  if (action === "resolved_restored") {
    return (
      <p className="text-xs text-foreground/80">
        Restoring this content will make it visible again wherever moderation
        filters allow it to appear.
      </p>
    );
  }

  return (
    <p className="text-xs text-foreground/80">
      Dismissing this report keeps the content public and records the report as
      reviewed.
    </p>
  );
}

function getEntityBadge(flag: ModerationFlag) {
  if (flag.messageId) {
    return {
      label: "Message",
      icon: MessageSquare,
      style: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    };
  }

  if (flag.questionId) {
    return {
      label: "Question",
      icon: HelpCircle,
      style: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    };
  }

  if (flag.claimId) {
    return {
      label: "Claim",
      icon: Award,
      style: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    };
  }

  if (flag.evidenceId) {
    return {
      label: "Evidence",
      icon: Link2,
      style: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    };
  }

  return {
    label: "Unknown",
    icon: Shield,
    style: "bg-muted border-border text-muted-foreground",
  };
}
