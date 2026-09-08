"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CagnotteForm } from "@/components/cagnottes/CagnotteForm";
import { createCagnotte, CagnotteFormInput } from "@/lib/data/cagnottes";

export default function NewCagnottePage() {
  const { firebaseUser, profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(input: CagnotteFormInput) {
    if (!firebaseUser || !profile) return;
    setSubmitting(true);
    try {
      const id = await createCagnotte(input, { uid: firebaseUser.uid, name: profile.displayName });
      toast.success("Cagnotte créée ✔");
      router.push(`/cagnottes/${id}`);
    } catch {
      toast.error("Impossible de créer la cagnotte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/cagnottes" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={16} /> Mes cagnottes
      </Link>
      <div>
        <h1 className="text-xl font-bold text-foreground">Nouvelle cagnotte</h1>
        <p className="text-sm text-muted">Renseignez les informations de votre nouvelle collecte.</p>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <CagnotteForm onSubmit={handleSubmit} submitting={submitting} submitLabel="Créer la cagnotte" />
      </div>
    </div>
  );
}
