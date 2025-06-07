"use client";

import React, { useState, useRef, useCallback } from "react";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { useSettings } from "@/contexts/SettingsProvider";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { startOfYear, endOfYear, format } from "date-fns";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// UI Components
import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, ImageIcon, Loader2, FileText } from "lucide-react";
import ReportView from '@/components/reports/ReportView';

// Types
import type {
  Contribution,
  Expense,
  RentInvoice,
  Professional,
  BankBalance,
  UserProfile,
  ReportData,
} from "@/lib/types";


const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

export default function TaxSummaryPage() {
  const { db } = useFirebase();
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReportData, setGeneratedReportData] = useState<ReportData | null>(null);
  const { settings: globalSettings } = useSettings();
  const summaryViewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const yearOptions = generateYearOptions();

  const handleGenerateSummary = async () => {
    if (!selectedYear) {
      toast({ title: "Selection Missing", description: "Please select a year.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedReportData(null);

    const yearDate = new Date(parseInt(selectedYear, 10), 0, 1);
    const reportStartDate = Timestamp.fromDate(startOfYear(yearDate));
    const reportEndDate = Timestamp.fromDate(endOfYear(yearDate));

    try {
      // Initialize totals
      let totalContributions = 0, totalRentalIncome = 0, totalBankInterest = 0;
      let totalOperatingExpenses = 0, totalProfessionalFees = 0, totalBankCharges = 0;
      const memberTPINs: { name: string; tpin: string }[] = [];

      // ===================================================================
      // 1. Fetch Contributions (THE CORRECTED LOGIC)
      // We fetch all contributions in the date range and filter in the code.
      // This is more robust and avoids Firestore query limitations.
      // ===================================================================
      const contribQuery = query(
        collection(db, "contributions"),
        where("datePaid", ">=", reportStartDate),
        where("datePaid", "<=", reportEndDate)
      );
      const contribSnap = await getDocs(contribQuery);
      contribSnap.forEach(doc => {
        const contribution = doc.data() as Contribution;
        // Check if status is NOT "voided". This handles missing status fields correctly.
        if (contribution.status?.toLowerCase() !== 'voided') {
          totalContributions += contribution.amount || 0;
        }
      });

      // 2. Fetch Rental Income (Status is "Paid")
      const rentQuery = query(
        collection(db, "rentInvoices"),
        where("invoiceDate", ">=", reportStartDate),
        where("invoiceDate", "<=", reportEndDate),
        where("status", "==", "Paid")
      );
      const rentSnap = await getDocs(rentQuery);
      rentSnap.forEach(doc => { totalRentalIncome += (doc.data() as RentInvoice).rentAmount || 0; });

      // 3. Fetch Bank Interest & Charges
      const bankStartMonth = format(reportStartDate.toDate(), 'yyyy-MM');
      const bankEndMonth = format(reportEndDate.toDate(), 'yyyy-MM');
      const bankQuery = query(
        collection(db, "bankBalances"),
        where("monthYear", ">=", bankStartMonth),
        where("monthYear", "<=", bankEndMonth)
      );
      const bankSnap = await getDocs(bankQuery);
      bankSnap.forEach(doc => {
        const data = doc.data() as BankBalance;
        totalBankInterest += data.interestEarned || 0;
        totalBankCharges += data.bankCharges || 0;
      });

      // 4. Fetch Operating Expenses
      const expenseQuery = query(
        collection(db, "expenses"),
        where("date", ">=", reportStartDate),
        where("date", "<=", reportEndDate)
      );
      const expenseSnap = await getDocs(expenseQuery);
      expenseSnap.forEach(doc => { totalOperatingExpenses += (doc.data() as Expense).totalAmount || 0; });

      // 5. Fetch Professional Fees (by iterating through payments)
      const profSnap = await getDocs(collection(db, "professionals"));
      profSnap.forEach(profDoc => {
        const prof = profDoc.data() as Professional;
        if (prof.paymentHistory) {
          prof.paymentHistory.forEach(payment => {
            const paymentDate = payment.date.toDate();
            if (paymentDate >= reportStartDate.toDate() && paymentDate <= reportEndDate.toDate()) {
              totalProfessionalFees += payment.amountPaid || 0;
            }
          });
        }
      });

      // 6. Fetch Member TPINs
      const usersSnap = await getDocs(query(collection(db, "users"), orderBy("name")));
      usersSnap.forEach((userDoc) => {
        const user = userDoc.data() as UserProfile;
        if (user.name && user.status === 'Active') {
          memberTPINs.push({ name: user.name, tpin: user.tpin || "Not Provided" });
        }
      });

      // Assemble final report data
      const totalIncome = totalContributions + totalRentalIncome + totalBankInterest;
      const totalExpenditure = totalOperatingExpenses + totalProfessionalFees + totalBankCharges;
      
      const activityData = [
        { category: "Income", description: "Contributions Received", amount: totalContributions },
        { category: "Income", description: "Rental Income", amount: totalRentalIncome },
        { category: "Income", description: "Bank Interest Earned", amount: totalBankInterest },
        { category: "Expenditure", description: "Operating Expenses", amount: totalOperatingExpenses },
        { category: "Expenditure", description: "Professional Fees Paid", amount: totalProfessionalFees },
        { category: "Expenditure", description: "Bank Charges", amount: totalBankCharges },
      ];

      setGeneratedReportData({
        title: `Annual Financial Summary - ${selectedYear}`,
        dateRange: `For the Year ${selectedYear}`,
        currencySymbol: globalSettings.currencySymbol || "MK",
        columns: [{ accessorKey: "category", header: "Category" }, { accessorKey: "description", header: "Item" }, { accessorKey: "amount", header: `Amount (${globalSettings.currencySymbol})` }],
        data: activityData,
        summary: [
          { label: "Total Income", value: totalIncome },
          { label: "Total Expenditure", value: totalExpenditure },
          { label: "Net Activity (Surplus/Deficit)", value: totalIncome - totalExpenditure },
        ],
        _customData: { memberTPINs }
      });

      toast({ title: "Annual Summary Generated", description: `Summary for ${selectedYear} is ready.` });
    } catch (err: any) {
      console.error("Error generating annual financial summary:", err);
      setError(`Could not generate summary: ${err.message}. This may be due to missing Firestore indexes. Check the developer console for a link to create the required index.`);
      toast({ title: "Summary Generation Error", description: `An error occurred: ${err.message}`, variant: "destructive", duration: 15000 });
      setGeneratedReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = useCallback(() => {
    if (!summaryViewRef.current) return;
    html2canvas(summaryViewRef.current, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const newImgWidth = pdfWidth - 20;
      const newImgHeight = newImgWidth / ratio;
      pdf.addImage(imgData, 'PNG', 10, 10, newImgWidth, newImgHeight);
      pdf.save(`Financial_Summary_${selectedYear}.pdf`);
      toast({ title: "PDF Exported", description: "Annual financial summary has been downloaded." });
    });
  }, [selectedYear, toast]);

  const exportToJPG = useCallback(() => {
    if (!summaryViewRef.current) return;
    html2canvas(summaryViewRef.current, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `Financial_Summary_${selectedYear}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      toast({ title: "JPG Exported", description: "Annual financial summary has been downloaded." });
    });
  }, [selectedYear, toast]);

  return (
    <ProtectedRoute requiredAccessLevel={2}>
      <PageHeader
        title="Annual Financial Summary"
        description="Generate a financial summary based on recorded income and expenditures for a selected year."
      />
      <Card>
        <CardHeader>
          <CardTitle>Select Year and Generate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-grow">
              <Label htmlFor="financial-year">Financial Year</Label>
              <Select onValueChange={setSelectedYear} value={selectedYear}>
                <SelectTrigger id="financial-year"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>{yearOptions.map((year) => <SelectItem key={year} value={String(year)}>{String(year)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateSummary} disabled={loading || !selectedYear} className="w-full md:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {loading ? "Generating..." : "Generate Annual Summary"}
            </Button>
          </div>

          {generatedReportData ? (
            <div className="mt-6">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={exportToPDF} disabled={loading}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                <Button variant="outline" onClick={exportToJPG} disabled={loading}><ImageIcon className="mr-2 h-4 w-4" /> Export JPG</Button>
              </div>
              <div ref={summaryViewRef} className="border rounded-lg p-6 bg-white text-black">
                <ReportView reportData={generatedReportData} />
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg mt-6">
              {loading ? (
                <>
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-2" />
                  <p>Generating summary for {selectedYear}...</p>
                </>
              ) : (
                <>
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p>Select a year and click "Generate Annual Summary" to view data.</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}