"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeUserCagnottes } from "@/lib/data/cagnottes";
import { Cagnotte } from "@/lib/types";

export function useCagnottes() {
  const { firebaseUser } = useAuth();
  const [cagnottes, setCagnottes] = useState<Cagnotte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    // Réinitialise l'état de chargement à chaque changement d'utilisateur,
    // pour ne jamais afficher brièvement les cagnottes d'un autre compte.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsub = subscribeUserCagnottes(
      firebaseUser.uid,
      (list) => {
        setCagnottes(list);
        setLoading(false);
      },
      (err) => {
        // Ne jamais laisser un chargement bloqué indéfiniment en silence :
        // on affiche l'erreur réelle (ex. permission Firestore refusée)
        // plutôt qu'un skeleton qui ne se résout jamais.
        setLoading(false);
        toast.error("Impossible de charger vos cagnottes : " + err.message);
      }
    );
    return unsub;
  }, [firebaseUser]);

  return { cagnottes, loading };
}
