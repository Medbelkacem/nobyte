# NOBTY — نُبتي

> رقمك في راحتك · **Votre tour, dans votre paume** · *Your turn, in your palm*

PWA citoyenne algérienne qui digitalise la file d'attente dans **18 institutions publiques** réparties sur les **69 wilayas**. L'utilisateur prend un ticket virtuel depuis son téléphone, suit sa position dans la file en temps réel via Realtime SSE, et arrive au guichet au bon moment.

---

## Stack technique

| Couche | Choix |
|---|---|
| Frontend | **React 18 + TypeScript + Vite**, **vite-plugin-pwa** (manifest + Service Worker + offline) |
| Style | **Tailwind CSS** + variables CSS (palette zellij) + Google Fonts (Amiri, Playfair Display, Cairo, Bebas Neue) |
| Routage | `react-router-dom` |
| Backend | **PocketBase** (single binary Go, SQLite embarqué, Auth, Realtime SSE, JS hooks) |
| Client BDD | `pocketbase` SDK |
| i18n | 3 langues : **FR / AR / EN** avec bascule **RTL** complète |
| Thèmes | Clair / Sombre / Auto (suit `prefers-color-scheme`) |
| Déploiement visé | Vercel/Netlify (front) + PocketBase sur Fly.io / Railway / VPS |

---

## Identité visuelle

- Palette : émeraude `#2D6A4F`, or `#C9A84C`, bleu Tlemcen `#1B4F8A`, ivoire `#FAF7F0`, cuir `#2C1810`, nuit `#0D1B2A`.
- Motif **zellij à 8 branches** en filigrane (`public/patterns/zellij-*.svg`), opacité 6–8 %.
- Arches mauresques sur le sommet des cartes (`MoorishArch`).
- Numéros de ticket en **Bebas Neue** géant sur fond or pailleté.

Composants vectoriels réutilisables :
- `<ZellijStar />` — étoile à 8 branches paramétrable (taille, variantes, animation).
- `<MoorishArch />` — arche en tête de carte.
- `<CountdownRing />` — anneau doré gradué.

---

## Couverture territoriale

Les **69 wilayas** d'Algérie (découpage loi n°26-06 du 4 avril 2026) :

- 01 à 58 : wilayas historiques
- 59 à 69 : 11 nouvelles wilayas (Aflou, Barika, Ksar Chellala, Messaad, Aïn Oussara, Bou Saâda, El Abiodh Sidi Cheikh, El Kantara, Bir El Ater, Ksar El Boukhari, El Aricha)

Coordonnées GPS du chef-lieu pour chaque wilaya (cf. `pocketbase/pb_migrations/1700000002_seed_wilayas.js`).

---

## 18 institutions, 7 familles

| Famille | Institutions |
|---|---|
| **Finance & Poste** | La Poste, BNA, BEA, CPA, BADR, CNEP-Banque |
| **Santé** | Hôpital/CHU, Polyclinique/EPSP |
| **Justice** | Tribunal/Cour |
| **Administration & État civil** | Mairie (APC), Daïra, Conservation foncière, Sûreté de Wilaya |
| **Protection sociale & Emploi** | CNAS, CASNOS, CNR, ANEM |
| **Réseaux & Services publics** | Sonelgaz, ADE/SEAAL, Algérie Télécom |
| **Fiscalité & Commerce** | Impôts, CNRC |

Chaque service possède un nom FR/AR/EN et une durée moyenne (`avg_duration_min`).

> ⚠️ Les guichets « réels » et leurs coordonnées GPS exactes ne sont pas générables par une IA. Le seed `1700000004_seed_demo_establishments.js` crée **1 établissement de démonstration par couple (wilaya × institution)** centré sur le chef-lieu. En production, importez les vraies données via :
>
> - **Google Places API** (payant)
> - **OpenStreetMap / Overpass API** (gratuit) — `amenity=post_office`, `=hospital`, `=townhall`, etc.
> - **Listes officielles** publiées par chaque institution (Algérie Poste, ministère de la Santé, CNAS, etc.)

