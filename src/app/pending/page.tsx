"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { Clock, ShieldX, ShieldAlert, LogOut, AlertTriangle, RotateCw } from "lucide-react";

const CONTENT: Record<string, { icon: typeof Clock; title: string; desc: string; tone: string }> = {
  pending: {
    icon: Clock,
    title: "Votre demande d'accès est en attente d'autorisation",
    desc: "Un administrateur doit approuver votre compte avant que vous puissiez accéder à l'application. Vous recevrez l'accès dès que votre demande sera traitée.",
    tone: "warning",
  },
  rejected: {
    icon: ShieldX,
    title: "Votre demande d'accès a été refusée",
    desc: "L'administrateur n'a pas autorisé ce compte. Contactez-le si vous pensez qu'il s'agit d'une erreur.",
    tone: "danger",
  },
  suspended: {
    icon: ShieldAlert,
    title: "Votre compte est suspendu",
    desc: "L'accès à ce compte a été temporairement suspendu par un administrateur. Contactez-le pour plus d'informations.",
    tone: "danger",
  },
  error: {
    icon: AlertTriangle,
    title: "Impossible de charger votre profil",
    desc: "La base de données a refusé la lecture — ce n'est pas un problème d'autorisation. Le cas le plus fréquent : les règles de sécurité Firestore (firestore.rules) n'ont pas encore été déployées sur le projet Firebase. Déployez-les puis réessayez.",
    tone: "danger",
  },
};

export default function PendingPage() {
  const { firebaseUser, profile, loading, profileLoading, profileError, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
    } else if (profile?.status === "approved") {
      router.replace("/dashboard");
    }
  }, [firebaseUser, profile, loading, profileLoading, router]);

  // Une erreur de lecture (le plus souvent : règles Firestore non
  // déployées) est distincte d'un vrai statut "pending" — jamais confondue
  // avec une attente d'autorisation légitime, même pour le Super Admin.
  const status = profileError ? "error" : profile?.status || "pending";
  const content = CONTENT[status] || CONTENT.pending;
  const Icon = content.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <Logo withText={false} size={40} />
        </div>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-7 shadow-sm">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              content.tone === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
            }`}
          >
            <Icon size={26} />
          </span>
          <h1 className="mt-4 text-base font-bold text-foreground">{content.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{content.desc}</p>

          {profile && (
            <div className="mt-5 rounded-xl bg-muted-soft p-3 text-left text-xs text-muted">
              <div className="font-medium text-foreground">{profile.displayName}</div>
              <div>{profile.email}</div>
            </div>
          )}

          {profileError && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              <RotateCw size={15} /> Réessayer
            </button>
          )}

          <button
            onClick={() => signOut().then(() => router.replace("/login"))}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted-soft"
          >
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
