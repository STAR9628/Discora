"use client";

import { useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import {
  assignFounderTitlesAction,
  getFounderTitleStatusAction,
} from "@/app/admin/actions";

interface TitleRow {
  userId: string;
  username: string | null;
  platformTitle: string | null;
}

/**
 * Owner-only operational card for the PO-approved Founder / Co-Founder
 * platform titles. The entire Admin Console is owner-gated; this card takes
 * no user input — assignments are server-side constants invoked through
 * requireOwner() + set_platform_title(). Display titles only; no privileges.
 */
export function AdminPlatformIdentity() {
  const [rows, setRows] = useState<TitleRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    const res = await getFounderTitleStatusAction();
    if (res.success && res.data) {
      setRows(res.data);
    } else {
      setMessage(res.error || "Could not load platform titles.");
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAssign = async () => {
    setAssigning(true);
    setMessage(null);
    const res = await assignFounderTitlesAction();
    await refresh();
    if (res.success) {
      setMessage("Approved titles assigned: techno_trix → Founder, keerti → Co-Founder.");
    } else {
      setMessage(res.error || "Assignment failed.");
    }
    setAssigning(false);
  };

  return (
    <div
      data-testid="admin-platform-identity"
      className="rounded-xl border border-border bg-card p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Platform Identity
        </h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Display-only Founder / Co-Founder titles. Assigning a title grants no admin,
        moderation, reputation, or epistemic privileges.
      </p>

      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" aria-label="Loading platform titles" />
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/60">
          {(rows || []).map((row) => (
            <div
              key={row.userId}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
            >
              <span className="font-medium text-foreground">
                {row.username ? `@${row.username}` : row.userId.slice(0, 8)}
              </span>
              <span
                data-testid={`platform-title-${row.userId.slice(0, 8)}`}
                className={
                  row.platformTitle
                    ? "rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-medium text-primary"
                    : "text-muted-foreground"
                }
              >
                {row.platformTitle === "founder"
                  ? "Founder"
                  : row.platformTitle === "co_founder"
                    ? "Co-Founder"
                    : "Not assigned"}
              </span>
            </div>
          ))}
          {(rows || []).length === 0 && (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">
              No identity records found.
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAssign}
          disabled={assigning || loading}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{assigning ? "Assigning…" : "Assign approved titles"}</span>
        </button>
        {message && (
          <p className="text-xs text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
