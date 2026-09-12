"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Le SDK Firebase (Auth notamment) valide immédiatement la configuration et
// lève une exception si elle est absente/invalide. Or Next.js pré-rend les
// pages côté Node pendant `next build`, avant que les variables
// d'environnement de production ne soient nécessairement disponibles et
// sans `window` : initialiser le SDK à ce moment-là ferait échouer le build
// (auth/invalid-api-key). Ce module n'est utilisé que depuis des
// gestionnaires d'événements et des useEffect — jamais pendant le rendu
// initial — donc reporter l'initialisation réelle au navigateur est sans
// risque : `auth`/`db` sont garantis initialisés avant leur premier usage.
let app = {} as FirebaseApp;
let auth = {} as Auth;
let db = {} as Database;
let storage = {} as FirebaseStorage;
// Conservé uniquement pour la page ponctuelle de migration des anciennes
// données Firestore vers Realtime Database (/migration-rtdb) — à retirer,
// avec cette page, une fois la migration effectuée.
let firestoreDb = {} as Firestore;

if (typeof window !== "undefined") {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  storage = getStorage(app);
  firestoreDb = getFirestore(app);

  // Persistance locale : un utilisateur déjà connecté reste connecté après
  // une actualisation de la page (comportement par défaut du SDK web, rendu
  // explicite ici).
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Ignoré : certains navigateurs (mode privé strict) refusent la
    // persistance locale ; l'auth retombe alors sur la persistance mémoire.
  });
}

export { app, auth, db, storage, firestoreDb };

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
