import { useClaims, useMessages, useRoomEvidence } from "@/features/discussions/hooks/use-discussions";

// Section contracts intentionally reuse the established room query keys and
// domain models. Cursor/target options are added in Phase 2 without changing UI.
export function useDebateArguments(roomId: string, enabled = true) {
  return useClaims(roomId, undefined, enabled);
}

export function useDebateEvidence(roomId: string, enabled = true) {
  return useRoomEvidence(roomId, enabled);
}

export function useDebateContributions(roomId: string, enabled = true) {
  return useMessages(roomId, enabled);
}
