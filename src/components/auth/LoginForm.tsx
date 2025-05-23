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
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useSettings } from "@/contexts/SettingsProvider";
import Image from "next/image";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function LoginForm() {
  const { auth } = useFirebase();
  const { settings, loading: settingsLoading } = useSettings();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // AuthProvider will handle fetching userProfile and redirecting
      // For now, just push to / as AuthProvider will redirect based on requiresPasswordChange
      router.push("/"); 
    } catch (err: any) {
      setError(err.message || "Failed to login. Please check your credentials.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-lg p-6 md:p-8">
       <div className="mb-6 flex flex-col items-center">
          {settingsLoading ? <div className="h-12 w-12 bg-muted rounded-full animate-pulse" /> : 
            settings.logoUrl ? (
             <Image src={settings.logoUrl} alt={settings.appName} width={48} height={48} className="mb-3" data-ai-hint="logo company"/>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mb-3"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          )}
          <h2 className="text-2xl font-semibold text-center text-foreground">
            Welcome to {settingsLoading ? "Loading..." : settings.appName}
          </h2>
          <p className="text-muted-foreground text-sm text-center">Please sign in to continue</p>
        </div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Login Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Form>
      <div className="mt-6 text-center text-sm">
        <Link href="/forgot-password" legacyBehavior>
          <a className="underline text-primary hover:text-primary/80">
            Forgot password?
          </a>
        </Link>
      </div>
    </div>
  );
}
