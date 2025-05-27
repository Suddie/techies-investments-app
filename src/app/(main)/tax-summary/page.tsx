
"use client";

import PageHeader from "@/components/common/PageHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useSettings } from "@/contexts/SettingsProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
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
import { AlertTriangle } from "lucide-react";

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
      const startDate = Timestamp.fromDate(new Date(year, 0, 1)); // Jan 1st
      const endDate = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59, 999)); // Dec 31st

      let totalContributions = 0;
      let totalRentIncome = 0;
      let totalBankInterest = 0;
      let totalExpenses = 0;
      let totalProfessionalFees = 0;
      let totalBankCharges = 0;
      const memberTPINs: { name: string; tpin: string }[] = [];

      // Fetch Contributions
      const contributionsQuery = query(
        collection(db, "contributions"),
        where("datePaid", ">=", startDate),
        where("datePaid", "<=", endDate)
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

      // Fetch Rent Income (Simplified: uses invoiceDate and rentAmount)
      const rentInvoicesQuery = query(
        collection(db, "rentInvoices"),
        where("status", "in", ["Paid", "Sent"]), // Consider only paid or sent invoices as income
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
      const bankBalancesQuery = query(collection(db, "bankBalances")); // Fetch all then filter
      const bankBalancesSnap = await getDocs(bankBalancesQuery);
      bankBalancesSnap.forEach((doc) => {
        const balance = doc.data() as BankBalance;
        // Ensure monthYear is parsed correctly before comparison
        const [balanceYearStr, balanceMonthStr] = balance.monthYear.split("-");
        const balanceYear = parseInt(balanceYearStr, 10);
        if (balanceYear === year) {
          totalBankInterest += balance.interestEarned || 0;
          totalBankCharges += balance.bankCharges || 0;
        }
      });
      
      // Fetch Users for TPIN list
      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach((userDoc) => {
        const user = userDoc.data() as UserProfile;
        if (user.name && user.tpin) {
          memberTPINs.push({ name: user.name, tpin: user.tpin });
        } else if (user.name && !user.tpin) {
           memberTPINs.push({ name: user.name, tpin: "Not Provided" });
        }
      });


      const totalIncome = totalContributions + totalRentIncome + totalBankInterest;
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
        ],
        expenditureBreakdown: [
          { label: "Operating Expenses", amount: totalExpenses },
          { label: "Professional Fees Paid", amount: totalProfessionalFees },
          { label: "Bank Charges", amount: totalBankCharges },
        ],
        memberTPINs: memberTPINs.sort((a,b) => a.name.localeCompare(b.name)),
      });
    } catch (err: any) {
      console.error("Error generating tax summary:", err);
      setError(`Failed to generate summary: ${err.message}. This could be due to missing Firestore indexes. Please check the browser console for a link to create them.`);
    } finally {
      setLoading(false);
    }
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
              className="md:self-end"
            >
              {loading ? "Generating..." : "Generate Summary"}
            </Button>
          </div>

          {summaryData && (
            <Card className="mt-6 border-primary/20 shadow-md">
              <CardHeader>
                <CardTitle>
                  Financial Summary for {summaryData.year}
                </CardTitle>
                <CardDescription className="italic">
                  Company: {globalSettings.invoiceCompanyName || globalSettings.appName} <br />
                  Tax PIN: {globalSettings.companyTaxPIN || "Not Set"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <div>
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

                <div>
                  <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                    Surplus / Deficit
                  </h3>
                  <p className="flex justify-between font-bold text-base">
                    <span>Net Surplus / (Deficit):</span>
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
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2 border-b pb-1">Supporting Information: Member TPINs</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {summaryData.memberTPINs.map(member => (
                        <li key={member.name}>
                          {member.name}: {member.tpin}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-8 text-xs text-muted-foreground border-t pt-4">
                  <p>Generated on: {new Date().toLocaleDateString()}</p>
                  <p className="mt-2 italic">
                    This summary is generated for{" "}
                    {globalSettings.invoiceCompanyName || globalSettings.appName}.
                    Please verify all figures before submission to relevant
                    authorities.
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
