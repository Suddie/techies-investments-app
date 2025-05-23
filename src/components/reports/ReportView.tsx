"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { useSettings } from "@/contexts/SettingsProvider";
import Image from "next/image";

export interface ReportColumn {
    accessorKey: string;
    header: string;
}

export interface ReportData {
  title: string;
  dateRange: string;
  currencySymbol: string;
  columns: ReportColumn[];
  data: Record<string, any>[]; // Array of data objects
  summary?: { label: string; value: string | number }[];
}

interface ReportViewProps {
  reportData: ReportData;
}

export default function ReportView({ reportData }: ReportViewProps) {
  const { settings: globalSettings, loading: settingsLoading } = useSettings();

  if (!reportData) return <p>No report data to display.</p>;

  return (
    <div className="p-4 text-black bg-white"> {/* Ensure text is black for PDF/JPG export */}
      <header className="mb-6 text-center">
        {globalSettings.logoUrl && !settingsLoading && (
            <Image 
                src={globalSettings.logoUrl} 
                alt={`${globalSettings.appName} Logo`} 
                width={80} 
                height={80} 
                className="mx-auto mb-2 object-contain"
                data-ai-hint="logo company"
            />
        )}
        <h1 className="text-2xl font-bold">{globalSettings.appName}</h1>
        <h2 className="text-xl font-semibold">{reportData.title}</h2>
        <p className="text-sm text-gray-600">For the period: {reportData.dateRange}</p>
      </header>

      {reportData.data.length === 0 ? (
        <p className="text-center text-gray-500 my-8">No data available for this report and period.</p>
      ) : (
        <Table>
          {/* <TableCaption>A list of financial transactions for the selected period.</TableCaption> */}
          <TableHeader>
            <TableRow>
              {reportData.columns.map((col) => (
                <TableHead key={col.accessorKey} className="font-semibold">{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {reportData.columns.map((col) => (
                  <TableCell key={`${rowIndex}-${col.accessorKey}`}>
                    {typeof row[col.accessorKey] === 'number' && col.accessorKey.toLowerCase().includes('amount') 
                      ? `${reportData.currencySymbol} ${row[col.accessorKey].toLocaleString()}` 
                      : row[col.accessorKey]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {reportData.summary && reportData.summary.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">Summary</h3>
          {reportData.summary.map((item, index) => (
            <div key={index} className="flex justify-between text-sm mb-1">
              <span>{item.label}:</span>
              <span className="font-medium">
                {typeof item.value === 'number' 
                  ? `${reportData.currencySymbol} ${item.value.toLocaleString()}` 
                  : item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <footer className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
        <p>Generated on: {new Date().toLocaleDateString()}</p>
        <p>{globalSettings.appName} - {globalSettings.invoiceAddress || "Investment Group"}</p>
        <p className="mt-2 italic">This is an automatically generated report. Please verify all figures.</p>
      </footer>
    </div>
  );
}
