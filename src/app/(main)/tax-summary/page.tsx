
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useSettings } from "@/contexts/SettingsProvider"; // Import useSettings

// Helper function to generate year options (e.g., last 5 years to current year)
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

interface MockSummaryData {
  year: string;
  totalIncome: number;
  totalExpenditure: number;
  surplusDeficit: number;
  // Add more fields as needed for the mock display
}

export default function TaxSummaryPage() {
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<MockSummaryData | null>(null);
  const { settings: globalSettings } = useSettings(); // Get global settings

  const yearOptions = generateYearOptions();

  const handleGenerateSummary = async () => {
    if (!selectedYear) {
      alert("Please select a financial year.");
      return;
    }
    setLoading(true);
    setSummaryData(null); // Clear previous summary

    // Simulate data fetching and processing
    console.log(`Generating summary for year: ${selectedYear}`);
    // In a real app, you would fetch data from various collections (contributions, expenses, etc.)
    // and aggregate it based on the selectedYear and company/user TPINs.
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    // Create mock data
    const mockIncome = Math.floor(Math.random() * 5000000) + 1000000;
    const mockExpenditure = Math.floor(Math.random() * 3000000) + 500000;
    
    setSummaryData({
      year: selectedYear,
      totalIncome: mockIncome,
      totalExpenditure: mockExpenditure,
      surplusDeficit: mockIncome - mockExpenditure,
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
            <Card className="mt-6 border-primary/20 shadow-md">
              <CardHeader>
                <CardTitle>Financial Summary for {summaryData.year}</CardTitle>
                <CardDescription className="italic">
                  Company: {globalSettings.invoiceCompanyName || globalSettings.appName} <br/>
                  Tax PIN: {globalSettings.companyTaxPIN || "Not Set"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Income Statement</h3>
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between"><span>Total Income:</span> <span>{globalSettings.currencySymbol} {summaryData.totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></p>
                    <p className="flex justify-between"><span>Total Expenditure:</span> <span>{globalSettings.currencySymbol} {summaryData.totalExpenditure.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></p>
                    <p className="flex justify-between font-bold border-t pt-1 mt-1"><span>Surplus / Deficit:</span> <span>{globalSettings.currencySymbol} {summaryData.surplusDeficit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></p>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-lg mb-2">Supporting Information</h3>
                  <p className="text-sm text-muted-foreground">(Member list with TPINs, detailed income/expense breakdown, etc. - to be implemented)</p>
                </div>
                <div className="mt-6 text-xs text-muted-foreground border-t pt-3">
                    <p>Generated on: {new Date().toLocaleDateString()}</p>
                    <p className="mt-2 italic">
                        This summary is generated for {globalSettings.invoiceCompanyName || globalSettings.appName}. 
                        Please verify all figures before submission to relevant authorities.
                    </p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}
