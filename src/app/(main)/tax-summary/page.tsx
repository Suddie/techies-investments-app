
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import React, { useState, useRef, useCallback } from "react";
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
  Penalty,
} from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, ImageIcon, Loader2, FileText } from "lucide-react";
import { format, parse, startOfYear, endOfYear } from "date-fns";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import ReportView, { type ReportData } from '@/components/reports/ReportView';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/AuthProvider";
import { FormDescription } from "@/components/ui/form";


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

interface StatementTransaction {
  date: Date;
  description: string;
  debit: number | string;
  credit: number | string;
  balance?: number;
}

type ReportType = 'member_statement' | 'financial_activity' | 'contribution_details' | 'penalty_details' | 'expense_details';

const reportTypes: { value: ReportType; label: string }[] = [
  { value: 'member_statement', label: 'Member Statement (My Data)' },
  { value: 'financial_activity', label: 'Financial Activity Summary' },
  { value: 'contribution_details', label: 'Contribution Details' },
  // Add more report types here: 'penalty_details', 'expense_details'
];


export default function TaxSummaryPage() {
  const { db } = useFirebase();
  const { userProfile } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string | undefined>(
    String(new Date().getFullYear())
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<TaxSummaryData | null>(null);
  const [generatedReportData, setGeneratedReportData] = useState<ReportData | null>(null); // Correctly declare as state
  const { settings: globalSettings } = useSettings();
  const summaryViewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const yearOptions = generateYearOptions();

  const handleGenerateSummary = async () => {
    if (!selectedReportType) {
      toast({ title: "Selection Missing", description: "Please select a report type.", variant: "destructive" });
      return;
    }
    if (!selectedYear && selectedReportType !== 'member_statement' && !dateRange) {
        toast({ title: "Selection Missing", description: "Please select a year or date range.", variant: "destructive" });
        return;
    }

    setLoading(true);
    setError(null);
    setSummaryData(null);
    setGeneratedReportData(null); // Clear previous report data

    const reportStartDate = dateRange?.from ? startOfYear(dateRange.from) : (selectedYear ? Timestamp.fromDate(startOfYear(new Date(parseInt(selectedYear, 10), 0, 1))) : null);
    const reportEndDate = dateRange?.to ? endOfYear(dateRange.to) : (selectedYear ? Timestamp.fromDate(endOfYear(new Date(parseInt(selectedYear, 10), 11, 31))) : null);
    const dateRangeString = reportStartDate ? `${format(reportStartDate instanceof Timestamp ? reportStartDate.toDate() : reportStartDate, "PPP")} - ${reportEndDate ? format(reportEndDate instanceof Timestamp ? reportEndDate.toDate() : reportEndDate, "PPP") : 'Present'}` : "All Time";


    try {
      if (selectedReportType === 'member_statement') {
        if (!userProfile) {
          toast({ title: "Authentication Error", description: "You must be logged in to generate a member statement.", variant: "destructive" });
          setLoading(false);
          return;
        }

        const allTransactions: StatementTransaction[] = [];
        const contributionsRef = collection(db, "contributions");
        const contribQuery = query(contributionsRef, where("userId", "==", userProfile.uid), where("status", "!=", "voided"), orderBy("datePaid", "asc"));
        const contribSnap = await getDocs(contribQuery);
        
        contribSnap.forEach(doc => {
          const contrib = doc.data() as Contribution;
          const datePaid = contrib.datePaid instanceof Timestamp ? contrib.datePaid.toDate() : new Date(contrib.datePaid);
          
          if (contrib.amount > 0) {
            allTransactions.push({ date: datePaid, description: "Contribution Received", debit: '', credit: contrib.amount });
          }
          if (contrib.penaltyPaidAmount && contrib.penaltyPaidAmount > 0) {
            allTransactions.push({ date: datePaid, description: "Penalty Payment Received", debit: '', credit: contrib.penaltyPaidAmount });
          }
        });

        try {
            const penaltiesRef = collection(db, "penalties");
            const penaltyQuery = query(penaltiesRef, where("userId", "==", userProfile.uid), orderBy("dateIssued", "asc"));
            const penaltySnap = await getDocs(penaltyQuery);
            penaltySnap.forEach(doc => {
                const penalty = doc.data() as Penalty;
                const dateIssued = penalty.dateIssued instanceof Timestamp ? penalty.dateIssued.toDate() : new Date(penalty.dateIssued);
                allTransactions.push({ date: dateIssued, description: penalty.description || "Penalty Incurred", debit: penalty.amount, credit: '' });
            });
        } catch (penaltyError: any) {
            console.warn("Could not fetch penalties for member statement:", penaltyError.message);
        }
        
        allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
        let openingBalance = 0;
        const statementItems: any[] = [];
        let runningBalance = 0;

        for (const transaction of allTransactions) {
          if (reportStartDate && transaction.date < (reportStartDate instanceof Timestamp ? reportStartDate.toDate() : reportStartDate) ) {
            openingBalance += (typeof transaction.credit === 'number' ? transaction.credit : 0) - (typeof transaction.debit === 'number' ? transaction.debit : 0);
          }
        }
        runningBalance = openingBalance;
        
        for (const transaction of allTransactions) {
          if (reportStartDate && transaction.date < (reportStartDate instanceof Timestamp ? reportStartDate.toDate() : reportStartDate)) continue; 
          if (reportEndDate && transaction.date > (reportEndDate instanceof Timestamp ? reportEndDate.toDate() : reportEndDate)) continue; 
          runningBalance += (typeof transaction.credit === 'number' ? transaction.credit : 0) - (typeof transaction.debit === 'number' ? transaction.debit : 0);
          statementItems.push({ date: format(transaction.date, "yyyy-MM-dd"), description: transaction.description, debit: transaction.debit, credit: transaction.credit, balance: runningBalance });
        }
        
        setGeneratedReportData({
          title: `Member Statement - ${userProfile.name || 'Current User'}`,
          dateRange: dateRangeString,
          currencySymbol: globalSettings.currencySymbol || "MK",
          columns: [ { accessorKey: "date", header: "Date" }, { accessorKey: "description", header: "Description" }, { accessorKey: "debit", header: `Debit (${globalSettings.currencySymbol})` }, { accessorKey: "credit", header: `Credit (${globalSettings.currencySymbol})` }, { accessorKey: "balance", header: `Balance (${globalSettings.currencySymbol})` } ],
          data: statementItems,
          summary: [ { label: "Opening Balance", value: openingBalance }, { label: "Total Credits During Period", value: statementItems.reduce((sum, item) => sum + (typeof item.credit === 'number' ? item.credit : 0), 0)}, { label: "Total Debits During Period", value: statementItems.reduce((sum, item) => sum + (typeof item.debit === 'number' ? item.debit : 0), 0)}, { label: "Closing Balance", value: runningBalance } ],
        });


      } else if (selectedReportType === 'financial_activity') {
        let totalContributions = 0, totalRentalIncome = 0, totalBankInterest = 0, totalOtherIncome = 0;
        let totalOperatingExpenses = 0, totalProfessionalFees = 0, totalBankCharges = 0;
        const memberTPINs: { name: string; tpin: string }[] = [];

        let contribQueryConstraints: any[] = [where("status", "!=", "voided"), orderBy("datePaid", "asc")];
        if (reportStartDate) contribQueryConstraints.push(where("datePaid", ">=", reportStartDate));
        if (reportEndDate) contribQueryConstraints.push(where("datePaid", "<=", reportEndDate));
        const contribSnap = await getDocs(query(collection(db, "contributions"), ...contribQueryConstraints));
        contribSnap.forEach(doc => totalContributions += (doc.data() as Contribution).amount || 0);

        let rentQueryConstraints: any[] = [where("status", "==", "Paid"), orderBy("invoiceDate", "asc")];
        if (reportStartDate) rentQueryConstraints.push(where("invoiceDate", ">=", reportStartDate));
        if (reportEndDate) rentQueryConstraints.push(where("invoiceDate", "<=", reportEndDate));
        const rentSnap = await getDocs(query(collection(db, "rentInvoices"), ...rentQueryConstraints));
        rentSnap.forEach(doc => totalRentalIncome += (doc.data() as RentInvoice).rentAmount || 0);

        let bankQueryConstraints: any[] = [orderBy("monthYear", "asc")];
        const bankStartMonth = reportStartDate ? format(reportStartDate instanceof Timestamp ? reportStartDate.toDate() : reportStartDate, 'yyyy-MM') : null;
        const bankEndMonth = reportEndDate ? format(reportEndDate instanceof Timestamp ? reportEndDate.toDate() : reportEndDate, 'yyyy-MM') : null;

        if (bankStartMonth) bankQueryConstraints.push(where("monthYear", ">=", bankStartMonth));
        if (bankEndMonth) bankQueryConstraints.push(where("monthYear", "<=", bankEndMonth));
        
        const bankSnap = await getDocs(query(collection(db, "bankBalances"), ...bankQueryConstraints));
        bankSnap.forEach(doc => {
            const data = doc.data() as BankBalance;
            totalBankInterest += data.interestEarned || 0;
            totalBankCharges += data.bankCharges || 0;
        });
        
        let expenseQueryConstraints: any[] = [orderBy("date", "asc")];
        if (reportStartDate) expenseQueryConstraints.push(where("date", ">=", reportStartDate));
        if (reportEndDate) expenseQueryConstraints.push(where("date", "<=", reportEndDate));
        const expenseSnap = await getDocs(query(collection(db, "expenses"), ...expenseQueryConstraints));
        expenseSnap.forEach(doc => totalOperatingExpenses += (doc.data() as Expense).totalAmount || 0);

        const profSnap = await getDocs(collection(db, "professionals"));
        profSnap.forEach(profDoc => {
            const prof = profDoc.data() as Professional;
            if (prof.paymentHistory) {
                prof.paymentHistory.forEach(payment => {
                    const paymentDate = payment.date instanceof Timestamp ? payment.date.toDate() : new Date(payment.date);
                    const startDateLimit = reportStartDate instanceof Timestamp ? reportStartDate.toDate() : reportStartDate;
                    const endDateLimit = reportEndDate instanceof Timestamp ? reportEndDate.toDate() : reportEndDate;
                    if ((!startDateLimit || paymentDate >= startDateLimit) && (!endDateLimit || paymentDate <= endDateLimit)) {
                        totalProfessionalFees += payment.amountPaid || 0;
                    }
                });
            }
        });

        const usersSnap = await getDocs(query(collection(db, "users"), orderBy("name", "asc")));
        usersSnap.forEach((userDoc) => {
            const user = userDoc.data() as UserProfile;
            if (user.name) { 
            memberTPINs.push({ name: user.name, tpin: user.tpin || "Not Provided" });
            }
        });
        
        const totalIncome = totalContributions + totalRentalIncome + totalBankInterest + totalOtherIncome;
        const totalExpenditure = totalOperatingExpenses + totalProfessionalFees + totalBankCharges;

        const currentSummaryData = {
            year: selectedYear || format(new Date(), 'yyyy'),
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
            title: `Financial Activity Summary`,
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
        });
      }
      toast({title: "Report Generated", description: `Report for ${selectedReportType} covering ${dateRangeString} is ready.`});
    } catch (err: any) {
      console.error(`Error generating ${selectedReportType} report:`, err);
      toast({ title: "Report Generation Error", description: `Could not generate report: ${err.message}. This may be due to missing Firestore indexes.`, variant: "destructive", duration: 10000 });
      setGeneratedReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = useCallback(() => {
    if (summaryViewRef.current && (summaryData || generatedReportData)) {
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
        pdf.save(`Financial_Summary_${summaryData?.year || selectedReportType}.pdf`);
        toast({title: "PDF Exported", description: "Financial summary has been downloaded as PDF."});
      });
    } else {
      toast({title: "Export Error", description: "No summary data to export.", variant: "destructive"});
    }
  }, [summaryData, generatedReportData, selectedReportType, toast]);

  const exportToJPG = useCallback(() => {
    if (summaryViewRef.current && (summaryData || generatedReportData)) {
      html2canvas(summaryViewRef.current, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `Financial_Summary_${summaryData?.year || selectedReportType}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        toast({title: "JPG Exported", description: "Financial summary has been downloaded as JPG."});
      });
    } else {
      toast({title: "Export Error", description: "No summary data to export.", variant: "destructive"});
    }
  }, [summaryData, generatedReportData, selectedReportType, toast]);


  return (
    <ProtectedRoute requiredAccessLevel={2}>
      <PageHeader
        title="Annual Financial Summary & Reports"
        description="Generate financial summaries and detailed reports."
      />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Report Generation Options</CardTitle>
          <CardDescription>
            Select report type and date range to generate your report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="report-type-selector">Report Type</Label>
               <Select onValueChange={(value) => setSelectedReportType(value as ReportType)} value={selectedReportType}>
                <SelectTrigger id="report-type-selector"> <SelectValue placeholder="Select report type" /> </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((rt) => ( <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem> ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="financial-year">Financial Year (for Summary)</Label>
              <Select onValueChange={setSelectedYear} value={selectedYear} disabled={!!dateRange || selectedReportType === 'member_statement'}>
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
               <FormDescription className="text-xs">Overrides date range if selected. Not used if "Member Statement" is chosen.</FormDescription>
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="date-range-selector">Or Custom Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-range-selector" variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                      disabled={!!selectedYear && selectedReportType !== 'member_statement'}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                  </PopoverContent>
                </Popover>
                 <FormDescription className="text-xs">Overrides year selection if set. Used for all report types.</FormDescription>
            </div>
          </div>
           <Button
              onClick={handleGenerateSummary}
              disabled={loading || !selectedReportType}
              className="w-full md:w-auto mt-4"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {loading ? "Generating..." : "Generate Report"}
            </Button>


          {(summaryData || generatedReportData) && (
            <div className="mt-8">
              <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" onClick={exportToPDF} disabled={loading}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                  <Button variant="outline" onClick={exportToJPG} disabled={loading}><ImageIcon className="mr-2 h-4 w-4" /> Export JPG</Button>
              </div>
              <div ref={summaryViewRef} className="border rounded-lg p-6 bg-white text-black">
                 {selectedReportType === 'financial_activity' && summaryData ? (
                     <ReportView reportData={{
                        title: `Financial Summary for ${summaryData.year}`,
                        dateRange: dateRangeString, // Use the calculated dateRangeString
                        currencySymbol: globalSettings.currencySymbol || "MK",
                        columns: [], 
                        data: [], 
                        summary: [
                            { label: "Total Income", value: summaryData.totalIncome },
                            { label: "Total Expenditure", value: summaryData.totalExpenditure },
                            { label: "Net Surplus / Deficit", value: summaryData.surplusDeficit }
                        ],
                        _customData: { // For custom rendering logic specific to financial_activity
                            incomeBreakdown: summaryData.incomeBreakdown,
                            expenditureBreakdown: summaryData.expenditureBreakdown,
                            memberTPINs: summaryData.memberTPINs,
                            surplusDeficit: summaryData.surplusDeficit,
                        }
                    } as any} />
                 ) : generatedReportData ? (
                    <ReportView reportData={generatedReportData} />
                 ) : <p>Report data is being prepared...</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}
