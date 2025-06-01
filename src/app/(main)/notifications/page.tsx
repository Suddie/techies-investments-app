
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AllNotificationsDisplay from "@/components/notifications/AllNotificationsDisplay";

export default function NotificationsPage() {
  return (
    <ProtectedRoute requiredAccessLevel={3}> {/* All authenticated users can view */}
      <PageHeader
        title="Notifications Center"
        description="Manage and review all your application notifications."
      />
      <div className="mt-0"> {/* Removed top margin as PageHeader has bottom margin */}
        <AllNotificationsDisplay />
      </div>
    </ProtectedRoute>
  );
}

    