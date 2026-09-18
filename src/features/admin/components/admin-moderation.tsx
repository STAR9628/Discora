"use client";

import { ModerationDashboard } from "@/app/settings/moderation/moderation-dashboard";

export function AdminModeration() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1 mb-4">
          <h2 className="text-sm font-semibold text-foreground">
            Platform Moderation Queue
          </h2>
          <p className="text-xs text-muted-foreground">
            Review reported messages, questions, claims, and evidence. Maintain platform safety without suppressing constructive disagreement.
          </p>
        </div>
        <ModerationDashboard />
      </div>
    </div>
  );
}
