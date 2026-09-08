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
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { SUPER_ADMIN_EMAIL } from "@/lib/constants";
import { UserProfile } from "@/lib/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean; // vrai tant que l'état d'authentification n'est pas connu
  profileLoading: boolean; // vrai tant que le profil Firestore n'est pas encore chargé
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
    const ref = doc(db, "users", firebaseUser.uid);

    // À la première connexion, on crée le profil Firestore de l'utilisateur.
    // Le compte du Super Administrateur est auto-approuvé ; tout autre
    // compte démarre en statut "pending" et attend une autorisation.
    // Les règles de sécurité Firestore vérifient indépendamment cette
    // logique (un utilisateur ne peut pas s'auto-approuver).
    async function bootstrapProfile() {
      const isSuperAdminEmail = firebaseUser!.email === SUPER_ADMIN_EMAIL;
      await setDoc(
        ref,
        {
          uid: firebaseUser!.uid,
          email: firebaseUser!.email || "",
          displayName: firebaseUser!.displayName || firebaseUser!.email || "Utilisateur",
          photoURL: firebaseUser!.photoURL || null,
          status: isSuperAdminEmail ? "approved" : "pending",
          role: isSuperAdminEmail ? "superadmin" : "user",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      ).catch(() => {
        // Le document existe probablement déjà (course entre onSnapshot et
        // bootstrap) : on ignore, le listener ci-dessous reflétera l'état réel.
      });
    }

    let bootstrapped = false;
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
          setProfileLoading(false);
        } else if (!bootstrapped) {
          bootstrapped = true;
          bootstrapProfile();
        } else {
          setProfileLoading(false);
        }
      },
      () => setProfileLoading(false)
    );
    return unsub;
  }, [firebaseUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      profileLoading,
      isSuperAdmin: profile?.role === "superadmin",
      isApproved: profile?.status === "approved",
      signInWithGoogle: async () => {
        await signInWithPopup(auth, googleProvider);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [firebaseUser, profile, loading, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
