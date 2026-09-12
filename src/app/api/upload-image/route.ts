import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { verifyFirebaseIdToken } from "@/lib/server/verifyFirebaseToken";

// Exécuté côté serveur (jamais dans le bundle envoyé au navigateur) :
// c'est le seul endroit où les identifiants Cloudinary (dont la clé API
// secrète) sont utilisés, via des variables d'environnement SANS le
// préfixe NEXT_PUBLIC_.
export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Authentification : seul un utilisateur Firebase valide (token non
  // expiré, émis pour ce projet) peut déclencher un envoi — évite qu'un
  // tiers non authentifié n'utilise ce compte Cloudinary. L'autorisation
  // fine (qui peut modifier quelle cagnotte) reste appliquée par les
  // règles Realtime Database au moment d'enregistrer l'URL obtenue.
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!token) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!projectId) return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });

  try {
    await verifyFirebaseIdToken(token, projectId);
  } catch {
    return NextResponse.json({ error: "Session expirée, reconnectez-vous et réessayez." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const file = formData.get("file");
  const folderInput = String(formData.get("folder") || "misc");
  const folder = folderInput.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Le fichier doit être une image." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image trop lourde (5 Mo maximum)." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: `cotiz/${folder}`, resource_type: "image" }, (err, res) => {
        if (err || !res) reject(err || new Error("Échec de l'envoi vers Cloudinary."));
        else resolve(res);
      });
      stream.end(buffer);
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Échec de l'envoi de l'image." }, { status: 502 });
  }
}
