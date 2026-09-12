import { Phone } from "lucide-react";
import { Contact } from "@/lib/types";
import { whatsAppContactUrl } from "@/lib/whatsapp";

export function ContactsList({ contacts }: { contacts: Contact[] | null | undefined }) {
  // Filet de sécurité : Realtime Database ne conserve jamais un tableau
  // vide (voir normalizeCagnotte dans lib/data/cagnottes.ts, qui corrige
  // déjà ça à la lecture) — ce composant reste néanmoins robuste par
  // lui-même si jamais il est appelé ailleurs avec une donnée brute.
  if (!contacts || contacts.length === 0) {
    return <p className="text-sm text-muted">Aucun contact administratif renseigné.</p>;
  }
  return (
    <div className="space-y-2">
      {contacts.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{c.name || "—"}</p>
            <p className="flex items-center gap-1 text-xs text-muted">
              <Phone size={11} /> {c.phone || "—"}
            </p>
          </div>
          {c.phone && (
            <a
              href={whatsAppContactUrl(c.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-whatsapp text-white transition hover:bg-whatsapp-dark"
              aria-label={`Contacter ${c.name} sur WhatsApp`}
              title="Contacter sur WhatsApp"
            >
              <WhatsAppIcon />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2.4a9.6 9.6 0 0 0-8.24 14.6L2.4 21.6l4.72-1.36a9.6 9.6 0 1 0 4.92-17.84Zm5.64 13.6c-.24.66-1.37 1.27-1.9 1.32-.5.07-1.14.1-1.83-.12-.42-.13-.96-.31-1.66-.6-2.92-1.26-4.83-4.2-4.98-4.4-.14-.19-1.19-1.58-1.19-3.02s.75-2.13 1.02-2.42c.26-.29.58-.36.77-.36l.55.01c.18 0 .42-.07.65.5.24.58.82 2.01.89 2.16.07.15.12.32.02.51-.47.95-.98.9-.72 1.36.96 1.65 1.92 2.22 3.38 2.95.25.13.4.1.55-.06.15-.17.63-.73.8-.98.16-.25.33-.2.55-.12.22.08 1.43.68 1.68.8.25.12.41.19.47.29.06.1.06.6-.16 1.28Z"
      />
    </svg>
  );
}
