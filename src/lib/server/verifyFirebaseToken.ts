import { createRemoteJWKSet, jwtVerify } from "jose";

// Vérifie un ID token Firebase Authentication côté serveur, sans Firebase
// Admin SDK (donc sans compte de service à provisionner) : un ID token est
// un JWT standard signé par Google, vérifiable avec les clés publiques de
// Google (JWKS), au même titre que n'importe quel JWT tiers. On ne vérifie
// ici que l'authenticité et la fraîcheur du token — l'autorisation réelle
// (qui peut écrire quoi) reste appliquée par les règles Realtime Database
// lors de l'écriture effective des données.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export async function verifyFirebaseIdToken(idToken: string, projectId: string): Promise<{ uid: string }> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  if (!payload.sub) throw new Error("Token invalide.");
  return { uid: payload.sub };
}
