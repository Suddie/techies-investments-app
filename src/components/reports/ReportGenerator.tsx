
"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReportView, { type ReportData } from './ReportView';
import { useSettings } from '@/contexts/SettingsProvider';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Contribution, Penalty } from '@/lib/types';

type ReportType = 'member_statement' | 'financial_activity' | 'contribution_details' | 'penalty_details' | 'expense_details';

const reportTypes: { value: ReportType; label: string }[] = [
  { value: 'member_statement', label: 'Member Statement (My Data)' },
  { value: 'financial_activity', label: 'Monthly Financial Activity (Mock)' },
  { value: 'contribution_details', label: 'Contribution Details (Mock)' },
  // Add more report types here
];

interface StatementTransaction {
  date: Date;
  description: string;
  debit: number | string;
  credit: number | string;
  balance?: number; // Balance will be calculated and added later
}

export default function ReportGenerator() {
  const [reportType, setReportType] = useState<ReportType | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [generatedReportData, setGeneratedReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const reportViewRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const { userProfile } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast({ title: "Selection Missing", description: "Please select a report type.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setGeneratedReportData(null);

    if (reportType === 'member_statement') {
      if (!userProfile) {
        toast({ title: "Authentication Error", description: "You must be logged in to generate a member statement.", variant: "destructive" });
        setLoading(false);
        return;
      }

      try {
        const reportStartDate = dateRange?.from ? startOfDay(dateRange.from) : null;
        const reportEndDate = dateRange?.to ? endOfDay(dateRange.to) : null;

        const allTransactions: StatementTransaction[] = [];

        // Fetch all contributions for the user
        const contributionsRef = collection(db, "contributions");
        const contribQuery = query(contributionsRef, where("userId", "==", userProfile.uid), orderBy("datePaid", "asc"));
        const contribSnap = await getDocs(contribQuery);
        
        contribSnap.forEach(doc => {
          const contrib = doc.data() as Contribution;
          const datePaid = contrib.datePaid instanceof Timestamp ? contrib.datePaid.toDate() : new Date(contrib.datePaid);
          
          if (contrib.amount > 0) {
            allTransactions.push({
              date: datePaid,
              description: "Contribution Received",
              debit: '',
              credit: contrib.amount,
            });
          }
          if (contrib.penaltyPaidAmount && contrib.penaltyPaidAmount > 0) {
            allTransactions.push({
              date: datePaid,
              description: "Penalty Payment Received",
              debit: '',
              credit: contrib.penaltyPaidAmount,
            });
          }
        });

        // Fetch all incurred penalties for the user
        try {
            const penaltiesRef = collection(db, "penalties");
            const penaltyQuery = query(penaltiesRef, where("userId", "==", userProfile.uid), orderBy("dateIssued", "asc"));
            const penaltySnap = await getDocs(penaltyQuery);

            penaltySnap.forEach(doc => {
                const penalty = doc.data() as Penalty;
                const dateIssued = penalty.dateIssued instanceof Timestamp ? penalty.dateIssued.toDate() : new Date(penalty.dateIssued);
                allTransactions.push({
                    date: dateIssued,
                    description: penalty.description || "Penalty Incurred",
                    debit: penalty.amount,
                    credit: '',
                });
            });
        } catch (penaltyError: any) {
            console.warn("Could not fetch penalties, or 'penalties' collection might not exist:", penaltyError.message);
            toast({ 
                title: "Penalty Data Status", 
                description: "Attempted to fetch penalty data. If there were issues (e.g., missing 'penalties' collection or necessary indexes), this section might be incomplete. The report will generate with available data.", 
                variant: "default", 
                duration: 8000
            });
        }
        
        allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

        let openingBalance = 0;
        const statementItems: any[] = [];
        let runningBalance = 0;

        for (const transaction of allTransactions) {
          if (reportStartDate && transaction.date < reportStartDate) {
            openingBalance += (typeof transaction.credit === 'number' ? transaction.credit : 0) - (typeof transaction.debit === 'number' ? transaction.debit : 0);
          }
        }
        runningBalance = openingBalance;
        
        for (const transaction of allTransactions) {
          if (reportStartDate && transaction.date < reportStartDate) {
            continue; 
          }
          if (reportEndDate && transaction.date > reportEndDate) {
            continue; 
          }
          
          runningBalance += (typeof transaction.credit === 'number' ? transaction.credit : 0) - (typeof transaction.debit === 'number' ? transaction.debit : 0);
          statementItems.push({
            date: format(transaction.date, "yyyy-MM-dd"),
            description: transaction.description,
            debit: transaction.debit,
            credit: transaction.credit,
            balance: runningBalance 
          });
        }
        
        const closingBalance = runningBalance;

        const reportData: ReportData = {
          title: `Member Statement - ${userProfile.name || 'Current User'}`,
          dateRange: reportStartDate ? `${format(reportStartDate, "PPP")} - ${reportEndDate ? format(reportEndDate, "PPP") : 'Present'}` : "All Time",
          currencySymbol: settings.currencySymbol || "MK",
          columns: [
            { accessorKey: "date", header: "Date" },
            { accessorKey: "description", header: "Description" },
            { accessorKey: "debit", header: `Debit (${settings.currencySymbol})` },
            { accessorKey: "credit", header: `Credit (${settings.currencySymbol})` },
            { accessorKey: "balance", header: `Balance (${settings.currencySymbol})` },
          ],
          data: statementItems,
          summary: [
            { label: "Opening Balance", value: openingBalance },
            { label: "Total Credits During Period", value: statementItems.reduce((sum, item) => sum + (typeof item.credit === 'number' ? item.credit : 0), 0)},
            { label: "Total Debits During Period", value: statementItems.reduce((sum, item) => sum + (typeof item.debit === 'number' ? item.debit : 0), 0)},
            { label: "Closing Balance", value: closingBalance },
          ],
        };
        setGeneratedReportData(reportData);
      } catch (err: any) {
        console.error("Error generating member statement:", err);
        toast({ title: "Statement Error", description: `Could not generate member statement: ${err.message}. This might be due to missing Firestore indexes.`, variant: "destructive", duration: 10000 });
        setGeneratedReportData(null);
      }

    } else {
      // Existing mock data for other report types
      const mockData: ReportData = {
        title: reportTypes.find(rt => rt.value === reportType)?.label || "Report",
        dateRange: dateRange?.from ? `${format(dateRange.from, "PPP")} - ${dateRange.to ? format(dateRange.to, "PPP") : 'Present'}` : "All Time",
        currencySymbol: settings.currencySymbol || "MK",
        columns: [
            { accessorKey: "date", header: "Date" },
            { accessorKey: "description", header: "Description" },
            { accessorKey: "amount", header: "Amount" }
        ],
        data: [
          { date: "2024-05-01", description: "Mock Contribution", amount: 5000 },
          { date: "2024-05-15", description: "Mock Office Supplies Expense", amount: -1500 },
        ],
         summary: [
          { label: "Total Debits (Mock)", value: 1500 },
          { label: "Total Credits (Mock)", value: 5000 },
          { label: "Net Activity (Mock)", value: 3500 },
        ],
      };
      setGeneratedReportData(mockData);
    }
    setLoading(false);
  };

  const exportToPDF = useCallback(() => {
    if (reportViewRef.current) {
      html2canvas(reportViewRef.current, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        let width = pdfWidth - 20; // with some margin
        let height = (canvasHeight * width) / canvasWidth; // maintain aspect ratio
        
        if (height > pdfHeight - 20) { // If content is taller than page
            height = pdfHeight - 20; // Cap height
            width = (canvasWidth * height) / canvasHeight; // Adjust width to maintain aspect ratio
        }
        const x = (pdfWidth - width) / 2;
        const y = 10; 

        pdf.addImage(imgData, 'PNG', x, y, width, height);
        pdf.save(`${generatedReportData?.title.replace(/\s+/g, '_') || 'report'}.pdf`);
      });
    }
  }, [generatedReportData]);

  const exportToJPG = useCallback(() => {
    if (reportViewRef.current) {
      html2canvas(reportViewRef.current, { scale: 2 }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `${generatedReportData?.title.replace(/\s+/g, '_') || 'report'}.jpg`;
        link.href = canvas.toDataURL('image/jpeg');
        link.click();
      });
    }
  }, [generatedReportData]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Reports</CardTitle>
        <CardDescription>Select report type and date range to generate and export reports.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select onValueChange={(value) => setReportType(value as ReportType)} value={reportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select a report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-range">Date Range (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Button onClick={handleGenerateReport} disabled={loading || !reportType} className="w-full md:w-auto">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          {loading ? "Generating..." : "Generate Report"}
        </Button>

        {generatedReportData && (
          <div className="mt-8">
            <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={exportToPDF}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                <Button variant="outline" onClick={exportToJPG}><ImageIcon className="mr-2 h-4 w-4" /> Export JPG</Button>
            </div>
            <div ref={reportViewRef} className="border rounded-lg p-4 bg-white"> {/* Ensure bg-white for html2canvas */}
              <ReportView reportData={generatedReportData} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