---

## Démarrage local

### 1) PocketBase

Téléchargez le binaire **PocketBase ≥ v0.23** (les migrations utilisent la nouvelle API `Field` / `collection.fields`) puis placez-le à la racine du projet :

```bash
# macOS / Linux — adapter le numéro de version et l'arch (amd64/arm64) selon votre cible
PB_VERSION=0.23.0
curl -L "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -o pb.zip
unzip pb.zip pocketbase && rm pb.zip
chmod +x pocketbase

# Lancement (sert l'API sur http://127.0.0.1:8090, applique les migrations,
# charge les hooks et expose pb_public/)
./pocketbase serve \
  --dir=./pocketbase/pb_data \
  --hooksDir=./pocketbase/pb_hooks \
  --migrationsDir=./pocketbase/pb_migrations \
  --publicDir=./pocketbase/pb_public \
  --http=0.0.0.0:8090
```

Au premier lancement, PocketBase ouvre l'Admin UI sur http://127.0.0.1:8090/_/ pour créer le compte admin.

Les **8 migrations JS** sont jouées automatiquement :

| Fichier | Effet |
|---|---|
| `1700000001_init_schema.js` | Crée toutes les collections + API rules (RLS) |
| `1700000002_seed_wilayas.js` | Insère les 69 wilayas avec GPS |
| `1700000003_seed_institutions.js` | Insère les 18 types d'institutions |
| `1700000004_seed_demo_establishments.js` | Génère ~1 449 établissements + ~5 000 services + counters |
| `1700000005_add_osm_fields.js` | Ajoute `osm_id` / `osm_type` / `phone` / `website` pour l'import OSM |
| `1700000006_init_otp.js` | Crée la collection `otp_codes` (OTP 6 chiffres custom) |
| `1700000007_init_webauthn.js` | Crée `passkeys` + `webauthn_challenges` (vérification serveur réelle) |
| `1700000008_init_push.js` | Crée `push_subscriptions` (Web Push VAPID) |

Les **hooks JS** (`pocketbase/pb_hooks/main.pb.js`) exposent les endpoints custom :

- `POST /api/nobty/issue-ticket` — émission atomique d'un ticket
- `POST /api/nobty/advance-queue` — avancée du compteur par l'agent
- `POST /api/nobty/cancel-ticket` — annulation
- `POST /api/nobty/otp-request` — envoi d'un code 6 chiffres (SMS ou email)
- `POST /api/nobty/otp-verify`  — vérification du code + `verified=true`
- `POST /api/nobty/webauthn/register-begin`  — options d'enrôlement passkey
- `POST /api/nobty/webauthn/register-finish` — vérifie l'attestation + persiste
- `POST /api/nobty/webauthn/auth-begin`      — options d'authentification
- `POST /api/nobty/webauthn/auth-finish`     — vérifie l'assertion + renvoie un token PB
- `GET  /api/nobty/admin/stats?from=&to=&top=` — agrégats tickets (admin only)
- `GET  /api/nobty/push/vapid-public-key` — clé publique VAPID (proxy sidecar)
- `POST /api/nobty/push/subscribe`        — enregistre la PushSubscription
- `POST /api/nobty/push/unsubscribe`      — supprime un endpoint
- `POST /api/nobty/nour-chat` — proxy vers Anthropic / OpenAI
- `GET  /api/nobty/health`

Pour activer Nour, ajoutez dans **Admin UI → Settings → Hooks env** :

```
ANTHROPIC_API_KEY=sk-ant-...
# ou
OPENAI_API_KEY=sk-...
```

Pour activer l'**OTP 6 chiffres par SMS**, ajoutez l'un des deux jeux :

```
# Twilio (prioritaire si défini)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+1XXXXXXXXXX        # ou un alphanumeric sender id

# OU Vonage / Nexmo
VONAGE_API_KEY=...
VONAGE_API_SECRET=...
VONAGE_FROM=NOBTY               # alphanumeric sender id (défaut "NOBTY")
```

