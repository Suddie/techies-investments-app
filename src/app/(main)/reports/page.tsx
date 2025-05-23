"use client";

import PageHeader from "@/components/common/PageHeader";
import ReportGenerator from "@/components/reports/ReportGenerator";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Financial Reports"
        description="Generate and export various financial reports for analysis and record-keeping."
      />
      <ReportGenerator />
    </>
  );
}
