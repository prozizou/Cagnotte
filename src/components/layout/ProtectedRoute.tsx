"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/Logo";

/**
 * Protège les pages applicatives : n'affiche le contenu que pour un
 * utilisateur authentifié ET dont le profil Firestore est au statut
 * "approved". C'est une commodité d'UX — la véritable barrière de sécurité
 * est appliquée par les règles Firestore (jamais uniquement côté front).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, loading, profileLoading } = useAuth();
  const router = useRouter();

  const ready = !loading && !profileLoading;

  useEffect(() => {
    if (!ready) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!profile || profile.status !== "approved") {
      router.replace("/pending");
    }
  }, [ready, firebaseUser, profile, router]);

  if (!ready || !firebaseUser || !profile || profile.status !== "approved") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Logo />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-muted-soft">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
