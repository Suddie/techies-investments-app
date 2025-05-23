"use client";

import PageHeader from "@/components/common/PageHeader";
import AiSummaryGenerator from "@/components/ai/AiSummaryGenerator";

export default function AiSummaryPage() {
  return (
    <>
      <PageHeader
        title="AI Financial Summary"
        description="Leverage generative AI to get tailored financial data summaries based on user roles."
      />
      <AiSummaryGenerator />
    </>
  );
}