Sans aucun provider SMS configuré, le code part par **email** (mailer
PocketBase défini dans Admin UI → Settings → Mail). Endpoints :

- `POST /api/nobty/otp-request` `{ email?, phone? }` → envoie un code (rate-limit 60s, validité 10 min, max 5 tentatives).
- `POST /api/nobty/otp-verify`  `{ email?, phone?, code }` → marque `users.verified = true`.

### WebAuthn / passkeys (vérification serveur réelle)

La cryptographie WebAuthn (COSE, ECDSA P-256/RS256) n'est pas accessible
depuis goja, donc PocketBase délègue à un **sidecar Node** qui utilise
`@simplewebauthn/server`. Architecture :

```
Navigateur ──navigator.credentials──▶ ┐
                                       │  @simplewebauthn/browser
Navigateur ──/api/nobty/webauthn/*──▶ PocketBase hooks
                                       │  $http.send → 127.0.0.1:4567
                                       ▼
                          scripts/webauthn-verifier.mjs
                          (@simplewebauthn/server)
```

Lancement (déjà inclus dans `pnpm dev:all`) :

```bash
pnpm webauthn:serve
# ✓ NOBTY WebAuthn verifier listening on http://127.0.0.1:4567
```

Variables d'env du sidecar :

```
WEBAUTHN_PORT=4567
WEBAUTHN_RP_ID=nobty.app           # défaut "localhost"
WEBAUTHN_ORIGIN=https://nobty.app  # défaut "http://localhost:5173"
WEBAUTHN_RP_NAME=NOBTY
```

Variables d'env côté PocketBase :

```
WEBAUTHN_VERIFIER_URL=http://127.0.0.1:4567
WEBAUTHN_RP_ID=nobty.app
WEBAUTHN_RP_NAME=NOBTY
```

Le compteur anti-replay (`passkeys.counter`) est mis à jour à chaque
authentification ; un compteur qui régresse est rejeté (credential
potentiellement cloné).

### Mode offline — outbox IndexedDB

Quand le réseau est coupé, taper « Prendre mon ticket » dépose une entrée
dans la store IndexedDB `nobty.outbox` (cf. `src/lib/outbox.ts`). Le
provider `OutboxProvider` la rejoue :

- au montage de l'app,
- sur l'événement `window.online`,
- toutes les 30 s si `navigator.onLine === true` et qu'il reste du `pending`.

Pendant l'envoi, l'entrée passe en `syncing` ; si l'API renvoie 409
(ticket actif déjà existant), l'entrée est purgée comme un succès. Une
erreur HTTP "vraie" passe l'entrée en `error` avec un compteur de
tentatives — l'utilisateur peut alors « Synchroniser » ou retirer
l'entrée depuis `Mes tickets`.

Un bandeau persistant dans `AppShell` annonce l'état (`Hors-ligne — N
ticket(s) en attente` / `Synchronisation…`).

### Notifications Web Push (VAPID)

Identique au pattern WebAuthn : un sidecar Node fait le travail
cryptographique (chiffrement payload + signature VAPID), PocketBase
orchestre. Architecture :

```
notifications.onCreate (PB)  ──▶ PB hook
                                   │  $http.send /send
                                   ▼
                       scripts/push-sender.mjs (web-push)
                                   │  HTTPS POST
                                   ▼
                       FCM / APNS / Mozilla Push
                                   ▼
                       navigator → src/sw.ts (event 'push')
                                   ▼
                       showNotification + click → /ticket/:id
