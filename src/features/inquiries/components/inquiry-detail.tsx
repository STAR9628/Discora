"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  User,
  FileText,
  ChevronRight,
  Flag,
  Edit3,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ReportDialog } from "@/features/discussions/components/report-dialog";
import { InquiryTypeBadge } from "./inquiry-type-badge";
import { InquiryStatusPill } from "./inquiry-status-pill";
import { InquirySatisfactionBar } from "./inquiry-satisfaction-bar";
import { InquiryResponseList } from "./inquiry-response-list";
import { InquiryResponseForm } from "./inquiry-response-form";
import { formatDate } from "@/lib/date";
import { useEditInquiry, useDeleteInquiry } from "../hooks/use-inquiries";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import type { InquiryItem } from "../types";
import type { DiscussionClaim } from "@/features/discussions/types";

interface InquiryDetailProps {
  inquiry: InquiryItem;
  parentClaim?: DiscussionClaim | null;
  roomSlug?: string | null;
  roomTitle?: string | null;
  roomType?: "debate" | "discussion" | null;
}

export function InquiryDetail({
  inquiry,
  parentClaim,
  roomSlug,
  roomTitle,
  roomType = "discussion",
}: InquiryDetailProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(inquiry.content);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const editInquiryMutation = useEditInquiry(inquiry.roomId);
  const deleteInquiryMutation = useDeleteInquiry(inquiry.roomId);

  const isOwnInquiry = !!user && user.id === inquiry.createdBy;
  const isWithin5Min = Date.now() - new Date(inquiry.createdAt).getTime() < 5 * 60 * 1000;
  const canEditInquiry = isOwnInquiry && isWithin5Min;

  const roomHref = roomSlug
    ? roomType === "debate"
      ? `/debates/${roomSlug}`
      : `/discussions/${roomSlug}`
    : "#";

  const contentPreview = inquiry.content.slice(0, 100);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={roomHref}
            className="inline-flex items-center gap-1 font-semibold hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {roomTitle || "Room"}</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
          <span className="font-extrabold text-foreground">Inquiry Detail</span>
        </div>

        <div className="flex items-center gap-2">
          <InquiryTypeBadge type={inquiry.inquiryType} showPrompt />
          <InquiryStatusPill status={inquiry.status} />
          {user && (
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent/50 hover:text-muted-foreground transition-colors"
              title="Report this inquiry"
              aria-label="Report this inquiry"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Target Parent Claim Context Card (Decision A Neutral Tombstone if Deleted) */}
      {parentClaim && !parentClaim.deletedAt ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Targeted Claim
            </span>
            {parentClaim.debateSide && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/50">
                {parentClaim.debateSide}
              </span>
            )}
          </div>
          <p className="text-sm md:text-base font-semibold text-foreground leading-snug">
            {parentClaim.content}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <span>Claim ID: {parentClaim.id.slice(0, 8)}...</span>
            <span>•</span>
            <span>Type: {parentClaim.claimType}</span>
            {parentClaim.isEdited && (
              <>
                <span>•</span>
                <span className="text-[10px] text-muted-foreground/70 font-medium">Edited</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          <span className="italic">Original claim deleted</span>
        </div>
      )}

      {/* Main Inquiry Card Box */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-5 md:p-6 space-y-4 shadow-lg backdrop-blur-md">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-400 shrink-0" />
              {!isEditing && (
                <h1 className="text-lg md:text-xl font-extrabold text-foreground leading-snug">
                  {inquiry.content}
                </h1>
              )}
            </div>

            {canEditInquiry && !isEditing && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditContent(inquiry.content);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  title="Edit inquiry (within 5 minutes)"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline cursor-pointer"
                  title="Delete inquiry (within 5 minutes)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          {isEditing && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = editContent.trim();
                if (trimmed.length < 5) {
                  toast.error("Inquiry content must be at least 5 characters.");
                  return;
                }
                try {
                  await editInquiryMutation.mutateAsync({
                    inquiryId: inquiry.id,
                    content: trimmed,
                  });
                  setIsEditing(false);
                  toast.success("Inquiry updated.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to update inquiry.");
                }
              }}
              className="space-y-2 rounded-xl border border-primary/30 bg-background/60 p-3"
            >
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                disabled={editInquiryMutation.isPending}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={editInquiryMutation.isPending}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer"
                >
                  <X className="h-3 w-3 inline mr-1" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editInquiryMutation.isPending || editContent.trim().length < 5}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {editInquiryMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground/70 pt-1">
            <div className="flex items-center gap-2">
              {inquiry.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inquiry.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-3 w-3" />
                </div>
              )}
              <span className="font-semibold text-foreground">{inquiry.username || "Anonymous"}</span>
              {inquiry.inquirerSide && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                  {inquiry.inquirerSide}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span>Asked {formatDate(inquiry.createdAt)}</span>
              {inquiry.isEdited && (
                <span className="text-[10px] text-muted-foreground/70 font-medium">• Edited</span>
              )}
            </div>
          </div>
        </div>

        {/* Inquirer Satisfaction Bar */}
        <InquirySatisfactionBar inquiry={inquiry} currentUserId={user?.id} />

        {/* Response Thread Section */}
        <div className="pt-4 border-t border-border/30 space-y-4">
          <InquiryResponseList inquiryItemId={inquiry.id} />
          <InquiryResponseForm inquiry={inquiry} />
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete inquiry?"
        description="Are you sure you want to delete this inquiry? This action can only be done within 5 minutes of posting."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteInquiryMutation.isPending}
        onConfirm={async () => {
          try {
            await deleteInquiryMutation.mutateAsync(inquiry.id);
            toast.success("Inquiry deleted.");
            setIsDeleteDialogOpen(false);
            if (roomHref !== "#") {
              router.push(roomHref);
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete inquiry.");
          }
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        inquiryId={inquiry.id}
        contentPreview={contentPreview}
        entityTypeLabel="Inquiry"
        roomId={inquiry.roomId}
      />
    </div>
  );
}
