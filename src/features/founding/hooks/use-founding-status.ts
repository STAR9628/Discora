"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { evaluateFoundingStatus } from "../services/founding-service";

/**
 * Current user's Founding Participant progress.
 * Enabled for authenticated users only; the underlying RPC grants the
 * recognition automatically once discussion + debate participation exist.
 */
export function useFoundingStatus() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["founding", "status"],
    queryFn: () => evaluateFoundingStatus(),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}
