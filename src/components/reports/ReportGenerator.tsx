
"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReportView, { type ReportData } from './ReportView';
import { useSettings } from '@/contexts/SettingsProvider';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthProvider'; // Added
import { useFirebase } from '@/contexts/FirebaseProvider'; // Added
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore'; // Added
import { useToast } from '@/hooks/use-toast'; // Added
import type { Contribution } from '@/lib/types'; // Added

type ReportType = 'member_statement' | 'financial_activity' | 'contribution_details' | 'penalty_details' | 'expense_details';

const reportTypes: { value: ReportType; label: string }[] = [
  { value: 'member_statement', label: 'Member Statement (My Data)' },
  { value: 'financial_activity', label: 'Monthly Financial Activity (Mock)' },
  { value: 'contribution_details', label: 'Contribution Details (Mock)' },
  // Add more report types here
];

export default function ReportGenerator() {
  const [reportType, setReportType] = useState<ReportType | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [generatedReportData, setGeneratedReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const reportViewRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const { userProfile } = useAuth(); // Added
  const { db } = useFirebase(); // Added
  const { toast } = useToast(); // Added

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
        const contributionsRef = collection(db, "contributions");
        const qConstraints = [
          where("userId", "==", userProfile.uid),
          orderBy("datePaid", "asc")
        ];

        if (dateRange?.from) {
          qConstraints.unshift(where("datePaid", ">=", Timestamp.fromDate(dateRange.from)));
        }
        if (dateRange?.to) {
          // To include the whole day, set time to end of day for 'to' date
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          qConstraints.unshift(where("datePaid", "<=", Timestamp.fromDate(toDate)));
        }
        
        const contributionsQuery = query(contributionsRef, ...qConstraints);
        const contribSnap = await getDocs(contributionsQuery);
        
        const statementItems: any[] = [];
        let runningBalance = 0; // Simplified running balance, starts at 0 for the period

        contribSnap.forEach(doc => {
          const contrib = doc.data() as Contribution;
          const datePaid = contrib.datePaid instanceof Timestamp ? contrib.datePaid.toDate() : new Date(contrib.datePaid);
          
          if (contrib.amount > 0) {
            runningBalance += contrib.amount;
            statementItems.push({
              date: format(datePaid, "yyyy-MM-dd"),
              description: "Contribution Received",
              debit: '',
              credit: contrib.amount,
              balance: runningBalance 
            });
          }

          if (contrib.penaltyPaidAmount && contrib.penaltyPaidAmount > 0) {
            runningBalance += contrib.penaltyPaidAmount; // Assuming penalty paid also increases member's "credit" or reduces liability
            statementItems.push({
              date: format(datePaid, "yyyy-MM-dd"),
              description: "Penalty Payment Received",
              debit: '',
              credit: contrib.penaltyPaidAmount,
              balance: runningBalance
            });
          }
        });
        
        // Placeholder for fetching incurred penalties (Debits) - Future enhancement
        // For example, if you have a 'penalties' collection:
        // const penaltiesQuery = query(collection(db, "penalties"), where("userId", "==", userProfile.uid), ...dateFilters);
        // const penaltySnap = await getDocs(penaltiesQuery);
        // penaltySnap.forEach(doc => { ... add to statementItems as debit, update runningBalance ... });
        // statementItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Re-sort if mixing sources


        const reportData: ReportData = {
          title: `Member Statement - ${userProfile.name || 'Current User'}`,
          dateRange: dateRange?.from ? `${format(dateRange.from, "PPP")} - ${dateRange.to ? format(dateRange.to, "PPP") : 'Present'}` : "All Time",
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
            // { label: "Opening Balance", value: 0 }, // Placeholder
            { label: "Total Contributions", value: statementItems.filter(item => item.description === "Contribution Received").reduce((sum, item) => sum + (item.credit || 0), 0)},
            { label: "Total Penalties Paid", value: statementItems.filter(item => item.description === "Penalty Payment Received").reduce((sum, item) => sum + (item.credit || 0), 0)},
            // { label: "Closing Balance", value: runningBalance }, // Placeholder
          ],
        };
        setGeneratedReportData(reportData);
      } catch (err: any) {
        console.error("Error generating member statement:", err);
        toast({ title: "Statement Error", description: `Could not generate member statement: ${err.message}`, variant: "destructive" });
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
        const ratio = canvasWidth / canvasHeight;
        let width = pdfWidth - 20; // with some margin
        let height = width / ratio;
        
        if (height > pdfHeight - 20) { // If content is taller than page
            height = pdfHeight - 20; // Cap height
            width = height * (1/ratio); // Adjust width to maintain aspect ratio
        }
        // Center the image on the PDF page
        const x = (pdfWidth - width) / 2;
        const y = 10; // Top margin

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
            <div ref={reportViewRef} className="border rounded-lg p-4 bg-white">
              <ReportView reportData={generatedReportData} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
