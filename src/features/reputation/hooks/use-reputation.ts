"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getUserContributions,
  getReputationHistory,
  resolveRoomSlugs,
  callRecalculateReputation,
  getUserSideChanges,
} from "../services/reputation-service";
import {
  computeBadgeProgress,
  computeExpertise,
  computeExpertiseBreakdown,
  computeReputation,
  computeTrend,
  computeTrustBadges,
} from "../reputation-utils";
import type { ContributionTimelineItem, ReputationOptions } from "../types";

export function useReputation(userId: string | null, options?: ReputationOptions) {
  return useQuery({
    queryKey: ["reputation", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const contributions = await getUserContributions(userId);

      // Call the authoritative database RPC to ensure snapshot is up-to-date
      await callRecalculateReputation(userId);

      // Compute expertise from raw data (client-side for display, mirrors RPC logic)
      const expertise = computeExpertise(contributions);
      const expertiseBreakdown = computeExpertiseBreakdown(contributions);

      // Compute reputation for breakdown display (matches authoritative DB score)
      const reputation = computeReputation(contributions, options);

      const badges = computeTrustBadges(contributions, reputation);
      const badgeProgress = computeBadgeProgress(contributions, reputation);

      const sideChanges = await getUserSideChanges(userId);

      const allRoomIds = [
        ...contributions.claims.map((c) => c.roomId),
        ...contributions.evidence.map((e) => e.roomId),
        ...contributions.questions.map((q) => q.roomId),
        ...sideChanges.map((s) => s.roomId),
      ];
      const roomMap = allRoomIds.length > 0 ? await resolveRoomSlugs(allRoomIds) : new Map();

      const timelineItems: ContributionTimelineItem[] = [
        ...contributions.claims.map((c) => {
          const room = roomMap.get(c.roomId);
          return {
            id: c.id,
            type: "claim" as const,
            content: c.content,
            roomTitle: room?.title || c.roomId,
            roomSlug: room?.slug || "",
            createdAt: c.createdAt,
            isRetracted: c.isRetracted,
          };
        }),
        ...contributions.evidence.map((e) => {
          const room = roomMap.get(e.roomId);
          return {
            id: e.id,
            type: "evidence" as const,
            content: e.content,
            roomTitle: room?.title || e.roomId,
            roomSlug: room?.slug || "",
            createdAt: e.createdAt,
            isRetracted: e.isRetracted,
          };
        }),
        ...contributions.questions.map((q) => {
          const room = roomMap.get(q.roomId);
          return {
            id: q.id,
            type: "question" as const,
            content: q.content,
            roomTitle: room?.title || q.roomId,
            roomSlug: room?.slug || "",
            createdAt: q.createdAt,
            isRetracted: q.isRetracted,
          };
        }),
        ...sideChanges.map((s) => {
          const room = roomMap.get(s.roomId);
          return {
            id: s.id,
            type: "side_switch" as const,
            content: s.reason,
            roomTitle: room?.title || s.roomId,
            roomSlug: room?.slug || "",
            createdAt: s.createdAt,
            isRetracted: false,
            previousSide: s.previousSide as "proposition" | "opposition",
            newSide: s.newSide as "proposition" | "opposition",
          };
        }),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      let history = null;
      try {
        const rawHistory = await getReputationHistory(userId);
        history = {
          snapshots: rawHistory,
          trend: computeTrend(rawHistory),
        };
      } catch {
        history = { snapshots: [], trend: null };
      }

      return { contributions, reputation, expertise, expertiseBreakdown, badges, badgeProgress, timelineItems, history };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
