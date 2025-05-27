
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";

// Helper function to generate year options (e.g., last 5 years to current year)
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

export default function TaxSummaryPage() {
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any | null>(null); // Replace 'any' with a proper type later

  const yearOptions = generateYearOptions();

  const handleGenerateSummary = async () => {
    if (!selectedYear) {
      alert("Please select a financial year.");
      return;
    }
    setLoading(true);
    // Simulate data fetching and processing
    console.log(`Generating summary for year: ${selectedYear}`);
    // In a real app, you would fetch data from various collections (contributions, expenses, etc.)
    // and aggregate it based on the selectedYear and company/user TPINs.
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    setSummaryData({
      year: selectedYear,
      // Mock data, replace with actual aggregated data
      totalIncome: Math.floor(Math.random() * 500000) + 100000,
      totalExpenditure: Math.floor(Math.random() * 300000) + 50000,
      // ... more fields
    });
    setLoading(false);
  };

  return (
    <ProtectedRoute requiredAccessLevel={2}>
      <PageHeader
        title="Annual Financial Summary"
        description="Generate a financial summary for tax reporting purposes."
      />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Select Financial Year</CardTitle>
          <CardDescription>Choose the year for which you want to generate the summary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="financial-year">Financial Year</Label>
              <Select onValueChange={setSelectedYear} value={selectedYear}>
                <SelectTrigger id="financial-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={String(year)}>
                      {String(year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateSummary} disabled={loading || !selectedYear} className="md:self-end">
              {loading ? "Generating..." : "Generate Summary"}
            </Button>
          </div>

          {summaryData && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Financial Summary for {summaryData.year}</CardTitle>
                <CardDescription>
                  This is an automatically generated report. Please verify all figures.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Placeholder for ReportView component or direct rendering */}
                <div>
                  <h3 className="font-semibold">Income Statement</h3>
                  <p>Total Income: {summaryData.totalIncome.toLocaleString()}</p>
                  <p>Total Expenditure: {summaryData.totalExpenditure.toLocaleString()}</p>
                  <p className="font-bold">Surplus/Deficit: {(summaryData.totalIncome - summaryData.totalExpenditure).toLocaleString()}</p>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold">Supporting Information</h3>
                  <p className="text-sm text-muted-foreground">(Member list with TPINs, etc. - to be implemented)</p>
                </div>
                <div className="mt-6 text-xs text-muted-foreground">
                    <p>Generated on: {new Date().toLocaleDateString()}</p>
                    {/* <p>{globalSettings.appName} - {globalSettings.invoiceAddress || "Investment Group"}</p> */}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}