```

**1. Générer les clés VAPID** (une fois) :

```bash
pnpm push:vapid
# Public Key:  BL...
# Private Key: 9...
```

**2. Exporter les env vars** (sidecar + PocketBase) :

```
VAPID_PUBLIC_KEY=BL...
VAPID_PRIVATE_KEY=9...
VAPID_SUBJECT=mailto:contact@nobty.app
PUSH_SENDER_URL=http://127.0.0.1:4568   # côté PB
```

**3. Lancer le sidecar** (déjà inclus dans `pnpm dev:all`) :

```bash
pnpm push:serve
# ✓ NOBTY Web Push sender listening on http://127.0.0.1:4568
```

**4. Côté utilisateur** : `Profil → Notifications push → Activer`.
Le SW (`src/sw.ts`) reçoit l'événement `push`, affiche
`showNotification` et route le clic vers `/ticket/:id`.

Les endpoints qui répondent **404/410** (token expiré, désinstallation)
sont automatiquement supprimés de `push_subscriptions` pour éviter
d'envoyer dans le vide.

### 2) Frontend

```bash
pnpm install         # ou npm install / yarn install
cp .env.example .env # ajustez VITE_PB_URL si nécessaire
pnpm dev             # http://localhost:5173
```

Pour lancer PocketBase **et** le front en une seule commande :

```bash
pnpm dev:all
```

### 3) Créer un compte agent

Par défaut, tout nouvel utilisateur a `role = 'citizen'`. Pour promouvoir un agent :

1. Connectez-vous à l'Admin UI PocketBase (http://127.0.0.1:8090/_/).
2. Collection `users` → éditez l'utilisateur → `role = agent`, `agent_establishment = <id_d_un_etablissement>`.
3. Reconnectez-vous : la tab "Agent" apparaît dans la nav et `/agent` devient accessible.

---

## Architecture

```
nour/
├── src/
│   ├── components/
│   │   ├── ui/            Boutons, Input, Card, Icon, Spinner, Toast
│   │   ├── layout/        AppShell (header + bottom nav), AuthLayout
│   │   ├── zellij/        ZellijStar, MoorishArch
│   │   ├── queue/         CountdownRing
│   │   └── nour/          NourPanel (chat flottant trilingue)
│   ├── pages/             Splash, Login, Signup, OTP, Reset, Home,
│   │                     WilayaPicker, InstitutionPicker, EstablishmentPicker,
│   │                     ServicePicker, Ticket, MyTickets, Profile
│   │   └── agent/         AgentDashboard
│   ├── providers/         ThemeProvider, AuthProvider
│   ├── hooks/             useCollection, useRecord, useQueueCounter
│   ├── i18n/              fr / ar / en + I18nProvider (auto RTL)
│   ├── lib/               pb (client), auth-helpers, geo, hours, cn
│   ├── types/             db.ts (types miroirs PocketBase)
│   ├── styles/            global.css (Tailwind + tokens NOBTY)
│   └── data/              (réservé pour caches futurs)
├── pocketbase/
│   ├── pb_migrations/     4 fichiers JS (schema + seeds)
│   ├── pb_hooks/          main.pb.js (RPC + chat Nour)
│   └── pb_public/         (fichiers statiques servis par PocketBase)
├── public/
│   ├── icons/             icon.svg + maskable + README pour générer PNG
│   └── patterns/          zellij-light.svg, zellij-dark.svg
├── vite.config.ts         Vite + PWA (manifest, SW, runtime cache)
├── tailwind.config.ts     Palette + fonts + animations zellij
├── index.html             Theme color light/dark, fonts preload
└── README.md
```

### Atomicité des tickets

Le hook `POST /api/nobty/issue-ticket` ouvre une transaction PocketBase :

1. Refuse si l'utilisateur a déjà un ticket actif sur ce service (`waiting` ou `called`).
2. Verrouille / crée le `queue_counter`.
3. Incrémente `last_number`.
4. Crée la ligne `tickets` avec `est_wait_min = (last_number − now_serving) × avg_duration_min`.

L'index unique `(service, number)` garantit qu'aucun doublon de numéro ne peut être créé même en cas de race.

### Realtime

- Le ticket utilisateur s'abonne à `queue_counters` via `pb.collection('queue_counters').subscribe('*', cb)`.
- Le tracker recalcule `position = number − now_serving` et `eta = position × avg_duration_min`.
- Notifications push (API navigateur) à `position == 3`, `1`, `0` + vibration.
- Le hook `onRecordAfterUpdateSuccess` côté PocketBase persiste également la notification en base.

### Sécurité

- **API rules** sur toutes les collections : l'utilisateur ne lit/modifie que ses propres tickets, profils et notifications.
- Référentiels (`wilayas`, `institution_types`, `establishments`, `services`) en lecture publique.
- Les opérations sensibles (créer/avancer/annuler) passent **uniquement** par les hooks (`createRule: null`) — pas d'écriture directe possible depuis le SDK.
- WebAuthn pour la connexion biométrique (Touch ID / Face ID / Windows Hello) une fois l'utilisateur connecté la première fois.

---

## Déploiement production

Architecture cible :

```
Vercel (frontend statique, PWA)              Fly.io (image Docker, 1 VM)
┌─────────────────────────────┐               ┌────────────────────────────┐
│ Vite build → dist/          │               │ tini → start-prod.sh       │
│ Service Worker (push)       │  ───HTTPS──▶ │  ├── pocketbase  :8090     │
│ VITE_PB_URL=…fly.dev        │               │  ├── webauthn    :4567    │
└─────────────────────────────┘               │  └── push-sender :4568    │
                                              │      ↳ FCM / APNS         │
                                              │  /pb_data (Fly volume)    │
                                              └────────────────────────────┘
