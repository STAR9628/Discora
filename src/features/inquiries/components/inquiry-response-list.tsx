"use client";

import React, { useState } from "react";
import { MessageSquare, User, Loader2, Edit3, Trash2, Check, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useInquiryResponses, useEditInquiryResponse, useDeleteInquiryResponse } from "../hooks/use-inquiries";
import { formatDate } from "@/lib/date";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

interface InquiryResponseListProps {
  inquiryItemId: string;
}

export function InquiryResponseList({ inquiryItemId }: InquiryResponseListProps) {
  const { user } = useAuth();
  const { data: responses, isLoading, error } = useInquiryResponses(inquiryItemId);
  const editResponseMutation = useEditInquiryResponse(inquiryItemId);
  const deleteResponseMutation = useDeleteInquiryResponse(inquiryItemId);

  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Loading responses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
        Failed to load inquiry responses.
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        No responses yet. Be the first to address this inquiry.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Responses ({responses.length})</span>
      </div>

      <div className="space-y-2.5">
        {responses.map((resp) => {
          const isOwnResponse = !!user && user.id === resp.createdBy;
          const isWithin5Min = Date.now() - new Date(resp.createdAt).getTime() < 5 * 60 * 1000;
          const canEditResponse = isOwnResponse && isWithin5Min;
          const isEditing = editingResponseId === resp.id;

          return (
            <div key={resp.id} className="rounded-xl border border-border/50 bg-card/40 p-3.5 space-y-2 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {resp.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resp.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="h-3 w-3" />
                    </div>
                  )}
                  <span className="font-semibold text-foreground">{resp.username || "Anonymous"}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(resp.createdAt)}</span>
                  {resp.isEdited && (
                    <span className="text-[10px] text-muted-foreground/70 font-medium">• Edited</span>
                  )}
                  {canEditResponse && !isEditing && (
                    <div className="flex items-center gap-1.5 ml-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingResponseId(resp.id);
                          setEditContent(resp.content);
                        }}
                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                        title="Edit response (available within 5 minutes)"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(resp.id)}
                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-destructive hover:underline cursor-pointer"
                        title="Delete response (available within 5 minutes)"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isEditing ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const trimmed = editContent.trim();
                    if (!trimmed) {
                      toast.error("Response cannot be empty.");
                      return;
                    }
                    try {
                      await editResponseMutation.mutateAsync({
                        responseId: resp.id,
                        content: trimmed,
                      });
                      setEditingResponseId(null);
                      toast.success("Response updated.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to update response.");
                    }
                  }}
                  className="space-y-2 rounded-xl border border-primary/30 bg-background/60 p-2.5"
                >
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-xs md:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    disabled={editResponseMutation.isPending}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingResponseId(null)}
                      disabled={editResponseMutation.isPending}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer"
                    >
                      <X className="h-3 w-3 inline mr-1" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editResponseMutation.isPending || !editContent.trim()}
                      className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {editResponseMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      <span>Save</span>
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-xs md:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {resp.content}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Delete response?"
        description="Are you sure you want to delete this response? This can only be done within 5 minutes of posting."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteResponseMutation.isPending}
        onConfirm={async () => {
          if (!pendingDeleteId) return;
          try {
            await deleteResponseMutation.mutateAsync(pendingDeleteId);
            toast.success("Response deleted.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete response.");
          } finally {
            setPendingDeleteId(null);
          }
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
