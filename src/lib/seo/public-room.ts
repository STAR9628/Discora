import type { Room } from "@/types/domain";

/**
 * Whether a room's substance may be server-rendered for public discovery
 * (crawlers, AI readers, link previews).
 *
 * Gate mirrors the public-visibility rule used across RLS and RPCs: public,
 * non-archived rooms only. Anything else (private, archived) must keep
 * rendering through the authenticated client path so no private content can
 * leak into server-rendered HTML. Deleted rooms have no route (notFound).
 */
export function isPubliclyVisibleRoom(room: Pick<Room, "visibility" | "status"> | null | undefined): boolean {
  if (!room) return false;
  return room.visibility === "public" && room.status !== "archived";
}
