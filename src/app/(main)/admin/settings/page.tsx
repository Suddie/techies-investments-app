
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

const generalSettingsSchema = z.object({
  appName: z.string().min(3, "App name must be at least 3 characters.").max(50, "App name must be at most 50 characters."),
  currencySymbol: z.string().min(1, "Currency symbol is required.").max(5, "Currency symbol is too long."),
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
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generalForm = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      appName: settings.appName || "",
      currencySymbol: settings.currencySymbol || "MK",
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
      });
      financialForm.reset({
        contributionMin: settings.contributionMin,
        contributionMax: settings.contributionMax,
        penaltyAmount: settings.penaltyAmount,
      });
      setLogoPreview(settings.logoUrl);
    }
  }, [settings, settingsLoading, generalForm, financialForm]);

  const handleSaveGeneralSettings = async (values: GeneralSettingsFormValues) => {
    setIsSavingGeneral(true);
    try {
      const settingsDocRef = doc(db, "settings", "global_settings");
      await updateDoc(settingsDocRef, {
        appName: values.appName,
        currencySymbol: values.currencySymbol,
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

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = async () => {
    if (!selectedLogoFile) {
      toast({ title: "No logo selected", description: "Please select a logo file to upload.", variant: "destructive" });
      return;
    }
    setIsUploadingLogo(true);
    try {
      const logoFileName = `app_logo_${Date.now()}_${selectedLogoFile.name}`;
      const logoStorageRef = ref(storage, `settings/${logoFileName}`);
      await uploadBytes(logoStorageRef, selectedLogoFile);
      const downloadURL = await getDownloadURL(logoStorageRef);

      const settingsDocRef = doc(db, "settings", "global_settings");
      await updateDoc(settingsDocRef, { logoUrl: downloadURL });

      setLogoPreview(downloadURL);
      setSelectedLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast({ title: "Logo Uploaded", description: "Application logo has been updated." });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({ title: "Logo Upload Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setIsUploadingLogo(true);
    try {
      if (settings.logoUrl) {
        try {
          const oldLogoRef = ref(storage, settings.logoUrl);
          await deleteObject(oldLogoRef);
        } catch (storageError: any) {
          console.warn("Could not delete old logo from storage:", storageError.message);
        }
      }
      const settingsDocRef = doc(db, "settings", "global_settings");
      await updateDoc(settingsDocRef, { logoUrl: null });
      setLogoPreview(null);
      setSelectedLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Logo Removed", description: "Application logo has been removed." });
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast({ title: "Error Removing Logo", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
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
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
                <CardDescription>Manage the application's name and main currency.</CardDescription>
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
                <CardTitle>Application Logo</CardTitle>
                <CardDescription>Upload or remove the application logo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? (
                  <p>Loading logo...</p>
                ) : (
                  <>
                    <Label>Current Logo</Label>
                    <div className="flex items-center justify-center w-full h-32 rounded-md border border-dashed bg-muted/50 mb-4">
                      {logoPreview ? (
                        <Image src={logoPreview} alt="Current App Logo" width={100} height={100} className="object-contain h-28 w-28" data-ai-hint="logo company"/>
                      ) : (
                        <p className="text-muted-foreground">No logo uploaded</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="logo-upload">Upload New Logo</Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml, image/gif"
                        onChange={handleLogoFileChange}
                        ref={fileInputRef}
                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      <p className="text-sm text-muted-foreground">Recommended: Square logo, PNG or SVG.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUploadLogo} disabled={isUploadingLogo || !selectedLogoFile} className="flex-1">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                      </Button>
                      {settings.logoUrl && (
                        <Button variant="destructive" onClick={handleRemoveLogo} disabled={isUploadingLogo} className="flex-1">
                           <XCircle className="mr-2 h-4 w-4" />
                          Remove Logo
                        </Button>
                      )}
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
