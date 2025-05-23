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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/contexts/FirebaseProvider";
import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

export default function ForgotPasswordForm() {
  const { auth } = useFirebase();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSuccess("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email.");
      console.error("Password reset error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-lg p-6 md:p-8">
      <h2 className="text-2xl font-semibold text-center mb-2 text-foreground">Forgot Your Password?</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        No worries! Enter your email and we'll send you a reset link.
      </p>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
         <Alert variant="default" className="mb-4 bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="your@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </Form>
      <div className="mt-6 text-center text-sm">
        <Link href="/login" legacyBehavior>
          <a className="underline text-primary hover:text-primary/80">
            Back to login
          </a>
        </Link>
      </div>
    </div>
  );
}
