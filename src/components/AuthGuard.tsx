"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { auth, isFirebaseInitialized } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FirebaseNotConfigured } from './FirebaseNotConfigured';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  if (!isFirebaseInitialized) {
    return <FirebaseNotConfigured />;
  }

  useEffect(() => {
    // Auth object is guaranteed to be available if isFirebaseInitialized is true
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      if (user) {
        // User is signed in.
        // You could also fetch user role from Firestore here if needed.
        setLoading(false);
      } else {
        // User is signed out.
        router.push('/login');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
