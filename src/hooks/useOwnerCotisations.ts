"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeAllCotisationsForOwner } from "@/lib/data/cotisations";
import { Cotisation } from "@/lib/types";

/** Toutes les cotisations de toutes les cagnottes de l'utilisateur courant. */
export function useOwnerCotisations() {
  const { firebaseUser } = useAuth();
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsub = subscribeAllCotisationsForOwner(
      firebaseUser.uid,
      (list) => {
        setCotisations(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        toast.error("Impossible de charger les cotisations : " + err.message);
      }
    );
    return unsub;
  }, [firebaseUser]);

  return { cotisations, loading };
}
