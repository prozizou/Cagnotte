"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, Plus, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { NAV_ITEMS } from "./nav";
import toast from "react-hot-toast";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSuperAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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
                {item.label}
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
                    {item.label}
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
            className="rounded-lg p-2 text-foreground hover:bg-muted-soft"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>
          <Logo size={28} />
          <Link
            href="/cagnottes/new"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"
            aria-label="Nouvelle cagnotte"
          >
            <Plus size={18} />
          </Link>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:pb-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Navigation basse — mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden">
          {items.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted"
                )}
              >
                <item.icon size={19} strokeWidth={2.1} />
                <span className="leading-none">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
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
