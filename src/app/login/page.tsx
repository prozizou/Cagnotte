"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { Field, inputClass } from "@/components/ui/Field";
import { APP_TAGLINE } from "@/lib/constants";
import toast from "react-hot-toast";
import { ShieldCheck, TrendingUp, Users2, Eye, EyeOff } from "lucide-react";

function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email ou mot de passe incorrect.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    case "auth/invalid-email":
      return "Adresse email invalide.";
    default:
      return "Connexion impossible. Réessayez.";
  }
}

export default function LoginPage() {
  const { firebaseUser, profile, loading, profileLoading, signInWithGoogle, signInWithEmail, sendPasswordReset } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (loading || profileLoading || !firebaseUser) return;
    if (!profile || profile.status !== "approved") {
      router.replace("/pending");
    } else {
      router.replace("/dashboard");
    }
  }, [firebaseUser, profile, loading, profileLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Renseignez votre email et votre mot de passe.");
      return;
    }
    setSigningIn(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      toast.error(authErrorMessage((err as { code?: string })?.code));
    } finally {
      setSigningIn(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error("Saisissez d'abord votre email ci-dessus.");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordReset(email.trim());
      toast.success("Email de réinitialisation envoyé ✔ (vérifiez vos spams)");
    } catch (err) {
      toast.error(authErrorMessage((err as { code?: string })?.code));
    } finally {
      setResetting(false);
    }
  }

  async function handleGoogleFallback() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast.error("Connexion impossible. Réessayez.");
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-3.5 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <Field label="Email" required>
            <input
              type="email"
              autoComplete="username"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              autoFocus
            />
          </Field>
          <Field label="Mot de passe" required>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={`${inputClass} pr-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetting}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
          >
            {resetting ? "Envoi…" : "Mot de passe oublié ?"}
          </button>

          <button
            type="submit"
            disabled={signingIn}
            className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {signingIn ? "Connexion…" : "Se connecter"}
          </button>

          <p className="text-center text-xs leading-relaxed text-muted">
            Connectez-vous avec les identifiants fournis par votre administrateur.
          </p>

          <button
            type="button"
            onClick={handleGoogleFallback}
            disabled={signingIn}
            className="mx-auto block text-xs font-medium text-muted hover:text-foreground hover:underline"
          >
            Compte déjà lié à Google ? Se connecter avec Google
          </button>
        </form>

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
