
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
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout"; // To protect the route

const generalSettingsSchema = z.object({
  appName: z.string().min(3, "App name must be at least 3 characters.").max(50, "App name must be at most 50 characters."),
  currencySymbol: z.string().min(1, "Currency symbol is required.").max(5, "Currency symbol is too long."),
});

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

export default function AdminSettingsPage() {
  const { settings, loading: settingsLoading } = useSettings();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const generalForm = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      appName: settings.appName || "",
      currencySymbol: settings.currencySymbol || "",
    },
  });

  useEffect(() => {
    if (!settingsLoading) {
      generalForm.reset({
        appName: settings.appName,
        currencySymbol: settings.currencySymbol,
      });
    }
  }, [settings, settingsLoading, generalForm]);

  const handleSaveGeneralSettings = async (values: GeneralSettingsFormValues) => {
    setIsSaving(true);
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
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: `Failed to update settings: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Other settings forms (financial, theme, etc.) would go here

  return (
    <AppLayout adminOnly={true} requiredAccessLevel={1}> {/* Protect route */}
      <PageHeader
        title="Admin Settings"
        description="Manage global application settings and configurations."
      />
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          {/* Add more tabs like Theme, Invoice etc. */}
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Application Settings</CardTitle>
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
                    <Button type="submit" disabled={isSaving || settingsLoading}>
                      {isSaving ? "Saving..." : "Save General Settings"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>Configure contribution limits, penalties, etc. (Coming soon)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Minimum/Maximum contribution amounts, penalty settings, and other financial configurations will be managed here.
              </p>
              {/* Form for minContribution, maxContribution, penaltyAmount will go here */}
            </CardContent>
          </Card>
        </TabsContent>
        {/* More TabsContent for Theme, Invoice, etc. */}
      </Tabs>
    </AppLayout>
  );
}
