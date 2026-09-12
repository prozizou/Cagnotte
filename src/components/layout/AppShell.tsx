"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, Plus, ShieldCheck, Receipt, Wallet, UserPlus } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingUsersCount } from "@/hooks/usePendingUsersCount";
import { useCagnottes } from "@/hooks/useCagnottes";
import { Logo } from "@/components/ui/Logo";
import { NAV_ITEMS } from "./nav";
import toast from "react-hot-toast";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isSuperAdmin, signOut } = useAuth();
  const pendingCount = usePendingUsersCount();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 4 entrées maximum (3 pour un utilisateur standard, sans "Utilisateurs") :
  // tiennent directement dans la barre basse mobile, aucune curation requise.
  const items = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  async function handleSignOut() {
    await signOut();
    toast.success("Déconnecté");
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — bureau */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const badge = item.href === "/utilisateurs" ? pendingCount : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-muted hover:bg-muted-soft hover:text-foreground"
                )}
              >
                <item.icon size={18} strokeWidth={2.1} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && <NavBadge count={badge} />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          <Link
            href="/cagnottes/new"
            className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Plus size={16} /> Nouvelle cagnotte
          </Link>
          <UserMenu onSignOut={handleSignOut} />
        </div>
      </aside>

      {/* Sidebar — mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-muted-soft"
                aria-label="Fermer le menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const badge = item.href === "/utilisateurs" ? pendingCount : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      active ? "bg-primary-soft text-primary" : "text-muted hover:bg-muted-soft hover:text-foreground"
                    )}
                  >
                    <item.icon size={18} strokeWidth={2.1} />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && <NavBadge count={badge} />}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-line p-3">
              <UserMenu onSignOut={handleSignOut} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Barre supérieure — mobile */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="relative rounded-lg p-2 text-foreground hover:bg-muted-soft"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
            {pendingCount > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
            )}
          </button>
          <Logo size={40} />
          <div className="flex items-center gap-2">
            <QuickAddButton />
            <Link
              href="/parametres"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary"
              aria-label="Mon compte"
            >
              {profile?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                profile?.displayName?.[0]?.toUpperCase() || "U"
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:pb-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Navigation basse — mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const badge = item.href === "/utilisateurs" ? pendingCount : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted"
                )}
              >
                <span
                  className={clsx(
                    "relative flex h-7 w-9 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary-soft"
                  )}
                >
                  <item.icon size={18} strokeWidth={active ? 2.4 : 2.1} />
                  {badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className="leading-none">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// Le bouton "+" de l'en-tête mobile est ambigu tant qu'il n'ouvre qu'une
// seule action : ce menu explicite ce qu'il ajoute (cotisation, cagnotte,
// utilisateur), pour éviter toute erreur de clic.
function QuickAddButton() {
  const router = useRouter();
  const { isSuperAdmin } = useAuth();
  const { cagnottes } = useCagnottes();
  const [open, setOpen] = useState(false);
  const [pickingCagnotte, setPickingCagnotte] = useState(false);

  function close() {
    setOpen(false);
    setPickingCagnotte(false);
  }

  function goTo(href: string) {
    close();
    router.push(href);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"
        aria-label="Ajouter"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={close} />
          <div className="absolute right-0 top-11 z-[95] w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
            {!pickingCagnotte ? (
              <>
                <QuickAddItem icon={Receipt} label="Nouvelle cotisation" onClick={() => setPickingCagnotte(true)} />
                <QuickAddItem icon={Wallet} label="Nouvelle cagnotte" onClick={() => goTo("/cagnottes/new")} />
                {isSuperAdmin && (
                  <QuickAddItem icon={UserPlus} label="Ajouter / inviter un utilisateur" onClick={() => goTo("/utilisateurs?preapprove=1")} />
                )}
              </>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Choisir une cagnotte</p>
                {cagnottes.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-muted">
                    Aucune cagnotte pour l&apos;instant.{" "}
                    <button onClick={() => goTo("/cagnottes/new")} className="font-medium text-primary hover:underline">
                      En créer une
                    </button>
                  </p>
                ) : (
                  cagnottes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => goTo(`/cagnottes/${c.id}?add=1`)}
                      className="block w-full truncate px-3 py-2 text-left text-sm text-foreground hover:bg-muted-soft"
                    >
                      {c.title}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function QuickAddItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Receipt;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted-soft">
      <Icon size={16} className="flex-shrink-0 text-muted" />
      {label}
    </button>
  );
}

function NavBadge({ count }: { count: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { profile, isSuperAdmin } = useAuth();
  if (!profile) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
      {profile.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.photoURL} alt="" className="h-9 w-9 flex-shrink-0 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {profile.displayName?.[0]?.toUpperCase() || "U"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
          {profile.displayName}
          {isSuperAdmin && <ShieldCheck size={13} className="flex-shrink-0 text-primary" />}
        </div>
        <div className="truncate text-xs text-muted">{profile.email}</div>
      </div>
      <button
        onClick={onSignOut}
        className="flex-shrink-0 rounded-lg p-2 text-muted hover:bg-muted-soft hover:text-danger"
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
