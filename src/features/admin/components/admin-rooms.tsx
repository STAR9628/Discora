"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DoorOpen,
  Filter,
  Lock,
  Globe,
  Archive,
  RotateCcw,
  Eye,
  MessageSquare,
  Users,
  Search,
  ExternalLink,
} from "lucide-react";
import type { AdminRoomItem } from "../types";
import { setRoomStatusAction } from "@/app/admin/actions";
import { AdminPrivateRoomModal } from "./admin-private-room-modal";
import { formatDate } from "@/lib/date";
import { toast } from "@/components/ui/toast";

interface AdminRoomsProps {
  initialRooms: AdminRoomItem[];
}

export function AdminRooms({ initialRooms }: AdminRoomsProps) {
  const [rooms, setRooms] = useState<AdminRoomItem[]>(initialRooms);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectRoomId, setInspectRoomId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredRooms = rooms.filter((r) => {
    if (filter === "discussion" && r.room_type !== "discussion") return false;
    if (filter === "debate" && r.room_type !== "debate") return false;
    if (filter === "public" && r.visibility !== "public") return false;
    if (filter === "private" && r.visibility !== "private") return false;
    if (filter === "archived" && r.status !== "archived") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q);
    }
    return true;
  });

  async function handleToggleStatus(room: AdminRoomItem) {
    const newStatus = room.status === "archived" ? "open" : "archived";
    setActionLoading(room.id);
    const res = await setRoomStatusAction(room.id, newStatus);
    setActionLoading(null);

    if (res.success) {
      toast.success(
        newStatus === "archived"
          ? `Room "${room.title}" archived.`
          : `Room "${room.title}" restored.`
      );
      setRooms((prev) =>
        prev.map((item) => (item.id === room.id ? { ...item, status: newStatus } : item))
      );
    } else {
      toast.error(res.error || "Failed to update room status");
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search rooms by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1 hidden sm:block" />
          {[
            { id: "all", label: "All" },
            { id: "discussion", label: "Discussions" },
            { id: "debate", label: "Debates" },
            { id: "public", label: "Public" },
            { id: "private", label: "Private" },
            { id: "archived", label: "Archived" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room Table / List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Rooms ({filteredRooms.length})
            </span>
          </div>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
            No rooms found matching the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Visibility</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Activity</th>
                  <th className="px-3 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRooms.map((room) => {
                  const isPrivate = room.visibility === "private";
                  const isArchived = room.status === "archived";
                  const roomHref =
                    room.room_type === "debate"
                      ? `/debates/${room.slug}`
                      : `/discussions/${room.slug}`;

                  return (
                    <tr
                      key={room.id}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground line-clamp-1">
                            {room.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate">
                            /{room.slug}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium capitalize">
                          {room.room_type}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            isPrivate ? "text-amber-500" : "text-emerald-500"
                          }`}
                        >
                          {isPrivate ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                          <span className="capitalize">{room.visibility}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                            isArchived
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          }`}
                        >
                          {room.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1" title="Participants">
                            <Users className="h-3 w-3" />
                            {room.participant_count}
                          </span>
                          <span className="flex items-center gap-1" title="Messages">
                            <MessageSquare className="h-3 w-3" />
                            {room.message_count}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">
                        {formatDate(room.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPrivate ? (
                            <button
                              onClick={() => setInspectRoomId(room.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-[11px] font-medium transition-colors"
                              title="Silent read-only inspection (audit logged)"
                            >
                              <Eye className="h-3 w-3" />
                              Inspect
                            </button>
                          ) : (
                            <Link
                              href={roomHref}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                              title="Open public room"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </Link>
                          )}

                          <button
                            onClick={() => handleToggleStatus(room)}
                            disabled={actionLoading === room.id}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                              isArchived
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                            }`}
                          >
                            {isArchived ? (
                              <>
                                <RotateCcw className="h-3 w-3" />
                                Restore
                              </>
                            ) : (
                              <>
                                <Archive className="h-3 w-3" />
                                Archive
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Private Room Inspection Modal */}
      {inspectRoomId && (
        <AdminPrivateRoomModal
          roomId={inspectRoomId}
          onClose={() => setInspectRoomId(null)}
        />
      )}
    </div>
  );
}