```

### 1) Générer les clés VAPID (une fois)

```bash
pnpm install
pnpm push:vapid
# Public Key:  BL...
# Private Key: 9...
# → Garder dans un coffre, à passer en secrets Fly.
```

### 2) Déployer le backend (Fly.io)

```bash
fly auth login

# Personnalisez le `app = "..."` dans fly.toml, puis :
fly volumes create pb_data --region cdg --size 1

fly secrets set \
  VAPID_PUBLIC_KEY="BL..." \
  VAPID_PRIVATE_KEY="9..." \
  VAPID_SUBJECT="mailto:contact@REPLACE_ME" \
  WEBAUTHN_RP_ID="REPLACE_ME.fly.dev" \
  WEBAUTHN_ORIGIN="https://REPLACE_ME.vercel.app" \
  WEBAUTHN_RP_NAME="NOBTY" \
  ANTHROPIC_API_KEY="sk-ant-…"          # optionnel (Nour)
  # TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… TWILIO_FROM=…   # optionnel (OTP SMS)

fly deploy
```

Le `Dockerfile` télécharge PocketBase v0.38.2, installe uniquement les
deux deps Node nécessaires aux sidecars (`@simplewebauthn/server`,
`web-push`), copie `pb_hooks/`, `pb_migrations/`, `scripts/`, et expose
`:8090`. Le superviseur `scripts/start-prod.sh` lance les trois
process ; si l'un meurt, il tue le PID 1 pour que Fly redémarre la VM.

Première visite : `https://REPLACE_ME.fly.dev/_/` pour créer le compte
super-admin PocketBase. Les 8 migrations sont jouées automatiquement.

### 3) Déployer le frontend (Vercel)

```bash
vercel link
vercel env add VITE_PB_URL production
# → coller : https://REPLACE_ME.fly.dev
vercel deploy --prod
```

`vercel.json` contient déjà :
- `framework: vite`, `outputDirectory: dist`, `buildCommand: pnpm build`
- une rewrite SPA (toutes les routes inconnues → `index.html`)
- `Cache-Control: no-store` sur `/sw.js` (évite un service worker périmé)
- `max-age=31536000 immutable` sur `/assets/*`

### 4) Aligner WebAuthn sur le domaine final

WebAuthn refuse les credentials si `RP_ID` ne correspond pas exactement
au domaine. Si vous bascule du sous-domaine Vercel à un domaine custom :

```bash
fly secrets set \
  WEBAUTHN_RP_ID="nobty.app" \
  WEBAUTHN_ORIGIN="https://nobty.app"
fly deploy   # redémarre le sidecar avec les nouvelles valeurs
```

