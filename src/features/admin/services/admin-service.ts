import { createServerSupabaseClient } from "@/services/supabase/server";
import { requireOwner } from "@/lib/security/owner-guard";
import type {
  AdminOverviewStats,
  AdminRoomItem,
  AdminFeedbackItem,
  AdminAuditLogItem,
  PrivateRoomInspectionPayload,
  AdminDeletedContentItem,
  AdminContentRevisionItem,
} from "../types";

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_get_overview_stats");
  if (error) {
    throw new Error(`Failed to fetch admin overview stats: ${error.message}`);
  }

  return data as AdminOverviewStats;
}

export async function getAdminRooms(filter: string = "all"): Promise<AdminRoomItem[]> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_get_rooms", {
    p_filter: filter,
  });

  if (error) {
    throw new Error(`Failed to fetch admin rooms: ${error.message}`);
  }

  return (data || []) as AdminRoomItem[];
}

export async function setAdminRoomStatus(
  roomId: string,
  status: "open" | "archived"
): Promise<boolean> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_set_room_status", {
    p_room_id: roomId,
    p_status: status,
  });

  if (error) {
    throw new Error(`Failed to update room status: ${error.message}`);
  }

  return !!data;
}

export async function inspectPrivateRoom(
  roomId: string
): Promise<PrivateRoomInspectionPayload> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_inspect_private_room", {
    p_room_id: roomId,
  });

  if (error) {
    throw new Error(`Failed to inspect private room: ${error.message}`);
  }

  return data as PrivateRoomInspectionPayload;
}

export async function getAdminFeedback(
  category?: string,
  status?: string
): Promise<AdminFeedbackItem[]> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_get_feedback", {
    p_category: category && category !== "all" ? category : null,
    p_status: status && status !== "all" ? status : null,
  });

  if (error) {
    throw new Error(`Failed to fetch admin feedback: ${error.message}`);
  }

  return (data || []) as AdminFeedbackItem[];
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: "new" | "reviewed" | "archived"
): Promise<boolean> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_update_feedback_status", {
    p_feedback_id: feedbackId,
    p_status: status,
  });

  if (error) {
    throw new Error(`Failed to update feedback status: ${error.message}`);
  }

  return !!data;
}

export async function getAdminAuditLogs(
  limit: number = 50,
  offset: number = 0
): Promise<AdminAuditLogItem[]> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_get_audit_logs", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return (data || []) as AdminAuditLogItem[];
}

export async function logAdminAccess(): Promise<void> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("admin_log_access");
}

/**
 * PO-approved Founder / Co-Founder identity assignments.
 *
 * Server-side allowlist only. These UUIDs are never accepted from client
 * input: the exposed server action takes no parameters. Display titles only;
 * the set_platform_title() RPC (the final authorization boundary) grants no
 * admin, moderation, reputation, or epistemic privileges.
 */
const FOUNDER_TITLE_ASSIGNMENTS = [
  {
    userId: "17265c80-a346-42dd-a86c-6795c500fd15",
    title: "founder",
    label: "techno_trix",
  },
  {
    userId: "000adeae-f34b-435a-9bed-fcfb926b2b74",
    title: "co_founder",
    label: "keerti",
  },
] as const;

export interface FounderTitleAssignmentResult {
  userId: string;
  label: string;
  title: string;
  success: boolean;
  error?: string;
}

export interface FounderTitleStatus {
  userId: string;
  username: string | null;
  platformTitle: string | null;
}

/**
 * Owner-only read of the current platform titles for the approved identities.
 */
export async function getFounderTitleStatus(): Promise<FounderTitleStatus[]> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const ids = FOUNDER_TITLE_ASSIGNMENTS.map((a) => a.userId);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, platform_title")
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to fetch platform titles: ${error.message}`);
  }

  const rows = (data || []) as unknown as {
    id: string;
    username: string | null;
    platform_title: string | null;
  }[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  return FOUNDER_TITLE_ASSIGNMENTS.map((a) => {
    const row = byId.get(a.userId);
    return {
      userId: a.userId,
      username: row?.username ?? null,
      platformTitle: row?.platform_title ?? null,
    };
  });
}

/**
 * Owner-only assignment of the two approved platform titles via the
 * existing set_platform_title() RPC. No parameters accepted.
 */
export async function assignFounderTitles(): Promise<FounderTitleAssignmentResult[]> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const results: FounderTitleAssignmentResult[] = [];
  for (const assignment of FOUNDER_TITLE_ASSIGNMENTS) {
    const { error } = await supabase.rpc("set_platform_title", {
      p_user_id: assignment.userId,
      p_title: assignment.title,
    });
    results.push({
      userId: assignment.userId,
      label: assignment.label,
      title: assignment.title,
      success: !error,
      error: error?.message,
    });
  }

  return results;
}

type AdminDeletedContentRow = {
  id: string;
  content_type: string;
  room_id: string | null;
  content: string;
  created_by: string | null;
  created_at: string;
  deleted_at: string;
  deleted_by: string | null;
};

type AdminContentRevisionRow = {
  id: string;
  content_type: string;
  content_id: string;
  room_id: string | null;
  previous_content: string;
  new_content: string;
  edited_by: string | null;
  edited_at: string;
};

export async function getAdminDeletedContent(
  contentType?: string
): Promise<AdminDeletedContentItem[]> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_get_deleted_content", {
    p_content_type: contentType && contentType !== "all" ? contentType : null,
  });

  if (error) {
    throw new Error(`Failed to fetch deleted content: ${error.message}`);
  }

  // Map RPC columns to the admin UI shape. The RPC returns `id`/`content`/
  // `created_by`; passing rows through unmapped leaves `content_id` undefined
  // and crashes the lifecycle view.
  const rows = (data || []) as AdminDeletedContentRow[];
  return rows.map((row) => ({
    content_type: row.content_type,
    content_id: row.id,
    room_id: row.room_id,
    author_id: row.created_by,
    content_preview: row.content,
    deleted_by: row.deleted_by,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
  }));
}

export async function getAdminContentRevisions(
  contentType?: string,
  contentId?: string
): Promise<AdminContentRevisionItem[]> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_get_content_revisions", {
    p_content_type: contentType && contentType !== "all" ? contentType : null,
    p_content_id: contentId || null,
  });

  if (error) {
    throw new Error(`Failed to fetch content revisions: ${error.message}`);
  }

  // Map RPC columns to the admin UI shape (`id` -> `revision_id`,
  // `edited_at` -> `created_at`). The RPC returns newest-first, so the
  // per-content sequence number counts snapshots from newest to oldest.
  const rows = (data || []) as AdminContentRevisionRow[];
  const perContentCount = new Map<string, number>();
  return rows.map((row) => {
    const next = (perContentCount.get(row.content_id) || 0) + 1;
    perContentCount.set(row.content_id, next);
    return {
      revision_id: row.id,
      content_type: row.content_type,
      content_id: row.content_id,
      revision_number: next,
      previous_content: row.previous_content,
      edited_by: row.edited_by || "System",
      created_at: row.edited_at,
    };
  });
}

