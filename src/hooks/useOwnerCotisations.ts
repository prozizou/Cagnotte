"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeAllCotisationsForOwner, subscribeAllCotisationsAdmin } from "@/lib/data/cotisations";
import { Cotisation } from "@/lib/types";

/**
 * Cotisations visibles pour l'utilisateur courant : celles de toutes ses
 * cagnottes, ou — pour le Super Admin — celles de toute la plateforme.
 */
export function useOwnerCotisations() {
  const { firebaseUser, isSuperAdmin } = useAuth();
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const onData = (list: Cotisation[]) => {
      setCotisations(list);
      setLoading(false);
    };
    const onError = (err: Error) => {
      setLoading(false);
      toast.error("Impossible de charger les cotisations : " + err.message);
    };
    const unsub = isSuperAdmin
      ? subscribeAllCotisationsAdmin(onData, onError)
      : subscribeAllCotisationsForOwner(firebaseUser.uid, onData, onError);
    return unsub;
  }, [firebaseUser, isSuperAdmin]);

  return { cotisations, loading };
}
