"use client";

import { useEffect } from "react";

// Enregistre le service worker minimal (public/sw.js) — condition technique
// pour que l'app soit reconnue "installable" par les navigateurs (et
// déclenche beforeinstallprompt, voir InstallPwaPrompt). N'importe rien côté
// serveur ni pendant next build : ce composant ne fait qu'un effet de bord
// une fois monté dans le navigateur.
export function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignoré : l'app reste fonctionnelle sans service worker, seule
      // l'installation PWA et le cache hors-ligne des icônes en pâtissent.
    });
  }, []);

  return null;
}
