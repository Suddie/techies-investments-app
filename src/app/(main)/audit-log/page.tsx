
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AuditLogList from "@/components/audit/AuditLogList";

export default function AuditLogPage() {
  return (
    <ProtectedRoute requiredAccessLevel={3}> {/* All authenticated users can view */}
      <PageHeader
        title="Audit Log"
        description="View a chronological record of significant actions performed in the application."
      />
      <div className="border shadow-sm rounded-lg p-2">
        <AuditLogList />
      </div>
    </ProtectedRoute>
  );
}
