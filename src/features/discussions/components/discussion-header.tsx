"use client";

import { useState } from "react";
import {
  MessageSquare,
  Calendar,
  GitBranch,
  FileText,
  HelpCircle,
  Hash,
  Archive,
  Edit3,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/date";
import type { DiscussionFeedItem } from "@/features/discussions/services/discussion-service";
import { SaveButton } from "@/features/saves/components/save-button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useArchiveRoomByOwner, useEditDiscussionRoom } from "../hooks/use-discussions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

interface DiscussionHeaderProps {
  initialData: DiscussionFeedItem;
  claimCount: number;
  evidenceCount: number;
  openQuestionCount: number;
  contributionCount: number;
}

export function DiscussionHeader({
  initialData,
  claimCount,
  evidenceCount,
  openQuestionCount,
  contributionCount,
}: DiscussionHeaderProps) {
  const { user } = useAuth();
  const { room, topic } = initialData;

  const archiveMutation = useArchiveRoomByOwner(room.id);
  const editMutation = useEditDiscussionRoom(room.id);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(room.title);
  const [editDescription, setEditDescription] = useState(room.description || "");
  const [pendingArchive, setPendingArchive] = useState(false);

  const isOwner = !!user && user.id === room.createdBy;
  const isWithin1Hour = Date.now() - new Date(room.createdAt).getTime() < 60 * 60 * 1000;
  const isWithin5Min = Date.now() - new Date(room.createdAt).getTime() < 5 * 60 * 1000;
  const isArchived = room.status === "archived";
  const canArchive = isOwner && isWithin1Hour && !isArchived;
  const canEdit = isOwner && isWithin5Min && !isArchived;

  const formattedDate = formatDate(room.createdAt, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-5 md:p-7 backdrop-blur-md shadow-lg">
      <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary border border-primary/20">
              <MessageSquare className="h-3 w-3" />
              Discussion
            </span>
            {isArchived && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-destructive border border-destructive/20">
                <Archive className="h-3 w-3" />
                Archived
              </span>
            )}
            {room.isEdited && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40">
                Edited
              </span>
            )}
            {topic && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50">
                <Hash className="h-3 w-3 text-primary/70" />
                {topic.name}
              </span>
            )}
          </div>

          {isEditing ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmedTitle = editTitle.trim();
                if (trimmedTitle.length < 5) {
                  toast.error("Discussion title must be at least 5 characters.");
                  return;
                }
                try {
                  await editMutation.mutateAsync({
                    title: trimmedTitle,
                    description: editDescription.trim() || undefined,
                  });
                  setIsEditing(false);
                  toast.success("Discussion updated.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to update discussion.");
                }
              }}
              className="space-y-3 rounded-xl border border-primary/30 bg-background/60 p-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-base font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  disabled={editMutation.isPending}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Opening Statement / Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  disabled={editMutation.isPending}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={editMutation.isPending}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 inline mr-1" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending || editTitle.trim().length < 5}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {editMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                {room.title}
              </h1>

              {room.description && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                  {room.description}
                </p>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-xs text-muted-foreground border-t border-border/40">
            <span className="flex items-center gap-1.5" title="Started Date">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>Started {formattedDate}</span>
            </span>
            <span aria-hidden="true" className="text-border/80">•</span>
            <span className="flex items-center gap-1.5" title="Claims Asserted">
              <GitBranch className="h-3.5 w-3.5 text-primary/80" />
              <span className="font-bold text-foreground">{claimCount}</span>
              <span>claims</span>
            </span>
            <span aria-hidden="true" className="text-border/80">•</span>
            <span className="flex items-center gap-1.5" title="Evidence Items">
              <FileText className="h-3.5 w-3.5 text-primary/80" />
              <span className="font-bold text-foreground">{evidenceCount}</span>
              <span>evidence</span>
            </span>
            <span aria-hidden="true" className="text-border/80">•</span>
            <span className="flex items-center gap-1.5" title="Open Questions">
              <HelpCircle className="h-3.5 w-3.5 text-primary/80" />
              <span className="font-bold text-foreground">{openQuestionCount}</span>
              <span>questions</span>
            </span>
            <span aria-hidden="true" className="text-border/80">•</span>
            <span className="flex items-center gap-1.5" title="Total Contributions">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span className="font-bold text-foreground">{contributionCount}</span>
              <span>contributions</span>
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 pt-1">
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setEditTitle(room.title);
                setEditDescription(room.description || "");
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors cursor-pointer"
              title="Edit premise (available within 5 minutes of creation)"
            >
              <Edit3 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Edit Premise</span>
            </button>
          )}

          {canArchive && (
            <button
              type="button"
              onClick={() => setPendingArchive(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15 transition-colors cursor-pointer"
              title="Archive discussion (available within 1 hour of creation)"
            >
              <Archive className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Archive</span>
            </button>
          )}

          <SaveButton targetType="discussion" targetId={room.id} showLabel />
        </div>
      </div>

      <ConfirmDialog
        open={pendingArchive}
        title="Archive discussion?"
        description="Discussions cannot be physically deleted to protect participant contributions, evidence, and inquiries. Archiving locks the discussion and makes it read-only."
        confirmLabel="Archive Discussion"
        variant="danger"
        isLoading={archiveMutation.isPending}
        onConfirm={async () => {
          try {
            await archiveMutation.mutateAsync();
            toast.success("Discussion archived.");
            setPendingArchive(false);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to archive discussion.");
          }
        }}
        onCancel={() => setPendingArchive(false)}
      />
    </header>
  );
}
