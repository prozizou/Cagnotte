"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { onValue, ref, serverTimestamp, set } from "firebase/database";
import { auth, db, googleProvider } from "@/lib/firebase";
import { SUPER_ADMIN_EMAIL } from "@/lib/constants";
import { UserProfile } from "@/lib/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean; // vrai tant que l'état d'authentification n'est pas connu
  profileLoading: boolean; // vrai tant que le profil Realtime Database n'est pas encore chargé
  // Vrai quand la lecture/écriture du profil a été rejetée par Realtime
  // Database (le plus souvent : les règles de sécurité
  // `database.rules.json` n'ont pas encore été déployées sur le projet).
  // Distingué d'un statut "pending" légitime pour ne jamais afficher "en
  // attente d'autorisation" à un utilisateur (y compris le Super Admin)
  // alors que le vrai problème est une erreur de configuration.
  profileError: boolean;
  isSuperAdmin: boolean;
  isApproved: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileLoading(true);
    setProfileError(false);
    const profileRef = ref(db, `users/${firebaseUser.uid}`);

    // À la première connexion, on crée le profil Realtime Database de
    // l'utilisateur. Le compte du Super Administrateur est auto-approuvé ;
    // tout autre compte démarre en statut "pending" et attend une
    // autorisation. Les règles de sécurité vérifient indépendamment cette
    // logique (un utilisateur ne peut pas s'auto-approuver).
    async function bootstrapProfile() {
      const isSuperAdminEmail = firebaseUser!.email === SUPER_ADMIN_EMAIL;
      await set(profileRef, {
        uid: firebaseUser!.uid,
        email: firebaseUser!.email || "",
        displayName: firebaseUser!.displayName || firebaseUser!.email || "Utilisateur",
        photoURL: firebaseUser!.photoURL || null,
        status: isSuperAdminEmail ? "approved" : "pending",
        role: isSuperAdminEmail ? "superadmin" : "user",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        // Une erreur de permission ici signifie presque toujours que les
        // règles de sécurité (database.rules.json) n'ont pas été déployées
        // sur le projet (base encore aux règles par défaut, tout refusé) —
        // ce n'est pas une course avec onValue, qui échouera alors aussi.
        if (err?.code?.toLowerCase?.().includes("permission")) setProfileError(true);
      });
    }

    let bootstrapped = false;
    const unsub = onValue(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.val() as UserProfile);
          setProfileLoading(false);
          setProfileError(false);
        } else if (!bootstrapped) {
          bootstrapped = true;
          bootstrapProfile();
        } else {
          setProfileLoading(false);
        }
      },
      () => {
        // Lecture refusée par les règles de sécurité (le plus souvent :
        // règles non déployées). On distingue explicitement ce cas d'un
        // vrai statut "pending" pour ne jamais afficher un message
        // trompeur à l'utilisateur.
        setProfileLoading(false);
        setProfileError(true);
      }
    );
    return unsub;
  }, [firebaseUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      profileLoading,
      profileError,
      isSuperAdmin: profile?.role === "superadmin",
      isApproved: profile?.status === "approved",
      signInWithGoogle: async () => {
        await signInWithPopup(auth, googleProvider);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [firebaseUser, profile, loading, profileLoading, profileError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
