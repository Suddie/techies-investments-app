
"use client";

import type { RentInvoice, GlobalSettings } from "@/lib/types";
import Image from "next/image";
import { format } from "date-fns";

interface InvoicePDFViewProps {
  invoice: RentInvoice;
  settings: GlobalSettings;
}

export default function InvoicePDFView({ invoice, settings }: InvoicePDFViewProps) {
  if (!invoice || !settings) {
    return <div className="p-4 text-red-500">Error: Missing invoice or settings data.</div>;
  }

  const displayLogoUrl = settings.useAppLogoForInvoice === false && settings.invoiceLogoUrl
    ? settings.invoiceLogoUrl
    : settings.logoUrl;

  return (
    <div className="p-8 bg-white text-black font-sans text-sm" style={{ width: '210mm', minHeight: '297mm' }}> {/* A4 Size-ish */}
      {/* Letterhead */}
      <header className="mb-8 border-b pb-4">
        <div className="flex justify-between items-start">
          <div>
            {displayLogoUrl && (
              <Image
                src={displayLogoUrl}
                alt={`${settings.appName} Logo`}
                width={100}
                height={50}
                className="object-contain mb-2"
                data-ai-hint="logo company document"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-800">{settings.invoiceCompanyName || settings.appName}</h1>
            <p className="text-xs text-gray-600">{settings.invoiceAddress || "Address not set"}</p>
            <p className="text-xs text-gray-600">{settings.invoiceContact || "Contact not set"}</p>
            {settings.companyTaxPIN && <p className="text-xs text-gray-600">Tax PIN: {settings.companyTaxPIN}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-semibold text-gray-700">INVOICE</h2>
            <p className="text-xs text-gray-500">Invoice #: {invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-500">Date: {format(invoice.invoiceDate instanceof Date ? invoice.invoiceDate : new Date(invoice.invoiceDate), "PPP")}</p>
          </div>
        </div>
      </header>

      {/* Bill To & Due Date */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-1">BILL TO:</h3>
            <p className="text-gray-600">{invoice.tenantName}</p>
            <p className="text-gray-600">Unit: {invoice.unitNumber}</p>
            {/* Add tenant address if available in Tenant object and needed */}
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-gray-700 mb-1">DUE DATE:</h3>
            <p className="text-gray-600 font-medium">{format(invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate), "PPP")}</p>
          </div>
        </div>
      </section>

      {/* Invoice Items Table */}
      <section className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="border p-2 text-left font-semibold">Description</th>
              <th className="border p-2 text-right font-semibold">Amount ({settings.currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">
                Rent for period: {format(invoice.periodCoveredStart instanceof Date ? invoice.periodCoveredStart : new Date(invoice.periodCoveredStart), "MMM dd, yyyy")} - {format(invoice.periodCoveredEnd instanceof Date ? invoice.periodCoveredEnd : new Date(invoice.periodCoveredEnd), "MMM dd, yyyy")}
              </td>
              <td className="border p-2 text-right">{invoice.rentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            {invoice.arrearsBroughtForward > 0 && (
              <tr>
                <td className="border p-2">Arrears Brought Forward</td>
                <td className="border p-2 text-right">{invoice.arrearsBroughtForward.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            )}
            {/* Add other charges here if applicable */}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-gray-700">
              <td className="border p-2 text-right">Total Due:</td>
              <td className="border p-2 text-right bg-gray-50">{settings.currencySymbol} {invoice.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
             {invoice.amountPaid > 0 && (
              <tr className="font-semibold text-gray-700">
                <td className="border p-2 text-right">Amount Paid:</td>
                <td className="border p-2 text-right">{settings.currencySymbol} {invoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            )}
            {invoice.amountPaid > 0 && (
                <tr className="font-bold text-xl text-gray-800">
                    <td className="border p-2 text-right">Balance Due:</td>
                    <td className="border p-2 text-right bg-gray-100">
                        {settings.currencySymbol} {(invoice.totalDue - invoice.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                </tr>
            )}
          </tfoot>
        </table>
      </section>

      {/* Notes & Footer */}
      <section className="mb-8">
        {invoice.notes && (
          <>
            <h3 className="font-semibold text-gray-700 mb-1">Notes:</h3>
            <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </>
        )}
      </section>

      <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
        <p>Thank you for your business!</p>
        <p>Please make payments to [Your Bank Account Details Here - consider making this a setting].</p>
        <p className="mt-2">{settings.invoiceCompanyName || settings.appName} - {settings.invoiceContact}</p>
      </footer>
    </div>
  );
}
