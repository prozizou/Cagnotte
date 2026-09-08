# Cotiz — Gestion des cotisations et cagnottes

Plateforme privée et professionnelle de gestion administrative des cagnottes
et cotisations : plusieurs utilisateurs peuvent se connecter avec Google
(après autorisation du Super Administrateur), gérer indépendamment leurs
propres cagnottes, suivre leurs objectifs financiers, enregistrer les
cotisations, analyser la progression et produire des bilans partageables.

Les cotisations sont **enregistrées manuellement** par les responsables —
l'application ne traite aucun paiement en ligne.

## Stack technique

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **Firebase** : Authentication (Google), Firestore, Security Rules
- **Recharts** pour les graphiques, **jsPDF** / **ExcelJS** pour les exports

## 1. Créer le projet Firebase

1. Sur la [Console Firebase](https://console.firebase.google.com/), créez un projet.
2. **Authentication** → Sign-in method → activez **Google**.
3. **Firestore Database** → créez une base (mode production).
4. **Paramètres du projet** → Vos applications → ajoutez une application Web
   et copiez la configuration.

## 2. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Renseignez les valeurs issues de la configuration Firebase (`apiKey`,
`authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

## 3. Super Administrateur

Le compte **prozizou298@gmail.com** est automatiquement reconnu comme
Super Administrateur (statut `approved`, rôle `superadmin`) dès sa première
connexion. Tout autre compte démarre au statut `pending` et doit être
autorisé depuis la page **Utilisateurs** par le Super Admin.

Pour changer ce compte, modifiez `SUPER_ADMIN_EMAIL` dans
`src/lib/constants.ts` **et** l'adresse codée en dur dans `firestore.rules`
(fonction `isSuperAdminEmail`) — les deux doivent rester synchronisés, la
véritable barrière de sécurité étant celle des règles Firestore.

## 4. Déployer les règles de sécurité Firestore

```bash
npm install -g firebase-tools   # si nécessaire
firebase login
firebase use --add               # sélectionnez votre projet
firebase deploy --only firestore:rules,firestore:indexes
```

⚠️ Sans ces règles, la base de données reste protégée par les règles par
défaut de votre projet (généralement tout refusé) — l'application ne
fonctionnera pas tant qu'elles ne sont pas déployées.

## 5. Lancer en développement

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## 6. Build de production

```bash
npm run build
npm run start
```

Déployable sur Vercel, Firebase App Hosting, ou tout hébergeur compatible
Next.js (Node.js).

## Modèle de données (Firestore)

- `users/{uid}` — profil, statut d'accès (`pending`/`approved`/`rejected`/`suspended`), rôle (`user`/`superadmin`)
- `cagnottes/{id}` — une cagnotte, avec `ownerId` (isolation multi-utilisateur)
  - `cagnottes/{id}/cotisations/{id}` — les cotisations de la cagnotte
- `history/{id}` — journal d'audit en écriture seule (append-only)

Tous les totaux et statistiques affichés (montant collecté, progression,
moyenne, etc.) sont **calculés en direct** à partir des cotisations
enregistrées — jamais stockés séparément — afin d'éviter toute divergence
entre l'affichage et les données réelles.

La sécurité repose sur les règles Firestore (`firestore.rules`), pas
uniquement sur les contrôles de l'interface : un utilisateur non approuvé
ou non propriétaire d'une cagnotte ne peut ni la lire, ni la modifier, quel
que soit ce que fait le frontend.
