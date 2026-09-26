"use client";

import { useState } from "react";
import { AdminHeader, type AdminTab } from "./admin-header";
import { AdminOverview } from "./admin-overview";
import { AdminRooms } from "./admin-rooms";
import { AdminFeedback } from "./admin-feedback";
import { AdminModeration } from "./admin-moderation";
import { AdminAuditLogs } from "./admin-audit-logs";
import { AdminLifecycle } from "./admin-lifecycle";
import type {
  AdminOverviewStats,
  AdminRoomItem,
  AdminFeedbackItem,
  AdminAuditLogItem,
} from "../types";

interface AdminConsoleClientProps {
  stats: AdminOverviewStats;
  rooms: AdminRoomItem[];
  feedback: AdminFeedbackItem[];
  auditLogs: AdminAuditLogItem[];
}

export function AdminConsoleClient({
  stats,
  rooms,
  feedback,
  auditLogs,
}: AdminConsoleClientProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingFeedbackCount={stats.pending_feedback}
        pendingFlagsCount={stats.pending_flags}
      />

      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "overview" && (
          <AdminOverview
            stats={stats}
            recentLogs={auditLogs}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "rooms" && <AdminRooms initialRooms={rooms} />}

        {activeTab === "feedback" && <AdminFeedback initialFeedback={feedback} />}

        {activeTab === "moderation" && <AdminModeration />}

        {activeTab === "audit" && <AdminAuditLogs initialLogs={auditLogs} />}

        {activeTab === "lifecycle" && <AdminLifecycle />}
      </div>
    </div>
  );
}
