
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import React, { useState, useRef, useCallback } from "react"; // Added useRef, useCallback
import { useSettings } from "@/contexts/SettingsProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy, // Added orderBy
} from "firebase/firestore";
import type {
  Contribution,
  Expense,
  RentInvoice,
  Professional,
  BankBalance,
  UserProfile,
  Penalty, // Added Penalty type
} from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, ImageIcon, Loader2, FileText } from "lucide-react"; // Added icons
import { format, parse, startOfYear, endOfYear } from "date-fns"; // Added date-fns functions
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";


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
  const [selectedYear, setSelectedYear] = useState<string | undefined>(
    String(new Date().getFullYear())
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<TaxSummaryData | null>(null);
  const { settings: globalSettings } = useSettings();
  const summaryViewRef = useRef<HTMLDivElement>(null); // Ref for the summary content
  const { toast } = useToast();

  const yearOptions = generateYearOptions();

  const handleGenerateSummary = async () => {
    if (!selectedYear) {
      setError("Please select a financial year.");
      return;
    }
    setLoading(true);
    setError(null);
    setSummaryData(null);

    try {
      const year = parseInt(selectedYear, 10);
      const startDate = Timestamp.fromDate(startOfYear(new Date(year, 0, 1))); 
      const endDate = Timestamp.fromDate(endOfYear(new Date(year, 11, 31))); 

      let totalContributions = 0;
      let totalRentIncome = 0;
      let totalBankInterest = 0;
      let totalOtherIncome = 0; // Placeholder for future income types
      let totalExpenses = 0;
      let totalProfessionalFees = 0;
      let totalBankCharges = 0;
      const memberTPINs: { name: string; tpin: string }[] = [];

      // Fetch Contributions (excluding voided)
      const contributionsQuery = query(
        collection(db, "contributions"),
        where("datePaid", ">=", startDate),
        where("datePaid", "<=", endDate),
        where("status", "!=", "voided") // Exclude voided contributions
      );
      const contributionsSnap = await getDocs(contributionsQuery);
      contributionsSnap.forEach((doc) => {
        totalContributions += (doc.data() as Contribution).amount || 0;
      });

      // Fetch Expenses
      const expensesQuery = query(
        collection(db, "expenses"),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const expensesSnap = await getDocs(expensesQuery);
      expensesSnap.forEach((doc) => {
        totalExpenses += (doc.data() as Expense).totalAmount || 0;
      });

      // Fetch Rent Income (considering only Paid invoices)
      const rentInvoicesQuery = query(
        collection(db, "rentInvoices"),
        where("status", "==", "Paid"), 
        where("invoiceDate", ">=", startDate),
        where("invoiceDate", "<=", endDate)
      );
      const rentInvoicesSnap = await getDocs(rentInvoicesQuery);
      rentInvoicesSnap.forEach((doc) => {
        totalRentIncome += (doc.data() as RentInvoice).rentAmount || 0;
      });
      
      // Fetch Professional Payments
      const professionalsSnap = await getDocs(collection(db, "professionals"));
      professionalsSnap.forEach((profDoc) => {
        const professional = profDoc.data() as Professional;
        if (professional.paymentHistory) {
          professional.paymentHistory.forEach((payment) => {
            const paymentDate = payment.date instanceof Timestamp ? payment.date.toDate() : new Date(payment.date);
            if (paymentDate >= startDate.toDate() && paymentDate <= endDate.toDate()) {
              totalProfessionalFees += payment.amountPaid || 0;
            }
          });
        }
      });

      // Fetch Bank Balances for Interest and Charges
      const bankBalancesQuery = query(collection(db, "bankBalances")); 
      const bankBalancesSnap = await getDocs(bankBalancesQuery);
      bankBalancesSnap.forEach((doc) => {
        const balance = doc.data() as BankBalance;
        const [balanceYearStr] = balance.monthYear.split("-");
        const balanceYear = parseInt(balanceYearStr, 10);
        if (balanceYear === year) {
          totalBankInterest += balance.interestEarned || 0;
          totalBankCharges += balance.bankCharges || 0;
        }
      });
      
      // Fetch Users for TPIN list
      const usersSnap = await getDocs(query(collection(db, "users"), orderBy("name", "asc")));
      usersSnap.forEach((userDoc) => {
        const user = userDoc.data() as UserProfile;
        if (user.name) { // Include all users with names
          memberTPINs.push({ name: user.name, tpin: user.tpin || "Not Provided" });
        }
      });


      const totalIncome = totalContributions + totalRentIncome + totalBankInterest + totalOtherIncome;
      const totalExpenditure = totalExpenses + totalProfessionalFees + totalBankCharges;
      const surplusDeficit = totalIncome - totalExpenditure;

      setSummaryData({
        year: selectedYear,
        totalIncome,
        totalExpenditure,
        surplusDeficit,
        incomeBreakdown: [
          { label: "Contributions Received", amount: totalContributions },
          { label: "Rental Income", amount: totalRentIncome },
          { label: "Bank Interest Earned", amount: totalBankInterest },
          // { label: "Other Income", amount: totalOtherIncome }, // Add if used
        ].filter(item => item.amount !== 0),
        expenditureBreakdown: [
          { label: "Operating Expenses", amount: totalExpenses },
          { label: "Professional Fees Paid", amount: totalProfessionalFees },
          { label: "Bank Charges", amount: totalBankCharges },
        ].filter(item => item.amount !== 0),
        memberTPINs: memberTPINs,
      });
      toast({title: "Summary Generated", description: `Financial summary for ${selectedYear} is ready.`});
    } catch (err: any) {
      console.error("Error generating tax summary:", err);
      setError(`Failed to generate summary: ${err.message}. This could be due to missing Firestore indexes. Please check the browser console for a link to create them.`);
      toast({ title: "Summary Generation Error", description: `Could not generate summary: ${err.message}. Check console for Firestore index links.`, variant: "destructive", duration: 10000 });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = useCallback(() => {
    if (summaryViewRef.current && summaryData) {
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
        pdf.save(`Financial_Summary_${summaryData.year}.pdf`);
        toast({title: "PDF Exported", description: "Financial summary has been downloaded as PDF."});
      });
    } else {
      toast({title: "Export Error", description: "No summary data to export.", variant: "destructive"});
    }
  }, [summaryData, toast]);

  const exportToJPG = useCallback(() => {
    if (summaryViewRef.current && summaryData) {
      html2canvas(summaryViewRef.current, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `Financial_Summary_${summaryData.year}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9); // Quality 0.9
        link.click();
        toast({title: "JPG Exported", description: "Financial summary has been downloaded as JPG."});
      });
    } else {
      toast({title: "Export Error", description: "No summary data to export.", variant: "destructive"});
    }
  }, [summaryData, toast]);


  return (
    <ProtectedRoute requiredAccessLevel={2}>
      <PageHeader
        title="Annual Financial Summary"
        description="Generate a financial summary for tax reporting purposes."
      />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Select Financial Year</CardTitle>
          <CardDescription>
            Choose the year for which you want to generate the summary.
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
              className="w-full md:w-auto"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {loading ? "Generating..." : "Generate Summary"}
            </Button>
          </div>

          {summaryData && (
            <div className="mt-8">
              <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" onClick={exportToPDF} disabled={loading}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                  <Button variant="outline" onClick={exportToJPG} disabled={loading}><ImageIcon className="mr-2 h-4 w-4" /> Export JPG</Button>
              </div>
              <div ref={summaryViewRef} className="border rounded-lg p-6 bg-white text-black"> {/* Wrapper for html2canvas */}
                <header className="mb-6 text-center">
                  {globalSettings.logoUrl && (
                      <img 
                          src={globalSettings.logoUrl} 
                          alt={`${globalSettings.appName} Logo`} 
                          width={80} 
                          height={80} 
                          className="mx-auto mb-2 object-contain"
                          data-ai-hint="logo company document"
                      />
                  )}
                  <h1 className="text-2xl font-bold">{globalSettings.invoiceCompanyName || globalSettings.appName}</h1>
                  {globalSettings.companyTaxPIN && <p className="text-xs text-gray-600 mt-1">Tax PIN: {globalSettings.companyTaxPIN}</p>}
                  <h2 className="text-xl font-semibold mt-2">Financial Summary for {summaryData.year}</h2>
                  <p className="text-sm text-gray-600">Period: January 1, {summaryData.year} - December 31, {summaryData.year}</p>
                </header>

                <div>
                  <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                    Income Statement
                  </h3>
                  <div className="space-y-1 text-sm">
                    {summaryData.incomeBreakdown.map((item) => (
                      <p className="flex justify-between" key={item.label}>
                        <span>{item.label}:</span>
                        <span>
                          {globalSettings.currencySymbol}{" "}
                          {item.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </p>
                    ))}
                    <p className="flex justify-between font-bold border-t pt-1 mt-1 text-base">
                      <span>Total Income:</span>
                      <span>
                        {globalSettings.currencySymbol}{" "}
                        {summaryData.totalIncome.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                    Expenditure
                  </h3>
                  <div className="space-y-1 text-sm">
                     {summaryData.expenditureBreakdown.map((item) => (
                      <p className="flex justify-between" key={item.label}>
                        <span>{item.label}:</span>
                        <span>
                          {globalSettings.currencySymbol}{" "}
                          {item.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </p>
                    ))}
                    <p className="flex justify-between font-bold border-t pt-1 mt-1 text-base">
                      <span>Total Expenditure:</span>
                      <span>
                        {globalSettings.currencySymbol}{" "}
                        {summaryData.totalExpenditure.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                    Surplus / Deficit
                  </h3>
                  <p className={`flex justify-between font-bold text-base ${summaryData.surplusDeficit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    <span>Net {summaryData.surplusDeficit >=0 ? 'Surplus' : 'Deficit'}:</span>
                    <span>
                      {globalSettings.currencySymbol}{" "}
                      {summaryData.surplusDeficit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                </div>
                
                {summaryData.memberTPINs.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2 border-b pb-1">Supporting Information: Member TPINs</h3>
                    <ul className="list-disc pl-5 text-xs space-y-0.5 columns-1 sm:columns-2 md:columns-3">
                      {summaryData.memberTPINs.map(member => (
                        <li key={member.name} className="break-inside-avoid">
                          {member.name}: {member.tpin}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <footer className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                  <p>Generated on: {new Date().toLocaleDateString()}</p>
                  <p className="mt-2 italic">
                    This summary is generated for{" "}
                    {globalSettings.invoiceCompanyName || globalSettings.appName}.
                    Please verify all figures before submission to relevant
                    authorities.
                  </p>
                   <p className="mt-1">
                      {globalSettings.invoiceAddress} - {globalSettings.invoiceContact}
                    </p>
                </footer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}


    