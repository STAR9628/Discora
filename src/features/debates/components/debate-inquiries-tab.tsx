"use client";

import React, { useState } from "react";
import { HelpCircle, AlertCircle, Plus, Loader2 } from "lucide-react";
import { useDebateContext } from "./debate-data-provider";
import { useClaimsMinimal } from "@/features/discussions/hooks/use-discussions";
import { useInquiries, useCreateInquiry } from "@/features/inquiries/hooks/use-inquiries";
import { InquiryCard } from "@/features/inquiries/components/inquiry-card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "@/components/ui/toast";
import type { InquiryType } from "@/features/inquiries/types";

export function DebateInquiriesTab() {
  const { room } = useDebateContext();
  const { user } = useAuth();
  const { data: inquiries = [], isLoading, error } = useInquiries(room.id);
  const { data: claimOptions = [] } = useClaimsMinimal(room.id);

  const createInquiryMutation = useCreateInquiry(room.id);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claimOptions[0]?.id || "");

  React.useEffect(() => {
    if (!selectedClaimId && claimOptions.length > 0) {
      setSelectedClaimId(claimOptions[0].id);
    }
  }, [selectedClaimId, claimOptions]);
  const [inquiryType, setInquiryType] = useState<InquiryType>("clarification");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = content.trim();
    if (trimmed.length < 10) {
      setFormError("Inquiry content must be at least 10 characters.");
      return;
    }
    if (!selectedClaimId) {
      setFormError("Please select a target claim for this inquiry.");
      return;
    }

    try {
      await createInquiryMutation.mutateAsync({
        roomId: room.id,
        targetClaimId: selectedClaimId,
        inquiryType,
        content: trimmed,
      });
      toast.success("Structured Inquiry submitted!");
      setContent("");
      setIsCreateOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create inquiry.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-400" />
            <span>Structured Inquiries ({inquiries.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Targeted micro-questions exposing claim assumptions, evidence requests, or clarifications.
          </p>
        </div>

        {user && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-black shadow-sm hover:bg-amber-400 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>{isCreateOpen ? "Cancel Inquiry" : "Ask Structured Inquiry"}</span>
          </button>
        )}
      </div>

      {/* New Inquiry Form */}
      {isCreateOpen && (
        <form onSubmit={handleCreateInquiry} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4 shadow-md">
          <h3 className="text-sm font-bold text-foreground">Ask a Structured Inquiry</h3>

          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Claim</label>
              <select
                value={selectedClaimId}
                onChange={(e) => setSelectedClaimId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/80 p-2.5 text-xs font-medium text-foreground outline-none"
              >
                {claimOptions.length === 0 ? (
                  <option value="">No claims available</option>
                ) : (
                  claimOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.debateSide?.toUpperCase() || "CLAIM"}] {c.content.slice(0, 60)}...
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Inquiry Type</label>
              <select
                value={inquiryType}
                onChange={(e) => setInquiryType(e.target.value as InquiryType)}
                className="w-full rounded-xl border border-input bg-background/80 p-2.5 text-xs font-medium text-foreground outline-none"
              >
                <option value="clarification">Clarification Request</option>
                <option value="evidence_request">Evidence Request</option>
                <option value="assumption_check">Assumption Check</option>
              </select>
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="State what needs clarification or what evidence is requested..."
              className="w-full rounded-xl border border-input bg-background/80 p-3 text-xs outline-none focus:border-amber-500"
              disabled={createInquiryMutation.isPending}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createInquiryMutation.isPending || !selectedClaimId}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow-sm hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              {createInquiryMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span>Submit Inquiry</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Inquiry List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-border/50 bg-card/20 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          Failed to load inquiries: {(error as Error).message}
        </div>
      ) : inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 p-8 text-center space-y-2">
          <HelpCircle className="h-8 w-8 text-amber-400/80 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Structured Inquiries Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Structured Inquiries challenge assumptions or request evidence for specific claims. Click &quot;Ask Structured Inquiry&quot; or click &quot;Ask Inquiry&quot; directly on a claim to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <InquiryCard key={inq.id} inquiry={inq} showLinkToStandalone />
          ))}
        </div>
      )}
    </div>
  );
}
