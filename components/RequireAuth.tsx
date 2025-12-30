//RequireAuth.tsx
"use client";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // User is not authenticated, redirect immediately
      router.replace("/");
    }
  }, [loading, user, router]);

  // Always show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }
  
  // If no user after loading, show nothing (redirecting)
  if (!user) {
    return null;
  }
  
  return <>{children}</>;
}

