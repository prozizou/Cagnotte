"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeUserCagnottes, subscribeAllCagnottes } from "@/lib/data/cagnottes";
import { Cagnotte } from "@/lib/types";

/**
 * Cagnottes visibles pour l'utilisateur courant : les siennes, ou —
 * pour le Super Admin — celles de toute la plateforme (administration
 * globale), tous propriétaires confondus.
 */
export function useCagnottes() {
  const { firebaseUser, isSuperAdmin } = useAuth();
  const [cagnottes, setCagnottes] = useState<Cagnotte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    // Réinitialise l'état de chargement à chaque changement d'utilisateur,
    // pour ne jamais afficher brièvement les cagnottes d'un autre compte.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const onData = (list: Cagnotte[]) => {
      setCagnottes(list);
      setLoading(false);
    };
    const onError = (err: Error) => {
      // Ne jamais laisser un chargement bloqué indéfiniment en silence :
      // on affiche l'erreur réelle (ex. permission Realtime Database refusée)
      // plutôt qu'un skeleton qui ne se résout jamais.
      setLoading(false);
      toast.error("Impossible de charger les cagnottes : " + err.message);
    };
    const unsub = isSuperAdmin
      ? subscribeAllCagnottes(onData, onError)
      : subscribeUserCagnottes(firebaseUser.uid, onData, onError);
    return unsub;
  }, [firebaseUser, isSuperAdmin]);

  return { cagnottes, loading };
}
