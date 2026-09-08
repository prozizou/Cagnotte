import { addDoc, collection, getDocs, query, where, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logHistory } from "@/lib/data/history";
import { formatFCFA } from "@/lib/format";

/**
 * Import ponctuel des cotisations de l'ancienne page statique (Firebase
 * RTDB, nœud `cagnotte_db`) vers la nouvelle architecture multi-tenant.
 * L'ancienne cagnotte n'avait aucun propriétaire : ces données sont donc
 * rattachées manuellement à l'utilisateur désigné (LEGACY_OWNER_UID),
 * quel que soit le compte qui déclenche l'import (l'utilisateur lui-même
 * une fois connecté, ou le Super Admin sans attendre sa connexion). Ce
 * module n'est destiné qu'à un usage unique ; il peut être supprimé une
 * fois l'import effectué.
 */
export const LEGACY_OWNER_UID = "cWIRYeUbN7gxLXaBHeCTO17LLUw1";
const LEGACY_IMPORT_KEY = "hlm2-2026";
const LEGACY_TITLE = "Éclairage & Sécurité — Quartier HLM 2";

interface LegacyEntry {
  name: string;
  amount: number;
  date: string;
}

const LEGACY_COTISATIONS: LegacyEntry[] = [
  { name: "Demba Sall", amount: 2000, date: "2026-07-21" },
  { name: "Haly Bocar", amount: 1000, date: "2026-07-21" },
  { name: "Alpha Mbaye", amount: 10000, date: "2026-07-21" },
  { name: "Abdoul Diéwél", amount: 10000, date: "2026-07-21" },
  { name: "Hawa dieng", amount: 2000, date: "2026-07-23" },
  { name: "Tidiane Bocar Ndiaye", amount: 25000, date: "2026-08-01" },
  { name: "Amoy Sall", amount: 25000, date: "2026-08-02" },
  { name: "Diéwél Ba", amount: 2000, date: "2026-08-02" },
  { name: "Moussa Djina", amount: 2000, date: "2026-08-02" },
  { name: "Kadia Ablay", amount: 1000, date: "2026-08-02" },
  { name: "Coumba Ifra", amount: 1000, date: "2026-08-02" },
  { name: "Amadou Demba Hady", amount: 25000, date: "2026-08-04" },
  { name: "Gorel Mbaye", amount: 3000, date: "2026-08-04" },
  { name: "Thiana Ba", amount: 5000, date: "2026-08-05" },
  { name: "Idy Sall", amount: 2000, date: "2026-08-06" },
  { name: "Kaaw Demba", amount: 2000, date: "2026-08-06" },
  { name: "Abou Diattara", amount: 5000, date: "2026-08-06" },
  { name: "Moussa Amadou Diattara", amount: 10000, date: "2026-08-07" },
  { name: "Ibrahima Sy", amount: 2000, date: "2026-08-07" },
  { name: "Demba Ndiayel Sy", amount: 2000, date: "2026-08-07" },
  { name: "Dia Thiewngel", amount: 3000, date: "2026-08-07" },
  { name: "Abou Mody Niang", amount: 25000, date: "2026-08-08" },
  { name: "Mairam diobel Demba", amount: 2000, date: "2026-08-08" },
  { name: "Alassane Guina", amount: 1000, date: "2026-08-10" },
  { name: "Talla kaaly Diop", amount: 5000, date: "2026-08-13" },
  { name: "Hady Diattara", amount: 5000, date: "2026-08-18" },
  { name: "Ida sy", amount: 5000, date: "2026-08-19" },
  { name: "Gallé Diopbé ( Tidiane )", amount: 70000, date: "2026-08-22" },
  { name: "Iba kaaw", amount: 25000, date: "2026-08-29" },
  { name: "Mamoudou kaaw", amount: 25000, date: "2026-08-29" },
  { name: "Hamady guisse", amount: 5000, date: "2026-09-07" },
  { name: "Ibou Mbaye", amount: 2500, date: "2026-09-07" },
];

export async function isLegacyAlreadyImported(): Promise<boolean> {
  const q = query(
    collection(db, "cagnottes"),
    where("ownerId", "==", LEGACY_OWNER_UID),
    where("legacyImportKey", "==", LEGACY_IMPORT_KEY)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * @param actor Le compte qui déclenche réellement l'import (peut être
 * LEGACY_OWNER_UID lui-même, ou le Super Admin agissant en son nom). Les
 * données créées portent toujours ownerId = LEGACY_OWNER_UID, quel que
 * soit l'actor — c'est ce que les règles Firestore vérifient
 * indépendamment (propriétaire du compte OU Super Admin).
 */
export async function importLegacyCagnotte(actor: { uid: string; name: string }): Promise<void> {
  if (await isLegacyAlreadyImported()) {
    throw new Error("Cette cagnotte a déjà été importée.");
  }

  const cagnotteRef = await addDoc(collection(db, "cagnottes"), {
    ownerId: LEGACY_OWNER_UID,
    ownerName: "",
    title: LEGACY_TITLE,
    description: "Cagnotte solidaire du quartier HLM 2 pour l'éclairage et la sécurité (import de l'historique).",
    startDate: "2026-07-21",
    endDate: "",
    goalAmount: 0,
    status: "active",
    contacts: [
      { id: crypto.randomUUID(), name: "Demba Sall", phone: "77 566 63 89" },
      { id: crypto.randomUUID(), name: "Moussa Djina", phone: "77 438 75 43" },
      { id: crypto.randomUUID(), name: "Abdoul Diop", phone: "77 350 05 95" },
      { id: crypto.randomUUID(), name: "Alpha Mbaye", phone: "78 521 85 22" },
    ],
    legacyImportKey: LEGACY_IMPORT_KEY,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const cagnotteId = cagnotteRef.id;

  const batch = writeBatch(db);
  let total = 0;
  for (const entry of LEGACY_COTISATIONS) {
    total += entry.amount;
    const ref = doc(collection(db, "cotisations"));
    batch.set(ref, {
      cagnotteId,
      ownerId: LEGACY_OWNER_UID,
      name: entry.name,
      amount: entry.amount,
      date: entry.date,
      comment: "",
      createdBy: actor.uid,
      createdByName: actor.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();

  await logHistory({
    type: "cotisation_added",
    description: `Import historique : ${LEGACY_COTISATIONS.length} cotisations importées (${formatFCFA(total)})`,
    ownerId: LEGACY_OWNER_UID,
    cagnotteId,
    cagnotteTitle: LEGACY_TITLE,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { count: LEGACY_COTISATIONS.length, total },
  });
}
