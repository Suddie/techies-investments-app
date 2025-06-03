
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AllContributionsTable from "@/components/admin/AllContributionsTable";

export default function ManageContributionsPage() {
  return (
    <ProtectedRoute adminOnly={true} requiredAccessLevel={1}>
      <PageHeader
        title="Manage All Contributions"
        description="View and manage all member contributions. (Future: Edit/Void capabilities)"
      />
      <div className="border shadow-sm rounded-lg p-2">
        <AllContributionsTable />
      </div>
    </ProtectedRoute>
  );
}
