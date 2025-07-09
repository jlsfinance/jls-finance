import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export function FirebaseNotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive">Firebase Not Configured</CardTitle>
          <CardDescription>
            Your Firebase environment variables are missing. The application cannot connect to Firebase without them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>To fix this, please follow these steps:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Create a file named <strong><code>.env.local</code></strong> in the root directory of your project (the same level as `package.json`).</li>
            <li>Go to your Firebase project settings and find your web app's configuration.</li>
            <li>Copy your Firebase config keys into the <strong><code>.env.local</code></strong> file. It should look like this:</li>
          </ol>
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Example .env.local</AlertTitle>
            <AlertDescription>
              <pre className="mt-2 overflow-x-auto rounded-md bg-slate-950 p-4 font-mono text-xs text-slate-50">
                {`NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"\nNEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"\nNEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"\nNEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"`}
              </pre>
            </AlertDescription>
          </Alert>
          <p className="font-semibold">After creating the file, you must restart your development server for the changes to take effect.</p>
        </CardContent>
      </Card>
    </div>
  );
}
