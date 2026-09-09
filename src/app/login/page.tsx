"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { APP_TAGLINE } from "@/lib/constants";
import toast from "react-hot-toast";
import { ShieldCheck, TrendingUp, Users2 } from "lucide-react";

export default function LoginPage() {
  const { firebaseUser, profile, loading, profileLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (loading || profileLoading || !firebaseUser) return;
    if (!profile || profile.status !== "approved") {
      router.replace("/pending");
    } else {
      router.replace(profile.role === "superadmin" ? "/utilisateurs" : "/dashboard");
    }
  }, [firebaseUser, profile, loading, profileLoading, router]);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast.error("Connexion impossible. Merci de réessayer.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo size={48} withText={false} />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Cotiz</h1>
          <p className="mt-1.5 text-sm text-muted">{APP_TAGLINE}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted-soft disabled:opacity-60"
          >
            <GoogleIcon />
            {signingIn ? "Connexion…" : "Continuer avec Google"}
          </button>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted">
            L&apos;accès à l&apos;application est soumis à l&apos;autorisation d&apos;un
            administrateur après votre première connexion.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <Feature icon={Users2} label="Multi-utilisateur" />
          <Feature icon={TrendingUp} label="Suivi d'objectif" />
          <Feature icon={ShieldCheck} label="Accès sécurisé" />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Users2; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-sm">
        <Icon size={16} />
      </span>
      <span className="text-[11px] font-medium text-muted">{label}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.59-5.17 3.59-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.94 11.94 0 0 0 0 12c0 1.93.46 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
