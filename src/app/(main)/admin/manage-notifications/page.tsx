
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ManualNotificationForm from "@/components/admin/ManualNotificationForm";

export default function ManageNotificationsPage() {
  return (
    <ProtectedRoute adminOnly={true} requiredAccessLevel={1}>
      <PageHeader
        title="Manage Notifications"
        description="Create and send manual notifications to users."
      />
      <div className="mt-6">
        <ManualNotificationForm />
      </div>
    </ProtectedRoute>
  );
}
