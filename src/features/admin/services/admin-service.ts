import { createServerSupabaseClient } from "@/services/supabase/server";
import { requireOwner } from "@/lib/security/owner-guard";
import type {
  AdminOverviewStats,
  AdminRoomItem,
  AdminFeedbackItem,
  AdminAuditLogItem,
  PrivateRoomInspectionPayload,
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