Et côté Vercel : ajoutez le domaine custom dans `Settings → Domains`.

### 5) Vérifier la santé

```bash
curl https://REPLACE_ME.fly.dev/api/nobty/health
# → {"ok":true,"service":"nobty","time":"…"}
```

---

## Import OpenStreetMap (production)

Le seed `1700000004_seed_demo_establishments.js` ne crée qu'un établissement
fictif par couple (wilaya × institution). Pour basculer sur des données
réelles **gratuites**, lancez l'importeur Overpass :

```bash
export PB_URL=http://127.0.0.1:8090
export PB_ADMIN_EMAIL=admin@nobty.app
export PB_ADMIN_PASSWORD=********
pnpm import:osm                # tous les groupes (≈ 10 requêtes Overpass)
pnpm import:osm poste hopital  # filtrer par institution_types.key
pnpm import:osm -- --dry-run   # parser sans écrire
```

Le script (`scripts/import-osm.mjs`) :

1. Authentifie en admin sur PocketBase.
2. Pour chaque groupe OSM, envoie **une seule** requête Overpass couvrant
   toute l'Algérie (`area["ISO3166-1"="DZ"]`) — évite ~1 500 requêtes par
   cellule (wilaya × type).
3. Affecte chaque résultat à la wilaya la plus proche (Haversine).
4. Upsert par `osm_id` (cf. migration `1700000005_add_osm_fields.js`) : on
   peut relancer l'import autant de fois que nécessaire sans doublonner.
5. Crée automatiquement les services standards + `queue_counters` pour
   chaque nouvel établissement.

Mapping OSM → `institution_types.key` :

| OSM tag                                          | NOBTY key(s)                                          |
|--------------------------------------------------|-------------------------------------------------------|
| `amenity=post_office`                            | `poste`                                               |
| `amenity=bank` + nom/opérateur                   | `bna` `bea` `cpa` `badr` `cnep`                       |
| `amenity=hospital`                               | `hopital`                                             |
| `amenity=clinic` / `healthcare=clinic`           | `epsp`                                                |
| `amenity=courthouse`                             | `tribunal`                                            |
| `amenity=townhall`                               | `apc`                                                 |
| `amenity=police`                                 | `surete`                                              |
| `office=tax` / `office=tax_advisor`              | `impots`                                              |
| `office=government` + nom (CNAS, ANEM, …)        | `daira` `foncier` `cnas` `casnos` `cnr` `anem` `cnrc` |
| `office=energy_supplier` + opérateur Sonelgaz    | `sonelgaz`                                            |
| `office=water_utility` + opérateur SEAAL/ADE     | `ade`                                                 |
| `office=telecommunication` + Algérie Télécom     | `at`                                                  |

Les enregistrements démo restent en base (leur `osm_id` est vide) ; vous
pouvez les supprimer une fois l'import OSM validé via l'Admin UI ou un
filtre `osm_id = ""`.

Quotas : Overpass public limite à ~2 requêtes simultanées et ~10 000
éléments par requête ; pour un import récurrent en production, hébergez
votre propre instance via `OVERPASS_URL=...`.

---

## Roadmap

- [x] Import des vrais établissements (OSM / Overpass — `pnpm import:osm`)
- [x] OTP **6 chiffres** custom (hooks `otp-request`/`otp-verify` + Twilio/Vonage SMS, repli email)
- [x] Vérification WebAuthn côté serveur (sidecar `@simplewebauthn/server`, anti-replay counter)
- [x] Mode offline avancé : outbox IndexedDB + auto-flush sur `online` (cf. `src/providers/OutboxProvider.tsx`)
- [x] Tableau de bord admin (`/admin`, hook `GET /api/nobty/admin/stats` avec GROUP BY SQL)
- [x] Notifications Web Push (sidecar `web-push` + SW custom + opt-in dans le profil)

---

## Licence

MIT © 2026 — Communauté NOBTY
