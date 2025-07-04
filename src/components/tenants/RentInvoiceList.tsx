
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { RentInvoice, InvoiceStatus } from '@/lib/types';
import { useAuth } from '@/contexts/AuthProvider';
import { useSettings } from '@/contexts/SettingsProvider';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Download, FileText, CheckCircle, AlertTriangle, Send, CircleSlash, DollarSign } from "lucide-react"; // Added DollarSign
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import InvoicePDFView from './InvoicePDFView';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createRoot } from 'react-dom/client';

interface RentInvoiceListProps {
  onRecordPayment: (invoice: RentInvoice) => void;
}

export default function RentInvoiceList({ onRecordPayment }: RentInvoiceListProps) {
  const { userProfile, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<RentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const pdfRenderRef = useRef<HTMLDivElement | null>(null);

  const canManageInvoices = userProfile && userProfile.accessLevel <= 1;

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!userProfile || !canManageInvoices) {
      setLoading(false);
      setInvoices([]);
      return;
    }

    setLoading(true);
    const invoicesRef = collection(db, "rentInvoices");
    const q = query(invoicesRef, orderBy("invoiceDate", "desc"), orderBy("invoiceNumber", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedInvoices: RentInvoice[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedInvoices.push({
          id: docSnap.id,
          ...data,
          invoiceDate: data.invoiceDate instanceof Timestamp ? data.invoiceDate.toDate() : new Date(data.invoiceDate),
          dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(data.dueDate),
          periodCoveredStart: data.periodCoveredStart instanceof Timestamp ? data.periodCoveredStart.toDate() : new Date(data.periodCoveredStart),
          periodCoveredEnd: data.periodCoveredEnd instanceof Timestamp ? data.periodCoveredEnd.toDate() : new Date(data.periodCoveredEnd),
          datePaid: data.datePaid instanceof Timestamp ? data.datePaid.toDate() : (data.datePaid ? new Date(data.datePaid) : undefined),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        } as RentInvoice);
      });
      setInvoices(fetchedInvoices);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching rent invoices:", err);
      toast({
        title: "Error Fetching Invoices",
        description: `Could not load rent invoices: ${err.message}. Check Firestore permissions or if a required index is missing.`,
        variant: "destructive",
        duration: 10000,
      });
      setLoading(false);
    });

    if (!pdfRenderRef.current) {
      const hiddenDiv = document.createElement('div');
      hiddenDiv.style.position = 'absolute';
      hiddenDiv.style.left = '-9999px';
      hiddenDiv.style.top = '-9999px';
      hiddenDiv.style.width = '794px'; 
      document.body.appendChild(hiddenDiv);
      pdfRenderRef.current = hiddenDiv;
    }
    
    return () => {
      unsubscribe();
      if (pdfRenderRef.current && pdfRenderRef.current.parentNode === document.body) {
        document.body.removeChild(pdfRenderRef.current);
        pdfRenderRef.current = null;
      }
    };
  }, [db, toast, userProfile, authLoading, canManageInvoices]);

  const handleDownloadPDF = async (invoice: RentInvoice) => {
    if (!pdfRenderRef.current || !invoice) return;

    const pdfContainer = pdfRenderRef.current;
    const root = createRoot(pdfContainer); 
    
    root.render(<InvoicePDFView invoice={invoice} settings={settings} />);

    setTimeout(async () => {
      try {
        if (pdfContainer.firstChild) { 
            const canvas = await html2canvas(pdfContainer.firstChild as HTMLElement, { 
            scale: 2, 
            useCORS: true,
            logging: false,
           });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          const imgProps= pdf.getImageProperties(imgData);
          const imgWidth = imgProps.width;
          const imgHeight = imgProps.height;
          const ratio = imgHeight / imgWidth;
          
          let newImgWidth = pdfWidth - 20; 
          let newImgHeight = newImgWidth * ratio;

          if (newImgHeight > pdfHeight - 20) { 
              newImgHeight = pdfHeight - 20; 
              newImgWidth = newImgHeight / ratio;
          }
          
          const x = (pdfWidth - newImgWidth) / 2; 
          const y = 10; 

          pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
          pdf.save(`Invoice_${invoice.invoiceNumber}_${invoice.tenantName.replace(/\s+/g, '_')}.pdf`);
        } else {
            console.error("PDF Render container is empty after React render attempt.");
            toast({title: "PDF Generation Error", description: "Could not render content for PDF.", variant: "destructive"});
        }
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({title: "PDF Generation Error", description: "Could not generate PDF.", variant: "destructive"});
      } finally {
        root.unmount(); 
      }
    }, 100); 
  };


  const getStatusBadgeInfo = (status: InvoiceStatus): { className: string; icon: React.ElementType, label: string } => {
    switch (status) {
      case 'Paid':
        return { className: 'bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-300 dark:border-green-700', icon: CheckCircle, label: 'Paid' };
      case 'Sent':
        return { className: 'bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300 border-blue-300 dark:border-blue-700', icon: Send, label: 'Sent' };
      case 'Overdue':
        return { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', icon: AlertTriangle, label: 'Overdue' };
      case 'Draft':
        return { className: 'border-gray-400 text-gray-600 dark:border-gray-600 dark:text-gray-400', icon: FileText, label: 'Draft' };
      case 'Cancelled':
        return { className: 'bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-300 dark:border-red-700', icon: CircleSlash, label: 'Cancelled' };
      default:
        return { className: 'border-gray-400 text-gray-600 dark:border-gray-600 dark:text-gray-400', icon: FileText, label: status };
    }
  };

  if (authLoading || loading) {
    return (
      <Card>
        <CardHeader><CardTitle>{authLoading ? "Authenticating..." : "Loading Invoices..."}</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }
  
  if (!userProfile || !canManageInvoices) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view rent invoices.</CardDescription>
        </CardHeader>
         <CardContent>
            <p className="text-center text-muted-foreground py-8">
                Please ensure you are logged in with appropriate permissions (Level 1).
            </p>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rent Invoices</CardTitle>
          <CardDescription>No rent invoices found.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Level 1 users can create invoices from the "Tenants" tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rent Invoice History</CardTitle>
        <CardDescription>List of all generated rent invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Tenant Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Total Due ({settings.currencySymbol})</TableHead>
              <TableHead className="text-right">Amount Paid ({settings.currencySymbol})</TableHead>
              <TableHead>Status</TableHead>
              {canManageInvoices && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const statusInfo = getStatusBadgeInfo(invoice.status);
              const StatusIcon = statusInfo.icon;
              const isPayable = invoice.status !== 'Paid' && invoice.status !== 'Cancelled';
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                  <TableCell className="font-medium">{invoice.tenantName}</TableCell>
                  <TableCell>{invoice.unitNumber}</TableCell>
                  <TableCell>{format(invoice.invoiceDate, "PP")}</TableCell>
                  <TableCell>{format(invoice.dueDate, "PP")}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {invoice.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusInfo.className} flex items-center w-fit`}>
                      <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  {canManageInvoices && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Invoice Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>
                          {isPayable && (
                            <DropdownMenuItem onClick={() => onRecordPayment(invoice)}>
                              <DollarSign className="mr-2 h-4 w-4" /> Record Payment
                            </DropdownMenuItem>
                          )}
                          {/* Add more actions like Edit, Send Reminder, Cancel Invoice later */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
