"use client";

import { useQuery } from "@tanstack/react-query";
import { getLatestReputationSnapshots } from "../services/reputation-service";

export function useAuthorsReputation(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);

  return useQuery({
    queryKey: ["authors-reputation", [...uniqueIds].sort()],
    queryFn: async () => {
      if (uniqueIds.length === 0) return new Map();
      const snapshots = await getLatestReputationSnapshots(uniqueIds);
      const scoreMap = new Map<string, number>();
      for (const [userId, snapshot] of snapshots) {
        scoreMap.set(userId, snapshot.score);
      }
      return scoreMap;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
