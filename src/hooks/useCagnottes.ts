"use client";

import { useEffect, useState } from "react";
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
    const unsub = subscribeUserCagnottes(firebaseUser.uid, (list) => {
      setCagnottes(list);
      setLoading(false);
    });
    return unsub;
  }, [firebaseUser]);

  return { cagnottes, loading };
}
