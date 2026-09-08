"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CagnotteForm } from "@/components/cagnottes/CagnotteForm";
import { subscribeCagnotte, updateCagnotte, CagnotteFormInput } from "@/lib/data/cagnottes";
import { Cagnotte } from "@/lib/types";

export default function EditCagnottePage() {
  const { id } = useParams<{ id: string }>();
  const { firebaseUser, profile } = useAuth();
  const router = useRouter();
  const [cagnotte, setCagnotte] = useState<Cagnotte | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => subscribeCagnotte(id, setCagnotte), [id]);

  async function handleSubmit(input: CagnotteFormInput) {
    if (!firebaseUser || !profile) return;
    setSubmitting(true);
    try {
      await updateCagnotte(id, input, { uid: firebaseUser.uid, name: profile.displayName });
      toast.success("Cagnotte mise à jour ✔");
      router.push(`/cagnottes/${id}`);
    } catch {
      toast.error("Impossible d'enregistrer les modifications.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cagnotte === undefined) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (cagnotte === null) {
    return <p className="text-sm text-muted">Cette cagnotte n&apos;existe pas ou n&apos;est plus accessible.</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href={`/cagnottes/${id}`} className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={16} /> {cagnotte.title}
      </Link>
      <div>
        <h1 className="text-xl font-bold text-foreground">Modifier la cagnotte</h1>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <CagnotteForm initial={cagnotte} onSubmit={handleSubmit} submitting={submitting} submitLabel="Enregistrer" />
      </div>
    </div>
  );
}
