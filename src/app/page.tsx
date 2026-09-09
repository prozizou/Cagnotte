"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/Logo";

export default function RootPage() {
  const { firebaseUser, profile, loading, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
    } else if (!profile || profile.status !== "approved") {
      router.replace("/pending");
    } else {
      router.replace(profile.role === "superadmin" ? "/utilisateurs" : "/dashboard");
    }
  }, [firebaseUser, profile, loading, profileLoading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Logo />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted-soft">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}
