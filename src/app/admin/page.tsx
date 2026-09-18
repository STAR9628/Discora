import { requireOwner } from "@/lib/security/owner-guard";
import {
  getAdminOverviewStats,
  getAdminRooms,
  getAdminFeedback,
  getAdminAuditLogs,
  logAdminAccess,
} from "@/features/admin/services/admin-service";
import { AdminConsoleClient } from "@/features/admin/components/admin-console-client";

export default async function AdminPage() {
  // Server-side security boundary
  await requireOwner();

  // Log access event on server
  try {
    await logAdminAccess();
  } catch (err) {
    console.error("Failed to log admin access:", err);
  }

  // Server-side privileged data fetching
  const [stats, rooms, feedback, auditLogs] = await Promise.all([
    getAdminOverviewStats(),
    getAdminRooms("all"),
    getAdminFeedback(),
    getAdminAuditLogs(50, 0),
  ]);

  return (
    <AdminConsoleClient
      stats={stats}
      rooms={rooms}
      feedback={feedback}
      auditLogs={auditLogs}
    />
  );
}
