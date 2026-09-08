"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeAllUsers } from "@/lib/data/users";

/** Nombre de demandes d'accès en attente — uniquement interrogé pour le Super Admin. */
export function usePendingUsersCount(): number {
  const { isSuperAdmin } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) return;
    return subscribeAllUsers((users) => {
      setCount(users.filter((u) => u.status === "pending").length);
    });
  }, [isSuperAdmin]);

  return count;
}
