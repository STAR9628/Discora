"use server";

import { revalidatePath } from "next/cache";
import {
  setAdminRoomStatus,
  inspectPrivateRoom,
  updateFeedbackStatus,
  getAdminRooms,
  getAdminFeedback,
  getAdminAuditLogs,
  assignFounderTitles,
  getFounderTitleStatus,
  getAdminDeletedContent,
  getAdminContentRevisions,
} from "@/features/admin/services/admin-service";
import type {
  AdminRoomItem,
  AdminFeedbackItem,
  AdminAuditLogItem,
  PrivateRoomInspectionPayload,
  AdminDeletedContentItem,
  AdminContentRevisionItem,
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

/**
 * Owner-only read of the approved Founder / Co-Founder title state.
 * Takes no parameters; the target identities are server-side constants.
 */
export async function getFounderTitleStatusAction(): Promise<{
  success: boolean;
  data?: { userId: string; username: string | null; platformTitle: string | null }[];
  error?: string;
}> {
  try {
    const data = await getFounderTitleStatus();
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch platform titles",
    };
  }
}

/**
 * Owner-only assignment of the two PO-approved platform titles
 * (techno_trix → founder, keerti → co_founder) via set_platform_title().
 * Takes no parameters; assignments are server-side constants.
 */
export async function assignFounderTitlesAction(): Promise<{
  success: boolean;
  data?: { userId: string; label: string; title: string; success: boolean; error?: string }[];
  error?: string;
}> {
  try {
    const data = await assignFounderTitles();
    const failed = data.filter((r) => !r.success);
    if (failed.length > 0) {
      return {
        success: false,
        data,
        error: failed.map((r) => `${r.label}: ${r.error}`).join("; "),
      };
    }
    revalidatePath("/admin");
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to assign platform titles",
    };
  }
}

export async function getDeletedContentAction(
  contentType?: string
): Promise<{ success: boolean; data?: AdminDeletedContentItem[]; error?: string }> {
  try {
    const data = await getAdminDeletedContent(contentType);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch deleted content",
    };
  }
}

export async function getContentRevisionsAction(
  contentType?: string,
  contentId?: string
): Promise<{ success: boolean; data?: AdminContentRevisionItem[]; error?: string }> {
  try {
    const data = await getAdminContentRevisions(contentType, contentId);
    return { success: true, data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch content revisions",
    };
  }
}

