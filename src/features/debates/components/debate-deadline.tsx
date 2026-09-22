"use client";

import { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { useDebateContext } from "./debate-data-provider";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useUpdateDebateDeadline } from "@/features/debates/hooks/use-debates";
import { formatDate } from "@/lib/date";
import { toast } from "@/components/ui/toast";

/** ISO timestamptz -> datetime-local wall value (user-local, minute precision). */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Informational participation deadline for a debate room.
 *
 * Everyone sees "Closes <date>" when a deadline exists (calm, muted — never
 * urgency/gamification styling). Only the room creator sees the subtle edit
 * affordance; authorization is enforced server-side by the existing RLS
 * policy "Debate creators can update debates". A passed deadline changes
 * nothing about status or access — the line simply remains factual.
 */
export function DebateDeadlineLine() {
  const { room, debate } = useDebateContext();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const mutation = useUpdateDebateDeadline(room.id);

  const isCreator = Boolean(user?.id && room.createdBy && user.id === room.createdBy);

  const beginEdit = () => {
    setDraft(debate.closesAt ? toLocalInputValue(debate.closesAt) : "");
    setLocalError(null);
    setIsEditing(true);
  };

  const save = () => {
    setLocalError(null);
    if (!draft) {
      setLocalError("Choose a date and time, or clear the deadline.");
      return;
    }
    const ts = new Date(draft).getTime();
    if (!Number.isFinite(ts)) {
      setLocalError("Please provide a valid date and time.");
      return;
    }
    if (ts <= Date.now()) {
      setLocalError("The deadline must be in the future. Clear it for an open-ended debate.");
      return;
    }
    mutation.mutate(new Date(draft).toISOString(), {
      onSuccess: () => {
        setIsEditing(false);
        toast.success("Debate deadline updated.");
      },
      onError: (err) => {
        setLocalError(err instanceof Error ? err.message : "Failed to update deadline.");
      },
    });
  };

  const clear = () => {
    setLocalError(null);
    mutation.mutate(null, {
      onSuccess: () => {
        setIsEditing(false);
        toast.success("Deadline cleared. The debate is now open-ended.");
      },
      onError: (err) => {
        setLocalError(err instanceof Error ? err.message : "Failed to clear deadline.");
      },
    });
  };

  if (!debate.closesAt && !isCreator) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {debate.closesAt && (
        <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/40">
          <Calendar aria-hidden="true" className="h-3 w-3" />
          <span>Closes {formatDate(debate.closesAt, { month: "short", day: "numeric", year: "numeric" })}</span>
        </span>
      )}
      {isCreator && !isEditing && (
        <button
          type="button"
          onClick={beginEdit}
          className="inline-flex min-h-[28px] items-center rounded-md px-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
        >
          {debate.closesAt ? "Edit deadline" : "Add deadline"}
        </button>
      )}
      {isCreator && isEditing && (
        <span className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2 py-1.5">
          <label htmlFor="debate-deadline-input" className="sr-only">
            Participation deadline
          </label>
          <input
            id="debate-deadline-input"
            type="datetime-local"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={mutation.isPending}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary disabled:opacity-60"
          />
          <button
            type="button"
            onClick={save}
            disabled={mutation.isPending}
            className="inline-flex min-h-[28px] items-center rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </button>
          {debate.closesAt && (
            <button
              type="button"
              onClick={clear}
              disabled={mutation.isPending}
              className="inline-flex min-h-[28px] items-center rounded-md px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-60 cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            disabled={mutation.isPending}
            className="inline-flex min-h-[28px] items-center rounded-md px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60 cursor-pointer"
          >
            Cancel
          </button>
          {localError && (
            <span role="alert" className="w-full text-[11px] text-destructive">
              {localError}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
