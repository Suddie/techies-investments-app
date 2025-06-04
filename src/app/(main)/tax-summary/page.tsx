
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
} from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, ImageIcon, Loader2, FileText } from "lucide-react";
import { format, startOfYear, endOfYear, parse } from "date-fns";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import ReportView, { type ReportData } from '@/components/reports/ReportView';
import { useAuth } from "@/contexts/AuthProvider";


const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

interface TaxSummaryData {
  year: string;
  totalIncome: number;
  totalExpenditure: number;
  surplusDeficit: number;
  incomeBreakdown: { label: string; amount: number }[];
  expenditureBreakdown: { label: string; amount: number }[];
  memberTPINs: { name: string; tpin: string }[];
}


export default function TaxSummaryPage() {
  const { db } = useFirebase();
  const { userProfile } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string | undefined>(
    String(new Date().getFullYear())
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<TaxSummaryData | null>(null);
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
    setSummaryData(null);
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
        // Removed explicit orderBy("datePaid", "asc") from here
        let contribQuery = query(contributionsRef, where("status", "!=", "voided"));
        
        if (reportStartDate) {
            contribQuery = query(contribQuery, where("datePaid", ">=", reportStartDate));
        }
        if (reportEndDate) {
            // Add orderBy before the second range filter if not already present and different field
            // For same field, orderBy is not strictly needed before both range filters
            contribQuery = query(contribQuery, where("datePaid", "<=", reportEndDate), orderBy("datePaid", "asc"));
        } else {
            // If only startDate, we might still want to order
             contribQuery = query(contribQuery, orderBy("datePaid", "asc"));
        }

        const contribSnap = await getDocs(contribQuery);
        contribSnap.forEach(doc => totalContributions += (doc.data() as Contribution).amount || 0);


        // Rental Income
        let rentQueryConstraints: any[] = [where("status", "==", "Paid"), orderBy("invoiceDate", "asc")];
        if (reportStartDate) rentQueryConstraints.push(where("invoiceDate", ">=", reportStartDate));
        if (reportEndDate) rentQueryConstraints.push(where("invoiceDate", "<=", reportEndDate));
        const rentSnap = await getDocs(query(collection(db, "rentInvoices"), ...rentQueryConstraints));
        rentSnap.forEach(doc => totalRentalIncome += (doc.data() as RentInvoice).rentAmount || 0);

        // Bank Interest & Charges
        let bankQueryConstraints: any[] = [orderBy("monthYear", "asc")];
        const bankStartMonth = reportStartDate ? format(reportStartDate.toDate(), 'yyyy-MM') : null;
        const bankEndMonth = reportEndDate ? format(reportEndDate.toDate(), 'yyyy-MM') : null;

        if (bankStartMonth) bankQueryConstraints.push(where("monthYear", ">=", bankStartMonth));
        if (bankEndMonth) bankQueryConstraints.push(where("monthYear", "<=", bankEndMonth));
        
        const bankSnap = await getDocs(query(collection(db, "bankBalances"), ...bankQueryConstraints));
        bankSnap.forEach(doc => {
            const data = doc.data() as BankBalance;
            totalBankInterest += data.interestEarned || 0;
            totalBankCharges += data.bankCharges || 0;
        });
        
        // Operating Expenses
        let expenseQueryConstraints: any[] = [orderBy("date", "asc")];
        if (reportStartDate) expenseQueryConstraints.push(where("date", ">=", reportStartDate));
        if (reportEndDate) expenseQueryConstraints.push(where("date", "<=", reportEndDate));
        const expenseSnap = await getDocs(query(collection(db, "expenses"), ...expenseQueryConstraints));
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

        const currentSummaryData: TaxSummaryData = {
            year: selectedYear,
            totalIncome,
            totalExpenditure,
            surplusDeficit: totalIncome - totalExpenditure,
            incomeBreakdown: [
              { label: "Contributions Received", amount: totalContributions },
              { label: "Rental Income", amount: totalRentalIncome },
              { label: "Bank Interest Earned", amount: totalBankInterest },
            ].filter(item => item.amount !== 0),
            expenditureBreakdown: [
              { label: "Operating Expenses", amount: totalOperatingExpenses },
              { label: "Professional Fees Paid", amount: totalProfessionalFees },
              { label: "Bank Charges", amount: totalBankCharges },
            ].filter(item => item.amount !== 0),
            memberTPINs: memberTPINs,
        };
        setSummaryData(currentSummaryData);

        setGeneratedReportData({
            title: `Annual Financial Summary - ${selectedYear}`,
            dateRange: dateRangeString,
            currencySymbol: globalSettings.currencySymbol || "MK",
            columns: [ { accessorKey: "category", header: "Category" }, { accessorKey: "description", header: "Item" }, { accessorKey: "amount", header: `Amount (${globalSettings.currencySymbol})` } ],
            data: [
                ...currentSummaryData.incomeBreakdown.map(item => ({ category: "Income", description: item.label, amount: item.amount })),
                ...currentSummaryData.expenditureBreakdown.map(item => ({ category: "Expenditure", description: item.label, amount: item.amount })),
            ].filter(item => item.amount !==0),
            summary: [
                { label: "Total Income", value: totalIncome },
                { label: "Total Expenditure", value: totalExpenditure },
                { label: "Net Activity (Surplus/Deficit)", value: totalIncome - totalExpenditure },
            ],
             _customData: { 
                memberTPINs: currentSummaryData.memberTPINs,
            }
        });
      
      toast({title: "Annual Summary Generated", description: `Summary for ${selectedYear} is ready.`});
    } catch (err: any) {
      console.error(`Error generating annual financial summary:`, err);
      toast({ title: "Summary Generation Error", description: `Could not generate summary: ${err.message}. This may be due to missing Firestore indexes. Check the developer console for a link to create the index if provided by Firestore.`, variant: "destructive", duration: 10000 });
      setGeneratedReportData(null);
      setSummaryData(null);
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
                <p className="text-xs text-muted-foreground">Select a year and click "Generate Annual Summary" to view data.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}

    
