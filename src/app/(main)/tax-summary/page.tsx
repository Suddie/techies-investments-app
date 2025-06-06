
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import type {
  Contribution,
  Expense,
  RentInvoice,
  Professional,
  BankBalance,
  UserProfile,
  ReportData,
} from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, ImageIcon, Loader2, FileText } from "lucide-react";
import { format, startOfYear, endOfYear, parse } from "date-fns";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import ReportView from '@/components/reports/ReportView';
import { useAuth } from "@/contexts/AuthProvider";


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
  const { userProfile } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string | undefined>(
    String(new Date().getFullYear())
  );
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
    const dateRangeString = `For the Year ${selectedYear}`;


    try {
        const memberTPINs: { name: string; tpin: string }[] = [];
        let totalContributions = 0, totalRentalIncome = 0, totalBankInterest = 0, totalOtherIncome = 0;
        let totalOperatingExpenses = 0, totalProfessionalFees = 0, totalBankCharges = 0;

        // Contributions
        const contributionsRef = collection(db, "contributions");
        let contribQuery = query(
            contributionsRef,
            where("status", "!=", "voided"),
            orderBy("datePaid", "asc")
        );

        if (reportStartDate) {
            contribQuery = query(contribQuery, where("datePaid", ">=", reportStartDate));
        }
        if (reportEndDate) {
            contribQuery = query(contribQuery, where("datePaid", "<=", reportEndDate));
        }
        
        const contribSnap = await getDocs(contribQuery);
        contribSnap.forEach(doc => totalContributions += (doc.data() as Contribution).amount || 0);


        // Rental Income
        let rentQuery = query(collection(db, "rentInvoices"), where("status", "==", "Paid"), orderBy("invoiceDate", "asc"));
        if (reportStartDate) rentQuery = query(rentQuery, where("invoiceDate", ">=", reportStartDate));
        if (reportEndDate) rentQuery = query(rentQuery, where("invoiceDate", "<=", reportEndDate));
        const rentSnap = await getDocs(rentQuery);
        rentSnap.forEach(doc => totalRentalIncome += (doc.data() as RentInvoice).rentAmount || 0);

        // Bank Interest & Charges
        let bankQuery = query(collection(db, "bankBalances"), orderBy("monthYear", "asc"));
        const bankStartMonth = reportStartDate ? format(reportStartDate.toDate(), 'yyyy-MM') : null;
        const bankEndMonth = reportEndDate ? format(reportEndDate.toDate(), 'yyyy-MM') : null;

        if (bankStartMonth) bankQuery = query(bankQuery, where("monthYear", ">=", bankStartMonth));
        if (bankEndMonth) bankQuery = query(bankQuery, where("monthYear", "<=", bankEndMonth));
        
        const bankSnap = await getDocs(bankQuery);
        bankSnap.forEach(doc => {
            const data = doc.data() as BankBalance;
            totalBankInterest += data.interestEarned || 0;
            totalBankCharges += data.bankCharges || 0;
        });
        
        // Operating Expenses
        let expenseQuery = query(collection(db, "expenses"), orderBy("date", "asc"));
        if (reportStartDate) expenseQuery = query(expenseQuery, where("date", ">=", reportStartDate));
        if (reportEndDate) expenseQuery = query(expenseQuery, where("date", "<=", reportEndDate));
        const expenseSnap = await getDocs(expenseQuery);
        expenseSnap.forEach(doc => totalOperatingExpenses += (doc.data() as Expense).totalAmount || 0);

        // Professional Fees
        const profSnap = await getDocs(collection(db, "professionals"));
        profSnap.forEach(profDoc => {
            const prof = profDoc.data() as Professional;
            if (prof.paymentHistory) {
                prof.paymentHistory.forEach(payment => {
                    const paymentDate = payment.date instanceof Timestamp ? payment.date.toDate() : new Date(payment.date);
                    if ((!reportStartDate || paymentDate >= reportStartDate.toDate()) && (!reportEndDate || paymentDate <= reportEndDate.toDate())) {
                        totalProfessionalFees += payment.amountPaid || 0;
                    }
                });
            }
        });

        // Member TPINs
        const usersSnap = await getDocs(query(collection(db, "users"), orderBy("name", "asc")));
        usersSnap.forEach((userDoc) => {
            const user = userDoc.data() as UserProfile;
            if (user.name) { 
                memberTPINs.push({ name: user.name, tpin: user.tpin || "Not Provided" });
            }
        });
        
        const totalIncome = totalContributions + totalRentalIncome + totalBankInterest + totalOtherIncome;
        const totalExpenditure = totalOperatingExpenses + totalProfessionalFees + totalBankCharges;

        const activityData = [
              { category: "Income", description: "Contributions Received", amount: totalContributions },
              { category: "Income", description: "Rental Income", amount: totalRentalIncome },
              { category: "Income", description: "Bank Interest Earned", amount: totalBankInterest },
              // Add other income sources here if any
              { category: "Expenditure", description: "Operating Expenses", amount: totalOperatingExpenses },
              { category: "Expenditure", description: "Professional Fees Paid", amount: totalProfessionalFees },
              { category: "Expenditure", description: "Bank Charges", amount: totalBankCharges },
              // Add other expenditure categories here if any
        ];

        setGeneratedReportData({
            title: `Annual Financial Summary - ${selectedYear}`,
            dateRange: dateRangeString,
            currencySymbol: globalSettings.currencySymbol || "MK",
            columns: [ { accessorKey: "category", header: "Category" }, { accessorKey: "description", header: "Item" }, { accessorKey: "amount", header: `Amount (${globalSettings.currencySymbol})` } ],
            data: activityData, // Removed .filter(item => item.amount !== 0) to show all categories
            summary: [
                { label: "Total Income", value: totalIncome },
                { label: "Total Expenditure", value: totalExpenditure },
                { label: "Net Activity (Surplus/Deficit)", value: totalIncome - totalExpenditure },
            ],
             _customData: { 
                memberTPINs: memberTPINs,
            }
        });
      
      toast({title: "Annual Summary Generated", description: `Summary for ${selectedYear} is ready.`});
    } catch (err: any) {
      console.error(`Error generating annual financial summary:`, err);
      const firestoreIndexMessage = "This may be due to missing Firestore indexes. Check the developer console (F12 -> Console) for a link to create the required index if provided by Firestore. The query involves filtering 'status' and ordering/ranging by 'datePaid' on the 'contributions' collection, and similar patterns on other collections."
      const errorMessage = `Could not generate summary: ${err.message}. ${firestoreIndexMessage}`;
      setError(errorMessage);
      toast({ title: "Summary Generation Error", description: errorMessage, variant: "destructive", duration: 15000 });
      setGeneratedReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = useCallback(() => {
    if (summaryViewRef.current && generatedReportData) {
      html2canvas(summaryViewRef.current, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        
        let newImgWidth = pdfWidth - 20; 
        let newImgHeight = (imgHeight * newImgWidth) / imgWidth;
        
        if (newImgHeight > pdfHeight - 20) {
            newImgHeight = pdfHeight - 20;
            newImgWidth = (imgWidth * newImgHeight) / imgHeight;
        }
        const x = (pdfWidth - newImgWidth) / 2;
        const y = 10;

        pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
        pdf.save(`Financial_Summary_${selectedYear}.pdf`);
        toast({title: "PDF Exported", description: "Annual financial summary has been downloaded as PDF."});
      });
    } else {
      toast({title: "Export Error", description: "No summary data to export.", variant: "destructive"});
    }
  }, [generatedReportData, selectedYear, toast]);

  const exportToJPG = useCallback(() => {
    if (summaryViewRef.current && generatedReportData) {
      html2canvas(summaryViewRef.current, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `Financial_Summary_${selectedYear}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        toast({title: "JPG Exported", description: "Annual financial summary has been downloaded as JPG."});
      });
    } else {
      toast({title: "Export Error", description: "No summary data to export.", variant: "destructive"});
    }
  }, [generatedReportData, selectedYear, toast]);


  return (
    <ProtectedRoute requiredAccessLevel={2}>
      <PageHeader
        title="Annual Financial Summary"
        description="Generate an annual financial summary based on recorded income and expenditures."
      />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Generate Annual Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a financial year to generate the summary. This report will include all non-voided contributions, rental income, bank interest, operating expenses, professional fees paid, and bank charges for the selected year.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="financial-year">Financial Year</Label>
              <Select onValueChange={setSelectedYear} value={selectedYear}>
                <SelectTrigger id="financial-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {String(year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <Button
              onClick={handleGenerateSummary}
              disabled={loading || !selectedYear}
              className="w-full md:w-auto self-end" 
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {loading ? "Generating..." : "Generate Annual Summary"}
            </Button>
          </div>

          {generatedReportData ? (
            <div className="mt-8">
              <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" onClick={exportToPDF} disabled={loading}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                  <Button variant="outline" onClick={exportToJPG} disabled={loading}><ImageIcon className="mr-2 h-4 w-4" /> Export JPG</Button>
              </div>
              <div ref={summaryViewRef} className="border rounded-lg p-6 bg-white text-black">
                 <ReportView reportData={generatedReportData} />
              </div>
            </div>
          ) : loading ? (
             <div className="text-center py-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-2" />
                <p>Generating summary for {selectedYear}...</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Select a year and click "Generate Annual Summary" to view data.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}

