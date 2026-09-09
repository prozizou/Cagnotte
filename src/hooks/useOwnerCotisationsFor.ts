"use client";

import { useEffect, useState } from "react";
import { subscribeAllCotisationsForOwner } from "@/lib/data/cotisations";
import { Cotisation } from "@/lib/types";

/**
 * Comme useOwnerCotisations, mais pour un uid explicite (pas forcément
 * l'utilisateur courant) — utilisé par la vue Super Admin d'un compte
 * tiers (/utilisateurs/[uid]).
 */
export function useOwnerCotisationsFor(uid: string) {
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsub = subscribeAllCotisationsForOwner(
      uid,
      (list) => {
        setCotisations(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [uid]);

  return { cotisations, loading };
}
