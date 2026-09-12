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
- **Firebase** : Authentication (Email/Mot de passe, Google en secours), Realtime Database, Security Rules
- **Cloudinary** pour les images de couverture des cagnottes (envoi via une route serveur Next.js)
- **Recharts** pour les graphiques, **jsPDF** / **ExcelJS** pour les exports

## 1. Préparer le projet Firebase

L'application utilise **Realtime Database**. Si vous avez déjà un projet
Firebase (par exemple avec une RTDB existante, ce qui est le cas ici :
c'est la même base que l'ancienne page), réutilisez ce même projet.

1. Sur la [Console Firebase](https://console.firebase.google.com/), ouvrez
   votre projet existant (ou créez-en un si vous partez de zéro).
2. **Authentication** → Sign-in method → activez **Email/Mot de passe**
   (méthode principale : le Super Admin crée chaque compte avec un email et
   un mot de passe) **et Google** (conservé comme secours pour les comptes
   déjà liés, avant suppression définitive une fois la bascule confirmée).
3. **Realtime Database** → si elle n'existe pas déjà, **Créer une base de
   données** (mode verrouillé — les règles ci-dessous seront déployées
   ensuite). Notez son **URL** affichée en haut de la page (ex.
   `https://<projet>-default-rtdb.<région>.firebasedatabase.app`).
4. **Paramètres du projet** → Vos applications → si une application Web
   existe déjà (c'était le cas pour l'ancienne page), réutilisez sa
   configuration ; sinon ajoutez-en une et copiez la configuration.

Les images de couverture des cagnottes n'utilisent pas Firebase mais
**Cloudinary** (voir étape 2) — aucune étape Firebase supplémentaire n'est
nécessaire pour elles.

## 2. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Renseignez les valeurs issues de la configuration Firebase (`apiKey`,
`authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`)
**et** `databaseURL` (l'URL notée à l'étape précédente) dans
`NEXT_PUBLIC_FIREBASE_DATABASE_URL`. Sans cette dernière, le SDK ne peut
pas se connecter à la base.

Ajoutez aussi `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` et
`CLOUDINARY_API_SECRET` (Dashboard Cloudinary → Programmable Media → API
Keys) — **sans** le préfixe `NEXT_PUBLIC_` : ces variables ne sont utilisées
que côté serveur (route `/api/upload-image`), jamais envoyées au
navigateur. Sans elles, l'envoi d'une image de couverture échoue (le reste
de l'application continue de fonctionner normalement).

Pensez à renseigner les mêmes variables côté hébergeur (Vercel, etc.).

## 3. Super Administrateur

Le compte **prozizou298@gmail.com** est automatiquement reconnu comme
Super Administrateur (statut `approved`, rôle `superadmin`) dès sa première
connexion. Tout autre compte démarre au statut `pending` et doit être
autorisé depuis la page **Utilisateurs** par le Super Admin.

Pour changer ce compte, modifiez `SUPER_ADMIN_EMAIL` dans
`src/lib/constants.ts` **et** l'adresse codée en dur dans
`database.rules.json` — les deux doivent rester synchronisés, la véritable
barrière de sécurité étant celle des règles Realtime Database.

## 4. Déployer les règles de sécurité Realtime Database

```bash
npm install -g firebase-tools   # si nécessaire
firebase login
firebase use --add               # sélectionnez votre projet
firebase deploy --only database
```

Vous pouvez aussi coller le contenu de `database.rules.json` directement
dans Console Firebase → Realtime Database → onglet **Règles**.

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

## Migration depuis l'ancienne architecture Firestore

Cette application a d'abord été construite sur Firestore, puis basculée
vers Realtime Database. La page ponctuelle `/migration-rtdb` (Super Admin
uniquement, non liée dans le menu) recopie les données Firestore
existantes (`users`, `cagnottes`, `cotisations`, `history`) vers Realtime
Database, en conservant les identifiants de documents — sans risque à
relancer plusieurs fois. Prérequis : `database.rules.json` déjà déployé et
les anciennes règles Firestore encore actives (pour que la lecture
fonctionne le temps de la migration). Une fois la migration confirmée, ce
module (`src/lib/data/migrateFirestoreToRtdb.ts`, la page
`/migration-rtdb`, et l'export temporaire `firestoreDb` dans
`src/lib/firebase.ts`) peuvent être supprimés.

## Modèle de données (Realtime Database)

```
users/{uid}          — profil, statut d'accès (pending/approved/rejected/suspended), rôle (user/superadmin)
cagnottes/{id}        — une cagnotte, avec ownerId (isolation multi-utilisateur)
cotisations/{id}      — une cotisation, avec cagnotteId + ownerId dénormalisés
history/{id}          — journal d'audit en écriture seule (append-only)
```

`cotisations` est un nœud de premier niveau (et non imbriqué sous
`cagnottes`) : chaque cotisation porte ses propres `cagnotteId`/`ownerId`,
ce qui permet de l'interroger par cagnotte ou par propriétaire avec une
simple requête `orderByChild` + `equalTo` (indexée via `.indexOn` dans
`database.rules.json`), sans jamais combiner deux critères dans une même
requête (Realtime Database ne le permet pas) — le tri final se fait côté
client.

Tous les totaux et statistiques affichés (montant collecté, progression,
moyenne, etc.) sont **calculés en direct** à partir des cotisations
enregistrées — jamais stockés séparément — afin d'éviter toute divergence
entre l'affichage et les données réelles.

La sécurité repose sur les règles Realtime Database
(`database.rules.json`), pas uniquement sur les contrôles de l'interface :
un utilisateur non approuvé ou non propriétaire d'une cagnotte ne peut ni
la lire, ni la modifier, quel que soit ce que fait le frontend.
