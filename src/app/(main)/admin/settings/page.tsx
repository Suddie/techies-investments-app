
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import { useSettings } from "@/contexts/SettingsProvider";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState, useRef } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Image from "next/image";
import { UploadCloud, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Added Switch import

const generalSettingsSchema = z.object({
  appName: z.string().min(3, "App name must be at least 3 characters.").max(50, "App name must be at most 50 characters."),
  currencySymbol: z.string().min(1, "Currency symbol is required.").max(5, "Currency symbol is too long."),
  invoiceCompanyName: z.string().min(3, "Company name is required.").max(100, "Company name is too long.").optional().or(z.literal('')),
  invoiceAddress: z.string().min(5, "Address is required.").max(200, "Address is too long.").optional().or(z.literal('')),
  invoiceContact: z.string().min(5, "Contact info is required.").max(100, "Contact info is too long.").optional().or(z.literal('')),
  companyTaxPIN: z.string().min(5, "Tax PIN is required.").max(30, "Tax PIN is too long.").optional().or(z.literal('')),
  useAppLogoForInvoice: z.boolean().optional(), // Added
});

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

const financialSettingsSchema = z.object({
  contributionMin: z.coerce.number().min(0, "Minimum contribution must be non-negative.").optional(),
  contributionMax: z.coerce.number().min(0, "Maximum contribution must be non-negative.").optional(),
  penaltyAmount: z.coerce.number().min(0, "Penalty amount must be non-negative.").optional(),
});

type FinancialSettingsFormValues = z.infer<typeof financialSettingsSchema>;


export default function AdminSettingsPage() {
  const { settings, loading: settingsLoading } = useSettings();
  const { db, storage } = useFirebase();
  const { toast } = useToast();
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingFinancial, setIsSavingFinancial] = useState(false);

  const [selectedAppLogoFile, setSelectedAppLogoFile] = useState<File | null>(null);
  const [appLogoPreview, setAppLogoPreview] = useState<string | null>(settings.logoUrl);
  const [isUploadingAppLogo, setIsUploadingAppLogo] = useState(false);
  const appLogoFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedInvoiceLogoFile, setSelectedInvoiceLogoFile] = useState<File | null>(null);
  const [invoiceLogoPreview, setInvoiceLogoPreview] = useState<string | null>(settings.invoiceLogoUrl);
  const [isUploadingInvoiceLogo, setIsUploadingInvoiceLogo] = useState(false);
  const invoiceLogoFileInputRef = useRef<HTMLInputElement>(null);


  const generalForm = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      appName: settings.appName || "",
      currencySymbol: settings.currencySymbol || "MK",
      invoiceCompanyName: settings.invoiceCompanyName || "",
      invoiceAddress: settings.invoiceAddress || "",
      invoiceContact: settings.invoiceContact || "",
      companyTaxPIN: settings.companyTaxPIN || "",
      useAppLogoForInvoice: settings.useAppLogoForInvoice || false,
    },
  });

  const financialForm = useForm<FinancialSettingsFormValues>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: {
      contributionMin: settings.contributionMin || 0,
      contributionMax: settings.contributionMax || 0,
      penaltyAmount: settings.penaltyAmount || 0,
    },
  });

  useEffect(() => {
    if (!settingsLoading) {
      generalForm.reset({
        appName: settings.appName,
        currencySymbol: settings.currencySymbol || "MK",
        invoiceCompanyName: settings.invoiceCompanyName || "",
        invoiceAddress: settings.invoiceAddress || "",
        invoiceContact: settings.invoiceContact || "",
        companyTaxPIN: settings.companyTaxPIN || "",
        useAppLogoForInvoice: settings.useAppLogoForInvoice || false,
      });
      financialForm.reset({
        contributionMin: settings.contributionMin,
        contributionMax: settings.contributionMax,
        penaltyAmount: settings.penaltyAmount,
      });
      setAppLogoPreview(settings.logoUrl);
      setInvoiceLogoPreview(settings.invoiceLogoUrl);
    }
  }, [settings, settingsLoading, generalForm, financialForm]);

  const handleSaveGeneralSettings = async (values: GeneralSettingsFormValues) => {
    setIsSavingGeneral(true);
    try {
      const settingsDocRef = doc(db, "settings", "global_settings");
      await updateDoc(settingsDocRef, {
        appName: values.appName,
        currencySymbol: values.currencySymbol,
        invoiceCompanyName: values.invoiceCompanyName,
        invoiceAddress: values.invoiceAddress,
        invoiceContact: values.invoiceContact,
        companyTaxPIN: values.companyTaxPIN,
        useAppLogoForInvoice: values.useAppLogoForInvoice,
      });
      toast({
        title: "Settings Updated",
        description: "General settings have been saved.",
      });
    } catch (error: any) {
      console.error("Error updating general settings:", error);
      toast({
        title: "Error",
        description: `Failed to update general settings: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingGeneral(false);
    }
  };
  
  const handleSaveFinancialSettings = async (values: FinancialSettingsFormValues) => {
    setIsSavingFinancial(true);
    try {
      const settingsDocRef = doc(db, "settings", "global_settings");
      await updateDoc(settingsDocRef, {
        contributionMin: values.contributionMin,
        contributionMax: values.contributionMax,
        penaltyAmount: values.penaltyAmount,
      });
      toast({
        title: "Settings Updated",
        description: "Financial settings have been saved.",
      });
    } catch (error: any) {
      console.error("Error updating financial settings:", error);
      toast({
        title: "Error",
        description: `Failed to update financial settings: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingFinancial(false);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'app' | 'invoice') => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (type === 'app') {
        setSelectedAppLogoFile(file);
        setAppLogoPreview(URL.createObjectURL(file));
      } else {
        setSelectedInvoiceLogoFile(file);
        setInvoiceLogoPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleUploadLogo = async (type: 'app' | 'invoice') => {
    const selectedFile = type === 'app' ? selectedAppLogoFile : selectedInvoiceLogoFile;
    const settingKey = type === 'app' ? 'logoUrl' : 'invoiceLogoUrl';
    const setIsUploading = type === 'app' ? setIsUploadingAppLogo : setIsUploadingInvoiceLogo;
    const setPreview = type === 'app' ? setAppLogoPreview : setInvoiceLogoPreview;
    const setSelectedFile = type === 'app' ? setSelectedAppLogoFile : setSelectedInvoiceLogoFile;
    const fileInputRef = type === 'app' ? appLogoFileInputRef : invoiceLogoFileInputRef;
    const toastTitle = type === 'app' ? 'App Logo' : 'Invoice Logo';

    if (!selectedFile) {
      toast({ title: `No ${type} logo selected`, description: `Please select a logo file to upload.`, variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const logoFileName = `${type}_logo_${Date.now()}_${selectedFile.name}`;
      const logoStorageRef = ref(storage, `settings/${logoFileName}`);
      await uploadBytes(logoStorageRef, selectedFile);
      const downloadURL = await getDownloadURL(logoStorageRef);

      const settingsDocRef = doc(db, "settings", "global_settings");
      await updateDoc(settingsDocRef, { [settingKey]: downloadURL });

      setPreview(downloadURL);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast({ title: `${toastTitle} Uploaded`, description: `${toastTitle} has been updated.` });
    } catch (error: any) {
      console.error(`Error uploading ${type} logo:`, error);
      toast({ title: `${toastTitle} Upload Error`, description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async (type: 'app' | 'invoice') => {
    const currentLogoUrl = type === 'app' ? settings.logoUrl : settings.invoiceLogoUrl;
    const settingKey = type === 'app' ? 'logoUrl' : 'invoiceLogoUrl';
    const setIsUploading = type === 'app' ? setIsUploadingAppLogo : setIsUploadingInvoiceLogo;
    const setPreview = type === 'app' ? setAppLogoPreview : setInvoiceLogoPreview;
    const setSelectedFile = type === 'app' ? setSelectedAppLogoFile : setSelectedInvoiceLogoFile;
    const fileInputRef = type === 'app' ? appLogoFileInputRef : invoiceLogoFileInputRef;
    const toastTitle = type === 'app' ? 'App Logo' : 'Invoice Logo';

    setIsUploading(true);
    try {
      if (currentLogoUrl) {
        try {
          const oldLogoRef = ref(storage, currentLogoUrl);
          await deleteObject(oldLogoRef);
        } catch (storageError: any) {
          console.warn(`Could not delete old ${type} logo from storage:`, storageError.message);
        }
      }
      const settingsDocRef = doc(db, "settings", "global_settings");
      await updateDoc(settingsDocRef, { [settingKey]: null });
      setPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: `${toastTitle} Removed`, description: `${toastTitle} has been removed.` });
    } catch (error: any) {
      console.error(`Error removing ${type} logo:`, error);
      toast({ title: `Error Removing ${toastTitle}`, description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <ProtectedRoute adminOnly={true} requiredAccessLevel={1}>
      <PageHeader
        title="Admin Settings"
        description="Manage global application settings and configurations."
      />
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
          <TabsTrigger value="general">General & Branding</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application & Company Details</CardTitle>
                <CardDescription>Manage general application and company information.</CardDescription>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <p>Loading settings...</p>
                ) : (
                  <Form {...generalForm}>
                    <form onSubmit={generalForm.handleSubmit(handleSaveGeneralSettings)} className="space-y-6">
                      <FormField
                        control={generalForm.control}
                        name="appName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Application Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your App Name" {...field} />
                            </FormControl>
                            <FormDescription>This name will appear throughout the application.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generalForm.control}
                        name="currencySymbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency Symbol</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., $, MK, £" {...field} />
                            </FormControl>
                            <FormDescription>The main currency symbol used for financial values.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generalForm.control}
                        name="invoiceCompanyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name (for Invoices/Reports)</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Company Ltd." {...field} />
                            </FormControl>
                            <FormDescription>Name appearing on invoices and reports.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generalForm.control}
                        name="invoiceAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Address (for Invoices/Reports)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="P.O. Box 123, City, Country" {...field} />
                            </FormControl>
                            <FormDescription>Address appearing on invoices and reports.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generalForm.control}
                        name="invoiceContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Contact (for Invoices/Reports)</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com / +123456789" {...field} />
                            </FormControl>
                            <FormDescription>Contact details for invoices and reports.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={generalForm.control}
                        name="companyTaxPIN"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Tax PIN</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Company's Tax PIN" {...field} />
                            </FormControl>
                            <FormDescription>The company's official Tax Payer Identification Number.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generalForm.control}
                        name="useAppLogoForInvoice"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Use App Logo for Invoices</FormLabel>
                              <FormDescription>
                                If enabled, the main app logo will be used on invoices. Otherwise, the specific invoice logo (if uploaded) will be used.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isSavingGeneral || settingsLoading}>
                        {isSavingGeneral ? "Saving..." : "Save Details"}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branding & Logos</CardTitle>
                <CardDescription>Manage application and invoice logos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {settingsLoading ? (
                  <p>Loading logo settings...</p>
                ) : (
                  <>
                    {/* App Logo Section */}
                    <div>
                      <Label className="text-lg font-semibold">Application Logo</Label>
                      <div className="flex items-center justify-center w-full h-32 rounded-md border border-dashed bg-muted/50 mt-2 mb-4">
                        {appLogoPreview ? (
                          <Image src={appLogoPreview} alt="Current App Logo" width={100} height={100} className="object-contain h-28 w-28" data-ai-hint="logo company"/>
                        ) : (
                          <p className="text-muted-foreground">No app logo uploaded</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="app-logo-upload">Upload New App Logo</Label>
                        <Input
                          id="app-logo-upload"
                          type="file"
                          accept="image/png, image/jpeg, image/svg+xml, image/gif"
                          onChange={(e) => handleLogoFileChange(e, 'app')}
                          ref={appLogoFileInputRef}
                          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        <p className="text-sm text-muted-foreground">Recommended: Square logo, PNG or SVG.</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button onClick={() => handleUploadLogo('app')} disabled={isUploadingAppLogo || !selectedAppLogoFile} className="flex-1">
                          <UploadCloud className="mr-2 h-4 w-4" />
                          {isUploadingAppLogo ? "Uploading..." : "Upload App Logo"}
                        </Button>
                        {settings.logoUrl && (
                          <Button variant="destructive" onClick={() => handleRemoveLogo('app')} disabled={isUploadingAppLogo} className="flex-1">
                            <XCircle className="mr-2 h-4 w-4" />
                            Remove App Logo
                          </Button>
                        )}
                      </div>
                    </div>

                    <hr className="my-6" />

                    {/* Invoice Logo Section */}
                    <div>
                      <Label className="text-lg font-semibold">Invoice Logo</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        This logo will be used on invoices if "Use App Logo for Invoices" is disabled.
                      </p>
                      <div className="flex items-center justify-center w-full h-32 rounded-md border border-dashed bg-muted/50 mt-2 mb-4">
                        {invoiceLogoPreview ? (
                          <Image src={invoiceLogoPreview} alt="Current Invoice Logo" width={100} height={100} className="object-contain h-28 w-28" data-ai-hint="logo company document"/>
                        ) : (
                          <p className="text-muted-foreground">No invoice logo uploaded</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="invoice-logo-upload">Upload New Invoice Logo</Label>
                        <Input
                          id="invoice-logo-upload"
                          type="file"
                          accept="image/png, image/jpeg, image/svg+xml, image/gif"
                          onChange={(e) => handleLogoFileChange(e, 'invoice')}
                          ref={invoiceLogoFileInputRef}
                          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button onClick={() => handleUploadLogo('invoice')} disabled={isUploadingInvoiceLogo || !selectedInvoiceLogoFile} className="flex-1">
                          <UploadCloud className="mr-2 h-4 w-4" />
                          {isUploadingInvoiceLogo ? "Uploading..." : "Upload Invoice Logo"}
                        </Button>
                        {settings.invoiceLogoUrl && (
                          <Button variant="destructive" onClick={() => handleRemoveLogo('invoice')} disabled={isUploadingInvoiceLogo} className="flex-1">
                            <XCircle className="mr-2 h-4 w-4" />
                            Remove Invoice Logo
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>Configure contribution limits and penalty amounts.</CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <p>Loading financial settings...</p>
              ) : (
                <Form {...financialForm}>
                  <form onSubmit={financialForm.handleSubmit(handleSaveFinancialSettings)} className="space-y-6">
                    <FormField
                      control={financialForm.control}
                      name="contributionMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Contribution ({settings.currencySymbol})</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 1000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormDescription>The minimum amount allowed for a single contribution.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={financialForm.control}
                      name="contributionMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Contribution ({settings.currencySymbol})</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 100000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormDescription>The maximum amount allowed for a single contribution. Set to 0 for no limit.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={financialForm.control}
                      name="penaltyAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Penalty Amount ({settings.currencySymbol})</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 500" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormDescription>The default amount charged for late contributions or other penalties.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSavingFinancial || settingsLoading}>
                      {isSavingFinancial ? "Saving..." : "Save Financial Settings"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ProtectedRoute>
  );
}
