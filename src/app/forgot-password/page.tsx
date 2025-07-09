"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, isFirebaseInitialized } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { FirebaseNotConfigured } from "@/components/FirebaseNotConfigured";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  if (!isFirebaseInitialized) {
    return <FirebaseNotConfigured />;
  }

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not configured correctly.",
      });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, you will receive a password reset link shortly.",
      });
      setSubmitted(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Forgot Your Password?</CardTitle>
          <CardDescription>No worries! Enter your email and we'll send you a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
            {submitted ? (
                <div className="text-center">
                    <p className="text-green-600 font-medium">A password reset link has been sent to your email address.</p>
                    <p className="text-sm text-muted-foreground mt-2">Please check your inbox (and spam folder).</p>
                </div>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                    </Button>
                    </form>
                </Form>
            )}
        </CardContent>
        <CardContent className="mt-4 text-center text-sm">
          <Link href="/login" className="underline text-primary">
            Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
