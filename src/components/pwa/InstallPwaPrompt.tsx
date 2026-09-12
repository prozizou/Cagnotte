"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, X, Download } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

// Événement non standardisé (absent des types DOM par défaut) déclenché par
// Chrome/Edge/Android quand le site remplit les critères d'installabilité
// (manifest valide + service worker + HTTPS). preventDefault() empêche la
// mini-infobar native pour afficher, à la place, notre propre invite —
// cohérente avec le reste de l'interface plutôt que le bandeau générique du
// navigateur.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SNOOZE_KEY = "pwa-install-snoozed-until";
const SNOOZE_DAYS = 7;
const SHOW_DELAY_MS = 2500; // laisse le temps à la page de se charger avant de proposer l'installation

function isSnoozed(): boolean {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false; // stockage indisponible (navigation privée…) : on retente à chaque visite
  }
}

function snooze(days: number) {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86400000));
  } catch {
    // Ignoré : pas bloquant si le stockage est indisponible.
  }
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    }

    function handleAppInstalled() {
      snooze(365); // installée : plus jamais proposée (sauf désinstallation + vidage du stockage)
      setVisible(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // iOS Safari ne déclenche jamais beforeinstallprompt : on propose alors
    // nos propres instructions (Partager → Sur l'écran d'accueil), le seul
    // chemin d'installation possible sur cette plateforme.
    if (isIos()) {
      timer = setTimeout(() => {
        setShowIosInstructions(true);
        setVisible(true);
      }, SHOW_DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function handleDismiss() {
    snooze(SNOOZE_DAYS);
    setVisible(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      snooze(outcome === "accepted" ? 365 : SNOOZE_DAYS);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={48} height={48} className="flex-shrink-0 rounded-full" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Installer {APP_NAME}</h3>
              <p className="text-xs text-muted">Accès rapide, plein écran, sans le navigateur</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="rounded-lg p-1 text-muted hover:bg-muted-soft" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {showIosInstructions ? (
          <>
            <p className="mt-4 text-sm text-muted">
              Ajoutez {APP_NAME} à votre écran d&apos;accueil pour l&apos;ouvrir comme une application, en un tap :
            </p>
            <ol className="mt-3 space-y-2.5 text-sm text-foreground">
              <li className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Share size={14} />
                </span>
                Appuyez sur <span className="font-medium">Partager</span> dans la barre Safari
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <SquarePlus size={14} />
                </span>
                Choisissez <span className="font-medium">Sur l&apos;écran d&apos;accueil</span>
              </li>
            </ol>
            <button
              onClick={handleDismiss}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              J&apos;ai compris
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted">
              Ajoutez {APP_NAME} à votre écran d&apos;accueil : ouverture instantanée, plein écran, sans barre
              d&apos;adresse — comme une vraie application.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted-soft"
              >
                Plus tard
              </button>
              <button
                disabled={installing}
                onClick={handleInstall}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                <Download size={15} /> {installing ? "…" : "Installer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
