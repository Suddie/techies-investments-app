
"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReportView, { type ReportData } from './ReportView'; // Assuming ReportView component
import { useSettings } from '@/contexts/SettingsProvider';
import { cn } from "@/lib/utils"; // Added import

type ReportType = 'member_statement' | 'financial_activity' | 'contribution_details' | 'penalty_details' | 'expense_details';

const reportTypes: { value: ReportType; label: string }[] = [
  { value: 'member_statement', label: 'Member Statement' },
  { value: 'financial_activity', label: 'Monthly Financial Activity' },
  { value: 'contribution_details', label: 'Contribution Details' },
  // Add more report types here
];

export default function ReportGenerator() {
  const [reportType, setReportType] = useState<ReportType | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [generatedReportData, setGeneratedReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const reportViewRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const handleGenerateReport = () => {
    if (!reportType) {
      alert("Please select a report type.");
      return;
    }
    setLoading(true);
    // Simulate fetching data
    setTimeout(() => {
      const mockData: ReportData = {
        title: reportTypes.find(rt => rt.value === reportType)?.label || "Report",
        dateRange: dateRange ? `${format(dateRange.from!, "PPP")} - ${format(dateRange.to!, "PPP")}` : "All Time",
        currencySymbol: settings.currencySymbol || "MK",
        columns: [ // Example columns
            { accessorKey: "date", header: "Date" },
            { accessorKey: "description", header: "Description" },
            { accessorKey: "amount", header: "Amount" }
        ],
        data: [ // Example data
          { date: "2024-05-01", description: "Contribution", amount: 5000 },
          { date: "2024-05-15", description: "Office Supplies Expense", amount: -1500 },
        ],
      };
      setGeneratedReportData(mockData);
      setLoading(false);
    }, 1000);
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
        const width = pdfWidth - 20; // with some margin
        const height = width / ratio;
        
        let finalHeight = height;
        if (height > pdfHeight - 20) {
            finalHeight = pdfHeight - 20;
        }

        pdf.addImage(imgData, 'PNG', 10, 10, width, finalHeight);
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
            <Label htmlFor="date-range">Date Range</Label>
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
          {loading ? "Generating..." : "Generate Report"}
        </Button>

        {generatedReportData && (
          <div className="mt-8">
            <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={exportToPDF}><FileText className="mr-2 h-4 w-4" /> Export PDF</Button>
                <Button variant="outline" onClick={exportToJPG}><ImageIcon className="mr-2 h-4 w-4" /> Export JPG</Button>
            </div>
            <div ref={reportViewRef} className="border rounded-lg p-4 bg-white"> {/* Ensure background for canvas */}
              <ReportView reportData={generatedReportData} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
