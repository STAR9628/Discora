"use client";

import { useState, useMemo } from "react";
import { useClaims, useCreateClaimRelation, useDeleteClaimRelation, useClaimRelations } from "@/features/discussions/hooks/use-discussions";
import type { DiscussionClaim, ClaimRelationType } from "@/features/discussions/types";
import { X, Link2, Trash2, ThumbsUp, ThumbsDown, GitBranch, Loader2, Search } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ClaimRelationDialogProps {
  roomId: string;
  sourceClaim: DiscussionClaim;
  relationType: ClaimRelationType;
  isOpen: boolean;
  onClose: () => void;
}

function getRelationLabel(type: ClaimRelationType): string {
  switch (type) {
    case "supports": return "Supports";
    case "contradicts": return "Contradicts";
    case "refines": return "Refines";
  }
}

function getRelationIcon(type: ClaimRelationType) {
  switch (type) {
    case "supports": return <ThumbsUp className="h-3.5 w-3.5" />;
    case "contradicts": return <ThumbsDown className="h-3.5 w-3.5" />;
    case "refines": return <GitBranch className="h-3.5 w-3.5" />;
  }
}

function getRelationColor(type: ClaimRelationType): string {
  switch (type) {
    case "supports": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "contradicts": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "refines": return "bg-blue-400/10 text-blue-400 border-blue-400/20";
  }
}

export function ClaimRelationDialog({ roomId, sourceClaim, relationType, isOpen, onClose }: ClaimRelationDialogProps) {
  const { data: allClaims } = useClaims(roomId);
  const { data: existingRelations } = useClaimRelations(roomId);
  const createMutation = useCreateClaimRelation(roomId);
  const deleteMutation = useDeleteClaimRelation(roomId);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const existingRelationIds = useMemo(() => {
    const set = new Set<string>();
    if (existingRelations) {
      for (const r of existingRelations) {
        const key = `${r.sourceClaimId}-${r.targetClaimId}-${r.relationType}`;
        set.add(key);
      }
    }
    return set;
  }, [existingRelations]);

  const eligibleClaims = useMemo(() => {
    if (!allClaims) return [];
    return allClaims.filter(
      (c) =>
        c.id !== sourceClaim.id &&
        !c.isRetracted &&
        !existingRelationIds.has(`${sourceClaim.id}-${c.id}-${relationType}`) &&
        !existingRelationIds.has(`${c.id}-${sourceClaim.id}-${relationType}`),
    );
  }, [allClaims, sourceClaim.id, relationType, existingRelationIds]);

  const existingLinks = useMemo(() => {
    if (!existingRelations) return [];
    return existingRelations.filter(
      (r) =>
        (r.sourceClaimId === sourceClaim.id || r.targetClaimId === sourceClaim.id) &&
        r.relationType === relationType,
    );
  }, [existingRelations, sourceClaim.id, relationType]);

  const filteredClaims = useMemo(() => {
    if (!searchQuery.trim()) return eligibleClaims;
    const q = searchQuery.toLowerCase();
    return eligibleClaims.filter((c) => c.content.toLowerCase().includes(q));
  }, [eligibleClaims, searchQuery]);

  const handleCreate = async () => {
    if (!selectedTargetId) return;
    try {
      await createMutation.mutateAsync({
        sourceClaimId: sourceClaim.id,
        targetClaimId: selectedTargetId,
        relationType,
      });
      toast.success(`${getRelationLabel(relationType)} relation created`);
      setSelectedTargetId(null);
      onClose();
    } catch (err) {
      toast.error("Failed to create relation.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const handleDelete = async (relationId: string) => {
    try {
      await deleteMutation.mutateAsync(relationId);
      toast.success("Relation removed");
    } catch (err) {
      toast.error("Failed to remove relation.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getRelationColor(relationType)}`}>
              {getRelationIcon(relationType)}
              {getRelationLabel(relationType)}
            </span>
            <span className="text-sm text-muted-foreground">relation</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/20 p-3">
          <p className="text-xs text-muted-foreground">From this claim:</p>
          <p className="text-sm font-medium text-foreground mt-0.5 line-clamp-2">{sourceClaim.content}</p>
        </div>

        {existingLinks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Existing {getRelationLabel(relationType).toLowerCase()} links
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {existingLinks.map((rel) => {
                const linkedContent = rel.targetClaimId === sourceClaim.id
                  ? rel.sourceClaimContent
                  : rel.targetClaimContent;
                return (
                  <div key={rel.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/20 p-2">
                    <p className="text-xs text-foreground/80 truncate flex-1">{linkedContent}</p>
                    <button
                      onClick={() => handleDelete(rel.id)}
                      disabled={deleteMutation.isPending}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(eligibleClaims.length > 0 || searchQuery) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Link to another claim
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search claims..."
                className="w-full rounded-lg border border-border/50 bg-background/30 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredClaims.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-4">No claims match your search</p>
              ) : (
                filteredClaims.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                    selectedTargetId === c.id
                      ? "border-primary bg-primary/[0.04]"
                      : "border-border/40 bg-card/10 hover:bg-card/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="targetClaim"
                    value={c.id}
                    checked={selectedTargetId === c.id}
                    onChange={() => setSelectedTargetId(c.id)}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {c.claimType}
                    </span>
                    <p className="text-xs text-foreground/85 mt-0.5 line-clamp-2">{c.content}</p>
                  </div>
                </label>
              )))}
            </div>
          </div>
        )}

        {eligibleClaims.length === 0 && existingLinks.length === 0 && !searchQuery && (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/10 p-6 text-center">
            <Link2 className="h-6 w-6 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-2">No other claims available to link</p>
          </div>
        )}

        {eligibleClaims.length > 0 && (
          <div className="flex justify-end gap-3 border-t border-border/40 pt-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!selectedTargetId || createMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {getRelationLabel(relationType)} this claim
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
