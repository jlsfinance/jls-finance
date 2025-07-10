
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { auth, db, isFirebaseInitialized } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { FirebaseNotConfigured } from "@/components/FirebaseNotConfigured";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.34 1.63-4.08 1.63-3.34 0-6.03-2.73-6.03-6.1s2.69-6.1 6.03-6.1c1.87 0 3.13.77 3.9 1.5l2.6-2.6C16.99 3.13 15.01 2 12.48 2c-5.45 0-9.84 4.4-9.84 9.84s4.39 9.84 9.84 9.84c5.19 0 9.4-3.57 9.4-9.48 0-.6-.05-1.18-.15-1.74H12.48z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@jls.com",
      password: "",
    },
  });

  if (!isFirebaseInitialized) {
    return <FirebaseNotConfigured />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth || !db) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not configured correctly.",
      });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please check your email and password.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerGoogleLogin = async () => {
    if (!auth || !db) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase is not configured.",
      });
      return;
    }
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role !== "customer") {
          await signOut(auth);
          toast({
            variant: "destructive",
            title: "Access Denied",
            description:
              "Google Sign-In is for customers only. Admins and Agents must use email/password.",
          });
          setGoogleLoading(false);
          return;
        }
      }

      toast({ title: "Login Successful", description: `Welcome!` });
      router.push("/dashboard");
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">JLS Finance Company</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-md border bg-muted/50 p-4 text-sm">
            <p className="font-bold text-foreground">Admin Credentials for Demo</p>
            <p className="text-muted-foreground">
              <strong>Email:</strong>{" "}
              <code className="font-mono text-primary">admin@jls.com</code>
            </p>
            <p className="text-muted-foreground">
              <strong>Password:</strong>{" "}
              <code className="font-mono text-primary">password</code>
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} />
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
              <div className="flex items-center justify-between">
                <Button variant="link" size="sm" asChild className="p-0">
                  <Link href="/forgot-password">Forgot Password?</Link>
                </Button>
              </div>
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={loading || googleLoading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            type="button"
            disabled={loading || googleLoading}
            onClick={handleCustomerGoogleLogin}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Sign in with Google
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Customers only</p>
        </CardContent>
        <CardContent className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="underline text-primary">
            Sign up
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
