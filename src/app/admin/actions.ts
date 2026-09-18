"use server";

import { revalidatePath } from "next/cache";
import {
  setAdminRoomStatus,
  inspectPrivateRoom,
  updateFeedbackStatus,
  getAdminRooms,
  getAdminFeedback,
  getAdminAuditLogs,
} from "@/features/admin/services/admin-service";
import type {
  AdminRoomItem,
  AdminFeedbackItem,
  AdminAuditLogItem,
  PrivateRoomInspectionPayload,
} from "@/features/admin/types";

export async function setRoomStatusAction(
  roomId: string,
  status: "open" | "archived"
): Promise<{ success: boolean; error?: string }> {
  try {
    const ok = await setAdminRoomStatus(roomId, status);
    revalidatePath("/admin");
    return { success: ok };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update room status",
    };
  }
}

export async function inspectPrivateRoomAction(
  roomId: string
): Promise<{ success: boolean; data?: PrivateRoomInspectionPayload; error?: string }> {
  try {
    const data = await inspectPrivateRoom(roomId);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to inspect private room",
    };
  }
}

export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: "new" | "reviewed" | "archived"
): Promise<{ success: boolean; error?: string }> {
  try {
    const ok = await updateFeedbackStatus(feedbackId, status);
    revalidatePath("/admin");
    return { success: ok };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update feedback status",
    };
  }
}

export async function getRoomsAction(
  filter: string = "all"
): Promise<{ success: boolean; data?: AdminRoomItem[]; error?: string }> {
  try {
    const data = await getAdminRooms(filter);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch rooms",
    };
  }
}

export async function getFeedbackAction(
  category?: string,
  status?: string
): Promise<{ success: boolean; data?: AdminFeedbackItem[]; error?: string }> {
  try {
    const data = await getAdminFeedback(category, status);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch feedback",
    };
  }
}

export async function getAuditLogsAction(
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; data?: AdminAuditLogItem[]; error?: string }> {
  try {
    const data = await getAdminAuditLogs(limit, offset);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch audit logs",
    };
  }
}
