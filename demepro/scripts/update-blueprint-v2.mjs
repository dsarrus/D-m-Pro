#!/usr/bin/env node
// scripts/update-blueprint-v2.mjs
//
// Met à jour les fichiers restants du blueprint DɛmɛPro.
// Couvre les vagues 2 à 6.
//
// Usage :
//   node scripts/update-blueprint-v2.mjs
//   node scripts/update-blueprint-v2.mjs --dry-run
//   node scripts/update-blueprint-v2.mjs --force

import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

/* ================================================================
 * CONFIGURATION
 * ================================================================ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const BLUEPRINT = join(ROOT, "docs", "blueprint");

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

const TODAY = new Date().toISOString().slice(0, 10);

/* ================================================================
 * LOG
 * ================================================================ */

const c = {
  reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m",
  red: "\x1b[31m", cyan: "\x1b[36m", gray: "\x1b[90m", bold: "\x1b[1m",
};

const log = {
  info: (m) => console.log(`${c.cyan}ℹ${c.reset} ${m}`),
  ok: (m) => console.log(`${c.green}✓${c.reset} ${m}`),
  skip: (m) => console.log(`${c.gray}○${c.reset} ${m}`),
  warn: (m) => console.log(`${c.yellow}⚠${c.reset} ${m}`),
  err: (m) => console.log(`${c.red}✗${c.reset} ${m}`),
  header: (m) => console.log(`\n${c.bold}${m}${c.reset}`),
};

/* ================================================================
 * UTILITAIRES
 * ================================================================ */

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

async function ensureDir(d) {
  if (DRY_RUN) return;
  await mkdir(d, { recursive: true });
}

async function writeBlueprintFile(relPath, content) {
  const absPath = join(BLUEPRINT, relPath);
  const exists_ = await exists(absPath);

  if (!exists_) {
    if (DRY_RUN) { log.info(`[DRY] CREATE ${relPath}`); return "dry-create"; }
    await ensureDir(dirname(absPath));
    await writeFile(absPath, content.trimEnd() + "\n", "utf-8");
    log.ok(`CREATE ${relPath}`);
    return "create";
  }

  if (!FORCE) {
    const current = await readFile(absPath, "utf-8");
    const isPlaceholder =
      current.includes("🚧 Draft") &&
      !current.includes("0.2.0") &&
      current.length < 3000;

    if (!isPlaceholder) {
      log.skip(`${relPath} (personnalisé, utilise --force)`);
      return "skip";
    }
  }

  if (DRY_RUN) { log.info(`[DRY] UPDATE ${relPath}`); return "dry-update"; }

  await writeFile(absPath, content.trimEnd() + "\n", "utf-8");
  log.ok(`UPDATE ${relPath}`);
  return "update";
}

/* ================================================================
 * HEADER / FOOTER STANDARD
 * ================================================================ */

const header = (title, section) =>
  `# ${title}

> **Section** : ${section}
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : ${TODAY}`;

const footer = (version = "0.2.0", changes = []) => `
---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | ${version} |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | ${TODAY} |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
${changes.map((c) => `| ${c.date} | ${c.version} | ${c.change} | ${c.author} |`).join("\n")}`;

const defaultChanges = () => [
  { date: "2026-10-10", version: "0.1.0", change: "Création initiale", author: "—" },
  { date: TODAY, version: "0.2.0", change: "Intégration vision place de marché hybride", author: "—" },
];

/* ================================================================
 * FICHIERS — VAGUE 2 (03-domain restants)
 * ================================================================ */

const FILES = {};

/* ------------------------------------------------------------------
 * 03-domain/actors.md
 * ------------------------------------------------------------------ */
FILES["03-domain/actors.md"] = `
${header("Acteurs", "03-domain")}

## Introduction

Les **acteurs** sont les entités (humaines ou systèmes) qui
interagissent avec le domaine DɛmɛPro. Chaque acteur a un **rôle
métier** clair et un **périmètre d'action** défini.

## Acteurs humains

### 🌐 Visiteur

- **Description** : Utilisateur non authentifié
- **Peut faire** :
  - Parcourir les produits ACTIVE
  - Consulter les boutiques et catégories
  - Voir les avis publics
  - S'inscrire
- **Ne peut PAS faire** :
  - Acheter
  - Voir les produits DRAFT ou ARCHIVED
  - Laisser un avis
- **Permissions RBAC** : aucune (endpoints publics uniquement)

### 👤 Client

- **Description** : Utilisateur authentifié avec rôle CLIENT
- **Peut faire** :
  - Tout ce que fait le visiteur
  - Passer commande
  - Payer
  - Voir ses commandes
  - Laisser des avis après livraison
  - Gérer ses adresses
  - Demander un devis (Phase 2)
  - Réserver une prestation (Phase 2)
- **Ne peut PAS faire** :
  - Créer une boutique
  - Publier des produits
  - Modifier les produits d'autrui
  - Accéder aux commandes d'autres clients
- **Permissions RBAC** :
  - \`catalog.product.read\`
  - \`order.create\`
  - \`order.read.own\`
  - \`review.create\`
  - \`address.*\`

### 🛠️ Professionnel

- **Description** : Utilisateur avec rôle PROFESSIONAL et profil vérifié
- **Peut faire** :
  - Gérer une ou plusieurs boutiques
  - Créer / modifier / archiver des produits
  - Gérer les variantes et le stock
  - Uploader des images
  - Voir les commandes reçues
  - Expédier / livrer les commandes
  - Proposer des services (Phase 2)
  - Répondre aux devis (Phase 2)
- **Ne peut PAS faire** :
  - Modifier les produits d'autres professionnels
  - Accéder aux commandes d'autres boutiques
  - Valider son propre KYC
- **Permissions RBAC** :
  - \`catalog.product.*\` (sur ses propres ressources)
  - \`catalog.inventory.*\`
  - \`store.read.own\`, \`store.update.own\`
  - \`order.read.store\`, \`order.ship.store\`
  - \`service.*\` (Phase 2)

### 👑 Admin

- **Description** : Utilisateur avec rôle ADMIN
- **Peut faire** :
  - Vérifier les profils professionnels
  - Suspendre une boutique
  - Modérer les avis signalés
  - Consulter les signalements
  - Accéder au dashboard global
- **Ne peut PAS faire** :
  - Modifier les produits des professionnels (sauf modération)
  - Voir les données sensibles (mots de passe, tokens)
- **Permissions RBAC** :
  - \`admin.verification.*\`
  - \`admin.moderation.*\`
  - \`admin.store.suspend\`
  - \`catalog.product.read\`

### 🔱 Super Admin

- **Description** : Utilisateur avec rôle SUPER_ADMIN
- **Peut faire** : tout, y compris les actions critiques
- **Restrictions** :
  - Actions sensibles tracées dans un audit log
  - Double validation pour les suppressions de comptes

## Acteurs système

### 💳 Payment Provider

- **Description** : Orange Money, Wave (Phase 2 : Stripe, PayPal)
- **Rôle** : Traiter les paiements, envoyer des webhooks
- **Protocole** : REST + Webhooks signés
- **Fiabilité** : retry automatique, idempotence requise

### 📧 Notification Provider

- **Description** : SendGrid (email), Twilio (SMS)
- **Rôle** : Envoyer les notifications transactionnelles
- **Protocole** : REST
- **Retry** : exponentiel en cas d'échec

### 🗄️ Storage Provider

- **Description** : SeaweedFS (S3-compatible)
- **Rôle** : Stocker les images produits, logos boutiques
- **Protocole** : S3 API
- **Sécurité** : Signed URLs avec expiration

### ⏰ Scheduler

- **Description** : Job interne (BullMQ ou cron)
- **Rôle** : Expiration des devis, purge des idempotency keys,
  nettoyage des sessions, rappels
- **Fréquence** : quotidien ou horaire selon le job

### 📊 Analytics

- **Description** : Service interne (PostgreSQL + vues matérialisées)
- **Rôle** : Agréger les événements métier
- **Protocole** : interne (async, post-commit)

## Matrice d'interactions

| Acteur | Catalog | Order | Payment | Service | Review |
|---|---|---|---|---|---|
| Visiteur | read | — | — | read | read |
| Client | read | CRUD own | create | CRUD own (P2) | create |
| Professionnel | CRUD own | read own | — | CRUD own (P2) | read |
| Admin | read | read all | read | read all | moderate |
| Super Admin | tout | tout | tout | tout | tout |
| Payment Provider | — | — | webhook | — | — |
| Notification | — | read | read | read | read |
| Scheduler | read | read | read | read | read |

## Interactions détaillées

\`\`\`
Visiteur ──► [API publique] ──► Catalog (read)
Client ──► [API auth] ──► Catalog + Order + Payment + Review
Professionnel ──► [API auth] ──► Catalog + Store + Order
Admin ──► [API admin] ──► tous les modules (modération)
Payment Provider ──► [Webhook] ──► Payment
Scheduler ──► [API interne] ──► tous les modules (maintenance)
\`\`\`

## Anti-patterns à éviter

- ❌ Un professionnel qui agit sur les produits d'un autre
- ❌ Un client qui accède aux commandes d'un autre
- ❌ Un admin qui modifie silencieusement un produit
- ❌ Un visiteur qui voit des produits non publiés
- ❌ Un acteur système sans authentification

## Implémentation

### Middleware d'authentification

\`\`\`typescript
// Injecte req.user
export function authenticate(req, res, next) { /* JWT */ }
\`\`\`

### Middleware de permission

\`\`\`typescript
// Vérifie la permission RBAC
export function requirePermission(permission: string) { /* ... */ }
\`\`\`

### Vérification d'ownership

\`\`\`typescript
// Dans chaque service
if (resource.ownerId !== ctx.userId) {
  throw new CatalogError("UNAUTHORIZED_STORE", "...");
}
\`\`\`

${footer("0.2.0", defaultChanges())}
`;

/* ------------------------------------------------------------------
 * 03-domain/domain-rules.md
 * ------------------------------------------------------------------ */
FILES["03-domain/domain-rules.md"] = `
${header("Règles de domaine", "03-domain")}

## Introduction

Les **règles de domaine** sont les contraintes invariantes qui
gouvernent le comportement du système. Elles s'appliquent
**indépendamment** de l'interface (API, admin, CLI) et sont
**garanties au niveau** :

1. **DTO** (validation Zod)
2. **Service** (logique métier)
3. **Base de données** (contraintes SQL)

**Une règle violée = une erreur métier explicite.**

## Règles transverses

### RT-001 — Ownership strict

**Règle** : Un acteur ne peut agir que sur les ressources dont il
est propriétaire.

**Implémentation** :
- Vérification systématique dans les services
- Erreur \`UNAUTHORIZED_STORE\` (403)
- Ne jamais se fier au client

\`\`\`typescript
if (product.store.professional.userId !== ctx.userId) {
  throw new CatalogError(
    CatalogErrorCode.UNAUTHORIZED_STORE,
    "Vous n'êtes pas autorisé à modifier ce produit.",
  );
}
\`\`\`

### RT-002 — Idempotence des créations sensibles

**Règle** : Toute création sensible (produit, commande, paiement)
supporte une clé d'idempotence.

**Implémentation** :
- Header \`Idempotency-Key\` optionnel
- Clé composite \`(key, scope)\` en DB
- TTL 24h
- Détection de payload différent → \`IDEMPOTENCY_CONFLICT\`

### RT-003 — Atomicité des opérations multi-tables

**Règle** : Toute opération touchant plusieurs tables est
transactionnelle.

**Implémentation** :
- \`prisma.$transaction\` obligatoire
- Isolation \`Serializable\` pour les écritures critiques
- Retry automatique sur P2034

### RT-004 — Validation à 3 niveaux

**Règle** : Toute entrée est validée à 3 niveaux :

1. **DTO Zod** — format, type, champs requis
2. **Service** — règles métier (unicité, état, ownership)
3. **DB** — contraintes (\`@unique\`, \`CHECK\`, FK)

\`\`\`
Client ──► [DTO Zod] ──► [Service] ──► [DB]
              │             │            │
              ▼             ▼            ▼
            400           4xx         Erreur DB
                                      (rollback)
\`\`\`

### RT-005 — Traçabilité des modifications

**Règle** : Les entités critiques (Order, Payment) ont un historique
de leurs transitions d'état.

**Implémentation** :
- Table \`OrderStatusHistory\`
- Chaque transition est enregistrée
- Champ \`changedBy\` pour audit

### RT-006 — Erreurs typées avec codes métier

**Règle** : Toute erreur métier a un **code** stable et un **status
HTTP** cohérent.

**Implémentation** :
- \`CatalogError\` centralisée
- Mapping code → status HTTP automatique
- Jamais de message technique exposé au client

### RT-007 — Soft delete par défaut

**Règle** : Les entités critiques ne sont **jamais** supprimées
physiquement.

**Implémentation** :
- Champ \`status = ARCHIVED\` ou \`deletedAt\`
- Filtres par défaut excluant les archivés
- Hard delete uniquement sur demande explicite (RGPD, admin)

## Règles par domaine

### Catalog

#### RC-001 — hasVariants et price sont cohérents

\`\`\`
Si hasVariants = true  ⟹ price = null
Si hasVariants = false ⟹ price ≠ null
\`\`\`

#### RC-002 — Une variante n'existe que si hasVariants = true

Impossible de créer une variante sur un produit \`hasVariants = false\`.

#### RC-003 — SKU unique global

Aucun doublon de SKU sur l'ensemble des variantes.

**Contraintes** :
- Vérification applicative (service)
- Contrainte DB (\`@unique\`)
- Retry sur P2002 (concurrence)

#### RC-004 — Slug unique par store

Deux produits d'une même boutique ne peuvent avoir le même slug.

#### RC-005 — Une seule image primaire par produit

Au plus un \`isPrimary = true\` par produit.

#### RC-006 — Première image devient primaire automatiquement

Si aucune image primaire n'existe, la première créée devient primaire.

#### RC-007 — Suppression d'image primaire promeut la suivante

Promotion automatique pour éviter l'absence de primaire.

#### RC-008 — Stock réservé ≤ stock total

\`reserved <= quantity\` toujours garanti par SQL atomique.

#### RC-009 — Annulation impossible si réservations actives

Un produit avec \`reserved > 0\` ne peut pas être supprimé.

#### RC-010 — Impossible de désactiver la dernière variante active

Garantit qu'un produit publié a toujours au moins une variante active.

#### RC-011 — Un produit archivé ne peut plus être modifié

Sauf pour le restaurer (explicitement).

### Store

#### RS-001 — Une boutique a un propriétaire unique

\`store.professionalId\` non null, ownership vérifié à chaque opération.

#### RS-002 — Slug unique global

Pas deux boutiques avec le même slug dans tout DɛmɛPro.

#### RS-003 — Statut contrôlé par admin

Passage à ACTIVE uniquement après vérification KYC.

#### RS-004 — Une boutique suspendue ne peut plus vendre

Produits invisibles aux clients, nouvelles commandes bloquées.

### Order

#### RO-001 — Une commande réserve le stock

À la création, le stock est **réservé** (atomique).

#### RO-002 — Un OrderItem référence un produit OU une variante

XOR strict.

#### RO-003 — Snapshot du prix et du nom

Le prix et le nom sont figés au moment de la commande.

#### RO-004 — Transitions d'état contrôlées

Seules les transitions autorisées sont permises.

#### RO-005 — Annulation possible si PENDING ou PAID

Refus si SHIPPED ou DELIVERED.

#### RO-006 — Remboursement possible si PAID ou DELIVERED (< 30j)

Fenêtre de 30 jours après livraison.

#### RO-007 — Commit du stock au paiement

Décrémente \`quantity\` ET \`reserved\` atomiquement.

### Service (Phase 2)

#### RV-001 — pricingModel cohérent avec basePrice

- FIXED ou HOURLY → \`basePrice ≠ null\`
- QUOTE → \`basePrice\` peut être null

#### RV-002 — Availability cohérente

- Récurrent → \`dayOfWeek\`, \`startTime < endTime\`
- Ponctuel → \`specificDate\` non null

#### RV-003 — Un professionnel vérifié peut publier des services

Badge KYC requis.

### Quote (Phase 2)

#### RQ-001 — Un devis expire

TTL par défaut : 7 jours.

#### RQ-002 — Un devis accepté crée un Booking

Transaction atomique : \`ACCEPTED → CONVERTED\` + création Booking.

#### RQ-003 — Une seule réponse par devis

\`QuoteResponse.quoteId\` unique.

### Booking (Phase 2)

#### RB-001 — Un créneau ne peut être réservé qu'une fois

Contrainte sur \`(serviceId, scheduledAt)\`.

#### RB-002 — Annulation possible > 24h avant

Refus dans les 24 dernières heures (sauf accord du pro).

#### RB-003 — Statuts finaux non modifiables

\`COMPLETED\`, \`CANCELLED\`, \`NO_SHOW\` sont terminaux.

### Payment

#### RP-001 — XOR entre Order et Booking

Un paiement référence soit une commande, soit une réservation.

#### RP-002 — providerRef unique

Évite les doublons de paiement.

#### RP-003 — Cohérence du montant

\`payment.amount = order.totalAmount\` (ou booking.totalAmount).

#### RP-004 — Webhooks signés et idempotents

Vérification de signature + idempotence.

### Review

#### RR-001 — Un avis par commande/réservation

Contrainte unique.

#### RR-002 — Avis uniquement après livraison

\`order.status = DELIVERED\`.

#### RR-003 — Note entre 1 et 5

Validation Zod.

#### RR-004 — isVerifiedPurchase automatique

Si \`orderId\` ou \`bookingId\` non null.

### Address

#### RA-001 — Une seule adresse par défaut par user

Contrainte sur \`(userId, isDefault = true)\`.

#### RA-002 — Adresse supprimable si pas utilisée

Refus si une commande PENDING y est liée.

## Matrice de validation

| Règle | DTO | Service | DB | Test |
|---|---|---|---|---|
| RT-001 Ownership | — | ✅ | FK | ✅ |
| RT-002 Idempotence | — | ✅ | unique | ✅ |
| RT-003 Atomicité | — | ✅ | tx | ✅ |
| RT-004 Validation 3 niveaux | ✅ | ✅ | ✅ | ✅ |
| RT-005 Traçabilité | — | ✅ | table | ✅ |
| RT-006 Erreurs typées | — | ✅ | — | ✅ |
| RT-007 Soft delete | — | ✅ | status | ✅ |
| RC-001 hasVariants/price | ✅ | ✅ | — | ✅ |
| RC-002 Variante/hasVariants | — | ✅ | — | ✅ |
| RC-003 SKU unique | — | ✅ | unique | ✅ |
| RC-004 Slug unique store | — | ✅ | unique | ✅ |
| RC-005 Image primaire | ✅ | ✅ | — | ✅ |
| RC-006 Première image | — | ✅ | — | ✅ |
| RC-007 Promotion primaire | — | ✅ | — | ✅ |
| RC-008 reserved ≤ quantity | — | ✅ | CHECK + SQL | ✅ |
| RC-009 Réservations actives | — | ✅ | — | ✅ |
| RC-010 Dernière variante | — | ✅ | — | ✅ |
| RC-011 Produit archivé | — | ✅ | — | ✅ |
| RO-001 Réservation stock | — | ✅ | tx | ✅ |
| RO-002 XOR OrderItem | ✅ | ✅ | — | ✅ |
| RO-003 Snapshot | — | ✅ | — | ✅ |
| RO-004 Transitions | — | ✅ | — | ✅ |
| RO-005 Annulation | — | ✅ | — | ✅ |
| RO-006 Remboursement | — | ✅ | — | ✅ |
| RO-007 Commit stock | — | ✅ | SQL | ✅ |

## Implémentation centralisée

### Constantes

\`\`\`typescript
// apps/api/src/modules/<module>/domain/rules.ts

export const RESERVATION_TIMEOUT_MINUTES = 15;
export const REFUND_WINDOW_DAYS = 30;
export const QUOTE_EXPIRY_DAYS = 7;
export const CANCELLATION_WINDOW_HOURS = 24;
export const IDEMPOTENCY_TTL_HOURS = 24;
\`\`\`

### Fonctions d'assertion

\`\`\`typescript
export function assertOwnership(
  resource: { ownerId: string },
  ctx: AuthContext,
): void {
  if (resource.ownerId !== ctx.userId) {
    throw new CatalogError(
      CatalogErrorCode.UNAUTHORIZED_STORE,
      "Non autorisé.",
    );
  }
}

export function assertHasVariantsConsistency(
  hasVariants: boolean,
  price: number | null,
): void {
  if (hasVariants && price !== null) {
    throw new CatalogError(
      CatalogErrorCode.INVALID_PRODUCT_STATE,
      "Un produit à variantes ne doit pas avoir de prix direct.",
    );
  }
  if (!hasVariants && price === null) {
    throw new CatalogError(
      CatalogErrorCode.INVALID_PRODUCT_STATE,
      "Un produit simple doit avoir un prix.",
    );
  }
}
\`\`\`

## Tests des règles

Chaque règle a **au moins un test** :

\`\`\`typescript
describe("RC-008 — reserved <= quantity", () => {
  it("respecte l'invariant sous concurrence", async () => {
    // ... 10 réservations simultanées
    expect(inv.reserved).toBeLessThanOrEqual(inv.quantity);
  });
});
\`\`\`

${footer("0.2.0", defaultChanges())}
`;

/* ================================================================
 * FICHIERS — VAGUE 3 (02-requirements)
 * ================================================================ */

FILES["02-requirements/functional-requirements.md"] = `
${header("Exigences fonctionnelles", "02-requirements")}

## Format

Chaque exigence est identifiée par \`FR-XXX\` :

> **FR-XXX** — [Titre]
> **Priorité** : Must / Should / Could / Won't (MoSCoW)
> **Description** : —
> **Critères d'acceptation** : —

## Module Auth

**FR-001** — Inscription utilisateur
- **Priorité** : Must
- **Description** : Un visiteur peut s'inscrire comme CLIENT ou
  PROFESSIONNEL avec email + mot de passe.
- **Critères** :
  - Email unique validé
  - Mot de passe hashé (bcrypt, coût 12+)
  - Confirmation par email (optionnel MVP)
  - Inscription en < 30 secondes

**FR-002** — Connexion utilisateur
- **Priorité** : Must
- **Critères** :
  - JWT access token (15 min)
  - Refresh token (7 jours)
  - Retourne 401 si credentials invalides

**FR-003** — Réinitialisation de mot de passe
- **Priorité** : Should
- **Critères** : Lien par email, token à usage unique, expiration 1h

## Module Catalog

**FR-010** — Créer un produit simple
- **Priorité** : Must
- **Critères** :
  - hasVariants=false → price obligatoire
  - slug unique par store
  - status initial = DRAFT

**FR-011** — Créer un produit avec variantes
- **Priorité** : Must
- **Critères** :
  - hasVariants=true → au moins 1 variante
  - price=null
  - SKU unique global
  - Transaction atomique

**FR-012** — Modifier un produit
- **Priorité** : Must
- **Critères** :
  - Refus si produit ARCHIVED
  - Vérif ownership

**FR-013** — Archiver un produit
- **Priorité** : Must
- **Critères** :
  - status=ARCHIVED
  - Toutes les variantes désactivées
  - Stock conservé

**FR-014** — Activer un produit
- **Priorité** : Must
- **Critères** :
  - Refus si pas de stock
  - Refus si ARCHIVED

**FR-015** — Ajouter une variante
- **Priorité** : Must
- **Critères** :
  - Uniquement si hasVariants=true
  - SKU unique global
  - Création d'inventaire automatique

**FR-016** — Ajouter des images
- **Priorité** : Must
- **Critères** :
  - Première image → primaire auto
  - Au plus 1 primaire par produit

**FR-017** — Réordonner les images
- **Priorité** : Should
- **Critères** : Liste ordonnée complète requise

## Module Store

**FR-020** — Créer une boutique
- **Priorité** : Must
- **Critères** :
  - Uniquement pour PROFESSIONAL
  - Slug unique global
  - Status initial = PENDING

**FR-021** — Activer une boutique
- **Priorité** : Must (admin)
- **Critères** : Après vérification KYC

**FR-022** — Suspendre une boutique
- **Priorité** : Should (admin)
- **Critères** : Produits invisibles, commandes bloquées

## Module Order

**FR-030** — Ajouter au panier
- **Priorité** : Must
- **Critères** :
  - Persistance serveur (ou localStorage au MVP)
  - Vérif stock disponible

**FR-031** — Passer commande
- **Priorité** : Must
- **Critères** :
  - Réservation atomique du stock
  - Idempotence supportée
  - Rollback complet si échec
  - Snapshot prix/nom

**FR-032** — Payer une commande
- **Priorité** : Must
- **Critères** :
  - Orange Money + Wave + cash
  - Webhook signé
  - Commit atomique du stock
  - Idempotence

**FR-033** — Voir ses commandes
- **Priorité** : Must
- **Critères** :
  - Uniquement ses propres commandes
  - Pagination

**FR-034** — Expédier une commande
- **Priorité** : Must (pro)
- **Critères** : Seulement si status=PAID

**FR-035** — Livrer une commande
- **Priorité** : Must (pro)
- **Critères** : Seulement si status=SHIPPED

**FR-036** — Annuler une commande
- **Priorité** : Should
- **Critères** :
  - Possible si PENDING ou PAID
  - Release du stock
  - Remboursement si PAID

## Module Service (Phase 2)

**FR-040** — Créer un service
- **Priorité** : Should (Phase 2)
- **Critères** : pricingModel cohérent

**FR-041** — Demander un devis
- **Priorité** : Should
- **Critères** : Description obligatoire, expiration 7j

**FR-042** — Répondre à un devis
- **Priorité** : Should
- **Critères** : Prix proposé + date

**FR-043** — Accepter un devis
- **Priorité** : Should
- **Critères** : Création automatique de Booking

**FR-044** — Réserver un créneau
- **Priorité** : Should
- **Critères** : Créneau unique, transaction atomique

## Module Review

**FR-050** — Laisser un avis
- **Priorité** : Must
- **Critères** :
  - Après livraison uniquement
  - 1 avis par commande
  - Note 1-5

**FR-051** — Voir les avis
- **Priorité** : Must
- **Critères** : Tri par date, pagination

**FR-052** — Signaler un avis
- **Priorité** : Should
- **Critères** : Raison obligatoire, modération admin

## Module Notification

**FR-060** — Notifications email
- **Priorité** : Must
- **Critères** :
  - Commande créée/expédiée/livrée
  - Paiement confirmé
  - Templates traduits

**FR-061** — Notifications SMS
- **Priorité** : Should
- **Critères** : Confirmations transactionnelles

## Priorités globales

| Priorité | Nb | % |
|---|---|---|
| Must | 25 | 68% |
| Should | 10 | 27% |
| Could | 2 | 5% |
| Won't (MVP) | — | — |

${footer("0.2.0", defaultChanges())}
`;

FILES["02-requirements/non-functional-requirements.md"] = `
${header("Exigences non-fonctionnelles", "02-requirements")}

## Performance

| Exigence | Cible | Mesure |
|---|---|---|
| Temps de réponse API (p50) | < 150 ms | Prometheus |
| Temps de réponse API (p95) | < 500 ms | Prometheus |
| Temps de réponse API (p99) | < 1 s | Prometheus |
| Temps de chargement page (p95) | < 2 s | Lighthouse |
| Temps de création produit | < 2 s | Test E2E |
| Temps de création commande | < 1 s | Test E2E |
| Temps de réservation stock | < 100 ms | Test intégration |
| Time to First Byte (TTFB) | < 300 ms | RUM |

## Scalabilité

| Exigence | Cible | Stratégie |
|---|---|---|
| Utilisateurs simultanés | 10 000 | Horizontal scaling |
| Requêtes/seconde | 5 000 | Load balancing |
| Commandes/jour | 50 000 | Partitioning |
| Produits en catalogue | 1 000 000 | Indexation |
| Images stockées | 10 TB | CDN + S3 |

## Disponibilité

| Exigence | Cible | Mesure |
|---|---|---|
| Uptime API | 99.9% | Monitoring |
| Uptime DB | 99.95% | Managed PostgreSQL |
| RTO (Recovery Time Objective) | 1h | Drill trimestriel |
| RPO (Recovery Point Objective) | 5 min | WAL archiving |
| Downtime planifié | < 4h/an | Blue/green deploys |

## Sécurité

| Exigence | Cible |
|---|---|
| Chiffrement en transit | TLS 1.3 |
| Chiffrement au repos | AES-256 |
| Hash mot de passe | bcrypt coût 12+ |
| JWT signature | RS256 |
| Validation entrées | Zod + contraintes DB |
| Rate limiting | Par IP + par user |
| Audit log | Toutes actions sensibles |
| Secrets | Variables d'env chiffrées |
| PII | Chiffrées ou tokenisées |

## Fiabilité transactionnelle

| Exigence | Cible | Implémentation |
|---|---|---|
| Atomicité | 100% des opérations multi-tables | Prisma transactions |
| Isolation Serializable | Écritures critiques | \\\`isolationLevel: Serializable\\\` |
| Retry P2034 | Automatique (3 tentatives) | \\\`withSerializableRetry\\\` |
| Idempotence | 100% des créations sensibles | \\\`Idempotency-Key\\\` |
| Intégrité référentielle | 100% | FK + CHECK |
| Absence de survente | Garantie | SQL atomique |

## Compatibilité

| Exigence | Cible |
|---|---|
| Navigateurs | Chrome 100+, Safari 15+, Firefox 100+ |
| Mobile | iOS 14+, Android 10+ |
| Résolution | 320px+ |
| Connexion | 3G+ |
| PWA | Installable (post-MVP) |

## Accessibilité

| Exigence | Cible |
|---|---|
| WCAG | 2.1 niveau AA |
| Contraste | ≥ 4.5:1 |
| Navigation clavier | Complète |
| Screen readers | Compatible |

## Internationalisation

| Exigence | Cible | Phase |
|---|---|---|
| Langues | Français + Bambara | Phase 2 |
| Devises | XOF (par défaut) | MVP |
| Multi-devises | EUR, USD | Phase 3 |
| Formats de date | Locale-aware | Phase 2 |

## Observabilité

| Exigence | Cible |
|---|---|
| Logs structurés | JSON |
| Niveaux de log | error, warn, info, debug |
| Métriques | Prometheus |
| Traces | OpenTelemetry |
| Alertes | Error rate > 1%, latence p95 > 1s |

## Maintenabilité

| Exigence | Cible |
|---|---|
| Couverture de tests | > 80% |
| Complexité cyclomatique | < 10 par fonction |
| Duplication | < 3% |
| Documentation API | OpenAPI 3.1 |
| Documentation code | JSDoc sur APIs publiques |

## Conformité

| Exigence | Cible |
|---|---|
| RGPD | Droit d'accès, droit à l'oubli |
| PCI-DSS | Aucun stockage de cartes |
| Fiscalité | Conformité DGI Mali |
| KYC | Vérification des professionnels |

## Coûts

| Poste | Cible An 1 |
|---|---|
| Infrastructure | < 300 K FCFA/mois |
| Coût par transaction | < 50 FCFA |
| Coût par utilisateur actif | < 200 FCFA/mois |

## Contraintes techniques

- **Monorepo** : pnpm workspaces
- **Backend** : Node.js 20+, TypeScript strict
- **Frontend** : Next.js 14+
- **DB** : PostgreSQL 16+
- **ORM** : Prisma 7+
- **Storage** : S3-compatible (SeaweedFS, MinIO)
- **Cache** : Redis 7+
- **Queue** : BullMQ

## Contraintes légales

- Hébergement : Mali ou région (latence)
- RGPD : conformité si expansion UE
- KYC : obligatoire pour professionnels
- Fiscalité : facturation conforme DGI

${footer("0.2.0", defaultChanges())}
`;

FILES["02-requirements/business-rules.md"] = `
${header("Règles métier", "02-requirements")}

## Format

Chaque règle est identifiée par \`BR-<MODULE>-<NUM>\`.

## Catalog

**BR-CAT-001** — Cohérence hasVariants / price
- **Règle** : \`hasVariants = true ⟹ price = null\`
- **Règle** : \`hasVariants = false ⟹ price ≠ null\`
- **Violation** : \`INVALID_PRODUCT_STATE\` (422)

**BR-CAT-002** — Variante nécessite hasVariants
- **Règle** : Impossible de créer une variante si \`hasVariants = false\`
- **Violation** : \`PRODUCT_HAS_NO_VARIANTS\` (422)

**BR-CAT-003** — SKU unique global
- **Règle** : Aucun doublon de SKU sur \`ProductVariant\`
- **Violation** : \`DUPLICATE_SKU\` (409)

**BR-CAT-004** — Slug unique par store
- **Règle** : Deux produits d'un même store ne peuvent avoir le même slug
- **Violation** : \`DUPLICATE_SLUG\` (409)

**BR-CAT-005** — Une seule image primaire
- **Règle** : Au plus un \`isPrimary = true\` par produit
- **Violation** : impossible (garanti par service)

**BR-CAT-006** — Promotion automatique de la primaire
- **Règle** : Première image créée = primaire
- **Règle** : Suppression de la primaire → promotion suivante

**BR-CAT-007** — Stock réservé ≤ stock total
- **Règle** : \`reserved <= quantity\` toujours
- **Implémentation** : SQL atomique \`UPDATE ... WHERE quantity - reserved >= qty\`

**BR-CAT-008** — Suppression protégée par réservations
- **Règle** : Refus de suppression si \`reserved > 0\`
- **Violation** : \`INVALID_INVENTORY_QUANTITY\` (422)

**BR-CAT-009** — Dernière variante active protégée
- **Règle** : Impossible de désactiver la dernière variante active
- **Violation** : \`LAST_ACTIVE_VARIANT\` (422)

**BR-CAT-010** — Produit archivé immuable
- **Règle** : Refus de modification d'un produit ARCHIVED
- **Violation** : \`INVALID_PRODUCT_STATE\` (422)

## Store

**BR-STO-001** — Un propriétaire par boutique
- **Règle** : \`store.professionalId\` obligatoire

**BR-STO-002** — Slug unique global
- **Violation** : \`DUPLICATE_SLUG\` (409)

**BR-STO-003** — Activation par admin
- **Règle** : Passage à ACTIVE après vérification KYC

**BR-STO-004** — Suspension bloque les ventes
- **Règle** : Produits invisibles, commandes bloquées

## Order

**BR-ORD-001** — Réservation de stock atomique
- **Règle** : À la création d'une commande, réservation du stock
- **Règle** : Si une réservation échoue, tout est annulé (rollback)

**BR-ORD-002** — XOR OrderItem
- **Règle** : Un OrderItem référence soit un Product, soit un ProductVariant

**BR-ORD-003** — Snapshot obligatoire
- **Règle** : \`productName\`, \`variantName\`, \`unitPrice\` figés au moment de la commande

**BR-ORD-004** — Transitions contrôlées
- **Transitions** :
  - PENDING → PAID, CANCELLED
  - PAID → SHIPPED, CANCELLED, REFUNDED
  - SHIPPED → DELIVERED
  - DELIVERED → REFUNDED (< 30j)

**BR-ORD-005** — Annulation si PENDING ou PAID
- **Violation** : \`INVALID_PRODUCT_STATE\` si SHIPPED/DELIVERED

**BR-ORD-006** — Commit stock au paiement
- **Règle** : Décrémente \`quantity\` ET \`reserved\` atomiquement

**BR-ORD-007** — Idempotence
- **Règle** : Support de \`Idempotency-Key\` sur POST /orders

## Service (Phase 2)

**BR-SRV-001** — pricingModel cohérent
- **Règle** : FIXED/HOURLY → basePrice non null
- **Règle** : QUOTE → basePrice peut être null

**BR-SRV-002** — Availability cohérente
- **Récurrent** : dayOfWeek + startTime < endTime
- **Ponctuel** : specificDate non null

**BR-SRV-003** — Badge KYC requis
- **Règle** : Un professionnel doit être VERIFIED pour publier

## Quote (Phase 2)

**BR-QTE-001** — Expiration automatique
- **Règle** : TTL 7 jours par défaut

**BR-QTE-002** — Conversion atomique
- **Règle** : ACCEPTED → CONVERTED + création Booking dans une transaction

**BR-QTE-003** — Une seule réponse
- **Règle** : \`QuoteResponse.quoteId\` unique

## Booking (Phase 2)

**BR-BKG-001** — Créneau unique
- **Règle** : Contrainte sur \`(serviceId, scheduledAt)\`

**BR-BKG-002** — Fenêtre d'annulation
- **Règle** : Possible > 24h avant, refus dans les 24h

**BR-BKG-003** — Statuts terminaux
- **Règle** : COMPLETED, CANCELLED, NO_SHOW immuables

## Payment

**BR-PAY-001** — XOR Order / Booking
- **Règle** : Un paiement référence un Order OU un Booking

**BR-PAY-002** — providerRef unique
- **Règle** : Évite les doublons

**BR-PAY-003** — Cohérence montant
- **Règle** : \`payment.amount = order.totalAmount\`

**BR-PAY-004** — Webhooks sécurisés
- **Règle** : Signature vérifiée + idempotence

## Review

**BR-REV-001** — Un avis par commande
- **Règle** : Contrainte unique sur \`orderId\`

**BR-REV-002** — Avis après livraison
- **Règle** : \`order.status = DELIVERED\` requis

**BR-REV-003** — Note 1-5
- **Règle** : Validation Zod + contrainte DB

**BR-REV-004** — isVerifiedPurchase auto
- **Règle** : true si \`orderId\` ou \`bookingId\` non null

## Address

**BR-ADR-001** — Une adresse par défaut
- **Règle** : Contrainte sur \`(userId, isDefault = true)\`

**BR-ADR-002** — Suppression protégée
- **Règle** : Refus si une commande PENDING y est liée

## Auth & RBAC

**BR-AUTH-001** — Email unique
- **Règle** : Contrainte DB \`@unique\`

**BR-AUTH-002** — Mot de passe fort
- **Règle** : Min 12 caractères, hash bcrypt coût 12+

**BR-AUTH-003** — JWT expiration
- **Règle** : Access 15 min, refresh 7 jours

**BR-RBAC-001** — Permissions granulaires
- **Règle** : Format \`<module>.<entity>.<action>\`

**BR-RBAC-002** — Ownership vérifié
- **Règle** : Chaque opération vérifie \`resource.ownerId === ctx.userId\`

**BR-RBAC-003** — Admin tracé
- **Règle** : Toute action admin est loggée

## Idempotence

**BR-IDEM-001** — Clé composite
- **Règle** : \`(key, scope)\` unique en DB

**BR-IDEM-002** — TTL 24h
- **Règle** : Purge automatique des clés expirées

**BR-IDEM-003** — Payload différent = conflit
- **Règle** : Hash SHA-256 du body + \`IDEMPOTENCY_CONFLICT\`

${footer("0.2.0", defaultChanges())}
`;

FILES["02-requirements/permissions-matrix.md"] = `
${header("Matrice de permissions", "02-requirements")}

## Convention de nommage

\`\`\`
<module>.<entity>.<action>
\`\`\`

**Exemples** :
- \`catalog.product.create\`
- \`order.payment.confirm\`
- \`admin.user.suspend\`

## Rôles

| Rôle | Description | Attribution |
|---|---|---|
| **CLIENT** | Acheteur | Inscription |
| **PROFESSIONAL** | Vendeur / prestataire | Inscription + vérif KYC |
| **ADMIN** | Modérateur plateforme | Manuel |
| **SUPER_ADMIN** | Super administrateur | Manuel |

## Matrice complète

### Catalog

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`catalog.product.read\` | ✅ | ✅ | ✅ | ✅ |
| \`catalog.product.read.own\` | — | ✅ | — | ✅ |
| \`catalog.product.create\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.product.update\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.product.delete\` | ❌ | ✅ | ✅ | ✅ |
| \`catalog.product.activate\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.product.archive\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.variant.create\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.variant.update\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.variant.delete\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.variant.activate\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.variant.deactivate\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.image.create\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.image.update\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.image.delete\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.image.reorder\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.inventory.read\` | ❌ | ✅ | ✅ | ✅ |
| \`catalog.inventory.update\` | ❌ | ✅ | ❌ | ✅ |
| \`catalog.inventory.adjust\` | ❌ | ✅ | ❌ | ✅ |

### Store

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`store.read\` | ✅ | ✅ | ✅ | ✅ |
| \`store.read.own\` | — | ✅ | — | ✅ |
| \`store.create\` | ❌ | ✅ | ❌ | ✅ |
| \`store.update.own\` | ❌ | ✅ | ❌ | ✅ |
| \`store.activate\` | ❌ | ❌ | ✅ | ✅ |
| \`store.suspend\` | ❌ | ❌ | ✅ | ✅ |
| \`store.close\` | ❌ | ✅ | ✅ | ✅ |

### Order

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`order.create\` | ✅ | ❌ | ❌ | ✅ |
| \`order.read.own\` | ✅ | ❌ | ❌ | ✅ |
| \`order.read.store\` | ❌ | ✅ | ✅ | ✅ |
| \`order.read.all\` | ❌ | ❌ | ✅ | ✅ |
| \`order.update.store\` | ❌ | ✅ | ❌ | ✅ |
| \`order.ship.store\` | ❌ | ✅ | ❌ | ✅ |
| \`order.deliver.store\` | ❌ | ✅ | ❌ | ✅ |
| \`order.cancel.own\` | ✅ | ❌ | ❌ | ✅ |
| \`order.cancel.store\` | ❌ | ✅ | ✅ | ✅ |

### Payment

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`payment.create\` | ✅ | ❌ | ❌ | ✅ |
| \`payment.read.own\` | ✅ | ❌ | ❌ | ✅ |
| \`payment.read.store\` | ❌ | ✅ | ✅ | ✅ |
| \`payment.refund\` | ❌ | ❌ | ✅ | ✅ |

### Service (Phase 2)

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`service.read\` | ✅ | ✅ | ✅ | ✅ |
| \`service.create\` | ❌ | ✅ | ❌ | ✅ |
| \`service.update.own\` | ❌ | ✅ | ❌ | ✅ |
| \`service.delete.own\` | ❌ | ✅ | ✅ | ✅ |

### Quote (Phase 2)

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`quote.create\` | ✅ | ❌ | ❌ | ✅ |
| \`quote.read.own\` | ✅ | ❌ | ❌ | ✅ |
| \`quote.read.service\` | ❌ | ✅ | ✅ | ✅ |
| \`quote.respond\` | ❌ | ✅ | ❌ | ✅ |
| \`quote.accept\` | ✅ | ❌ | ❌ | ✅ |
| \`quote.reject\` | ✅ | ❌ | ❌ | ✅ |

### Booking (Phase 2)

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`booking.create\` | ✅ | ❌ | ❌ | ✅ |
| \`booking.read.own\` | ✅ | ❌ | ❌ | ✅ |
| \`booking.read.service\` | ❌ | ✅ | ✅ | ✅ |
| \`booking.start\` | ❌ | ✅ | ❌ | ✅ |
| \`booking.complete\` | ❌ | ✅ | ❌ | ✅ |
| \`booking.cancel.own\` | ✅ | ❌ | ❌ | ✅ |
| \`booking.cancel.service\` | ❌ | ✅ | ✅ | ✅ |

### Review

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`review.create\` | ✅ | ❌ | ❌ | ✅ |
| \`review.read\` | ✅ | ✅ | ✅ | ✅ |
| \`review.update.own\` | ✅ | ❌ | ❌ | ✅ |
| \`review.delete.own\` | ✅ | ❌ | ❌ | ✅ |
| \`review.moderate\` | ❌ | ❌ | ✅ | ✅ |
| \`review.report\` | ✅ | ✅ | ✅ | ✅ |

### Address

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`address.create\` | ✅ | ✅ | ❌ | ✅ |
| \`address.read.own\` | ✅ | ✅ | ❌ | ✅ |
| \`address.update.own\` | ✅ | ✅ | ❌ | ✅ |
| \`address.delete.own\` | ✅ | ✅ | ❌ | ✅ |

### Notification

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`notification.read.own\` | ✅ | ✅ | ✅ | ✅ |
| \`notification.mark-read\` | ✅ | ✅ | ✅ | ✅ |
| \`notification.send\` | ❌ | ❌ | ✅ | ✅ |

### Admin

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`admin.verification.read\` | ❌ | ❌ | ✅ | ✅ |
| \`admin.verification.approve\` | ❌ | ❌ | ✅ | ✅ |
| \`admin.verification.reject\` | ❌ | ❌ | ✅ | ✅ |
| \`admin.moderation.read\` | ❌ | ❌ | ✅ | ✅ |
| \`admin.moderation.resolve\` | ❌ | ❌ | ✅ | ✅ |
| \`admin.user.suspend\` | ❌ | ❌ | ✅ | ✅ |
| \`admin.user.delete\` | ❌ | ❌ | ❌ | ✅ |
| \`admin.audit.read\` | ❌ | ❌ | ✅ | ✅ |

## Wildcards

Un rôle peut avoir accès à un module entier :

\`\`\`
catalog.product.*  ⟹ couvre create, update, delete, activate, archive
\`\`\`

**Résolution** :
1. Exact match prioritaire
2. Wildcard de module (\`catalog.product.*\`)
3. Wildcard global (\`*\`)

## Implémentation

### Mapping en base

\`\`\`typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
  CLIENT: [
    "catalog.product.read",
    "order.create",
    "order.read.own",
    "order.cancel.own",
    "payment.create",
    "payment.read.own",
    "review.create",
    "review.read",
    "address.*",
    "notification.read.own",
  ],
  PROFESSIONAL: [
    "catalog.product.*",
    "catalog.variant.*",
    "catalog.image.*",
    "catalog.inventory.*",
    "store.read.own",
    "store.update.own",
    "store.close",
    "order.read.store",
    "order.update.store",
    "order.ship.store",
    "order.deliver.store",
    "order.cancel.store",
    "payment.read.store",
    "service.*",
    "quote.read.service",
    "quote.respond",
    "booking.read.service",
    "booking.start",
    "booking.complete",
    "booking.cancel.service",
    "review.read",
    "review.report",
    "address.*",
    "notification.read.own",
  ],
  ADMIN: [
    "catalog.product.read",
    "catalog.product.delete",
    "catalog.inventory.read",
    "store.read",
    "store.activate",
    "store.suspend",
    "store.close",
    "order.read.all",
    "order.cancel.store",
    "payment.read.store",
    "payment.refund",
    "service.read",
    "quote.read.service",
    "booking.read.service",
    "review.read",
    "review.moderate",
    "notification.read.own",
    "notification.send",
    "admin.*",
  ],
  SUPER_ADMIN: ["*"],
};
\`\`\`

### Middleware

\`\`\`typescript
router.post(
  "/products",
  authenticate,
  requirePermission("catalog.product.create"),
  validate(createProductSchema, "body"),
  controller.create,
);
\`\`\`

## Règles transverses

1. **Ownership toujours vérifié** — la permission donne l'accès au
   module, pas à la ressource spécifique.
2. **Un user peut avoir plusieurs rôles** — union des permissions.
3. **Permissions immuables en prod** — toute modification tracée.
4. **Cache 5 min** — éviter les lookups DB à chaque requête.

${footer("0.2.0", defaultChanges())}
`;

FILES["02-requirements/acceptance-criteria.md"] = `
${header("Critères d'acceptation", "02-requirements")}

## Format Gherkin

\`\`\`gherkin
Feature: [Nom]
  As a [role]
  I want [action]
  So that [benefit]

  Scenario: [Titre]
    Given [contexte]
    When [action]
    Then [résultat]
\`\`\`

## Auth

### Inscription

\`\`\`gherkin
Feature: Inscription client

  Scenario: Inscription réussie
    Given un visiteur avec email "awa@test.ml"
    When elle s'inscrit avec mot de passe "SecurePass123!"
    Then un compte CLIENT est créé
    And elle reçoit un JWT
    And elle est redirigée vers l'accueil

  Scenario: Email déjà utilisé
    Given un utilisateur existant avec email "awa@test.ml"
    When un visiteur tente de s'inscrire avec le même email
    Then la requête échoue avec 409 DUPLICATE_EMAIL

  Scenario: Mot de passe faible
    Given un visiteur
    When il s'inscrit avec mot de passe "123"
    Then la requête échoue avec 400 VALIDATION_ERROR
\`\`\`

## Catalog

### Créer un produit simple

\`\`\`gherkin
Feature: Création de produit

  Background:
    Given un professionnel authentifié "fatou@test.ml"
    And une boutique "fatou-couture" dont elle est propriétaire
    And une catégorie "mode-femme"

  Scenario: Créer un produit simple valide
    When elle crée un produit
      | name          | "Robe wax" |
      | slug          | "robe-wax" |
      | hasVariants   | false |
      | price         | 15000 |
    Then le produit est créé avec status DRAFT
    And le prix est 15000

  Scenario: Refus si hasVariants=true sans variantes
    When elle crée un produit avec hasVariants=true
    Then la requête échoue avec 400 VALIDATION_ERROR

  Scenario: Refus si slug dupliqué
    Given un produit existant avec slug "robe-wax" dans la même boutique
    When elle crée un produit avec slug "robe-wax"
    Then la requête échoue avec 409 DUPLICATE_SLUG

  Scenario: Refus si non-propriétaire
    Given un autre professionnel "awa@test.ml"
    When elle tente de créer un produit dans la boutique de Fatou
    Then la requête échoue avec 403 UNAUTHORIZED_STORE
\`\`\`

### Créer un produit à variantes

\`\`\`gherkin
Scenario: Création atomique avec variantes et images
  When elle crée un produit complet
    | hasVariants | true |
    | variants    | [41, 42, 43] |
    | images      | [p1.jpg, p2.jpg] |
  Then le produit est créé avec 3 variantes
  And les 3 inventaires sont créés
  And 1 seule image est primaire

Scenario: Rollback si une variante échoue
  Given un SKU "CH-42" déjà utilisé ailleurs
  When elle tente de créer un produit avec 3 variantes dont SKU "CH-42"
  Then la requête échoue avec 409 DUPLICATE_SKU
  And aucun produit n'est créé
  And aucune variante n'est créée
\`\`\`

### Concurrence

\`\`\`gherkin
Scenario: Empêcher la survente sous concurrence
  Given un produit "Robe wax" avec stock=5
  When 10 clientes réservent simultanément 1 robe
  Then exactement 5 réservations réussissent
  And exactement 5 échouent avec INSUFFICIENT_STOCK
  And le stock réservé est 5
  And quantity - reserved = 0
\`\`\`

### Idempotence

\`\`\`gherkin
Scenario: Double clic sur "Créer produit"
  Given un professionnel avec clé "idem-key-1"
  When il crée un produit
  And il refait la même requête avec la même clé
  Then un seul produit existe en DB
  And les deux réponses sont identiques

Scenario: Même clé, payload différent
  Given une clé "idem-key-2" utilisée avec payload A
  When la même clé est utilisée avec payload B
  Then la requête échoue avec 409 IDEMPOTENCY_CONFLICT
\`\`\`

## Order

### Créer une commande

\`\`\`gherkin
Scenario: Commande réussie
  Given une cliente avec un panier de 2 articles
  When elle passe commande
  Then une Order est créée avec status PENDING
  And le stock est réservé
  And elle reçoit une notification

Scenario: Rollback si stock insuffisant
  Given un panier avec 2 articles dont 1 en rupture
  When elle passe commande
  Then la requête échoue avec 422 INSUFFICIENT_STOCK
  And aucun stock n'est réservé
  And aucune Order n'est créée
\`\`\`

### Payer une commande

\`\`\`gherkin
Scenario: Paiement Orange Money réussi
  Given une Order PENDING
  When le webhook Orange Money confirme le paiement
  Then l'Order passe à PAID
  And le stock est commité (quantity -= qty, reserved -= qty)
  And un email de confirmation est envoyé

Scenario: Webhook idempotent
  Given une Order déjà PAID
  When le même webhook est appelé à nouveau
  Then l'Order reste PAID
  And aucun stock n'est décrémenté à nouveau
\`\`\`

### Annuler une commande

\`\`\`gherkin
Scenario: Annulation avant paiement
  Given une Order PENDING
  When la cliente annule
  Then l'Order passe à CANCELLED
  And le stock est libéré

Scenario: Refus d'annulation après expédition
  Given une Order SHIPPED
  When la cliente tente d'annuler
  Then la requête échoue avec 422 INVALID_PRODUCT_STATE
\`\`\`

## Review

\`\`\`gherkin
Scenario: Laisser un avis après livraison
  Given une Order DELIVERED
  When la cliente laisse un avis 5 étoiles
  Then l'avis est créé avec isVerifiedPurchase=true
  And le professionnel reçoit une notification

Scenario: Refus d'avis sur commande non livrée
  Given une Order PENDING
  When la cliente tente de laisser un avis
  Then la requête échoue avec 422 INVALID_PRODUCT_STATE

Scenario: Un seul avis par commande
  Given une Order DELIVERED avec un avis existant
  When la cliente tente de laisser un second avis
  Then la requête échoue avec 409 DUPLICATE_REVIEW
\`\`\`

## Service (Phase 2)

\`\`\`gherkin
Scenario: Demander un devis
  Given une cliente
  And un service "Réparation de meuble"
  When elle demande un devis avec description
  Then un Quote est créé avec status PENDING
  And le professionnel reçoit une notification

Scenario: Accepter un devis crée une réservation
  Given un Quote avec status RESPONDED
  When la cliente accepte le devis
  Then un Booking est créé avec status CONFIRMED
  And le Quote passe à CONVERTED

Scenario: Refus si créneau déjà réservé
  Given un créneau déjà pris
  When la cliente accepte le devis pour ce créneau
  Then la requête échoue avec 409 BOOKING_CONFLICT
\`\`\`

## Non-fonctionnels

\`\`\`gherkin
Scenario: Temps de réponse API
  Given 100 requêtes POST /catalog/products
  When elles sont exécutées en séquence
  Then 95% ont une latence < 500ms

Scenario: Uptime
  Given une période de 30 jours
  When le service est monitoré en continu
  Then l'uptime est ≥ 99.5%

Scenario: Sécurité ownership
  Given un professionnel A et un professionnel B
  When A tente de modifier un produit de B
  Then la requête échoue avec 403 UNAUTHORIZED_STORE
  And l'action est loggée
\`\`\`

## Matrice de couverture

| Domaine | Scénarios | Statut |
|---|---|---|
| Auth | 5 | 🟡 |
| Catalog | 10 | ✅ |
| Order | 8 | ❌ |
| Service | 4 | ❌ P2 |
| Review | 4 | ❌ |
| Non-fonctionnels | 3 | 🟡 |

${footer("0.2.0", defaultChanges())}
`;

/* ================================================================
 * FICHIERS — VAGUE 4 (05-data, 06-api)
 * ================================================================ */

FILES["05-data/data-architecture.md"] = `
${header("Architecture des données", "05-data")}

## Principes

1. **PostgreSQL 16** — Source de vérité unique
2. **Prisma 7** — ORM typé avec adapter PG
3. **Migrations versionnées** — Jamais de modification manuelle en prod
4. **Contraintes DB** — Défense en profondeur pour les invariants critiques
5. **Isolation Serializable** — Pour les écritures critiques

## Topologie

\`\`\`
┌──────────────────────────────────────────────────────────┐
│                    APPLICATION                            │
│                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│  │  Service │───►│  Prisma  │───►│ Adapter  │            │
│  │  (logique│    │  Client  │    │   PG     │            │
│  │  métier) │    │          │    │          │            │
│  └──────────┘    └──────────┘    └────┬─────┘            │
│                                        │                  │
└────────────────────────────────────────┼──────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────┐
│                  PostgreSQL 16                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │  Schéma    │  │  Schéma    │  │  Schéma    │          │
│  │  public    │  │  audit     │  │  analytics │          │
│  │  (données  │  │  (traces)  │  │  (agrégats)│          │
│  │  métier)   │  │            │  │            │          │
│  └────────────┘  └────────────┘  └────────────┘          │
└──────────────────────────────────────────────────────────┘
\`\`\`

## Modèle de données par contexte

### Identity

\`\`\`
User ──┬──► ProfessionalProfile ──┬──► Store
       │                          │
       │                          └──► Service (Phase 2)
       │
       ├──► Address
       ├──► Notification
       ├──► Order
       ├──► Quote (Phase 2)
       ├──► Booking (Phase 2)
       └──► Review
\`\`\`

### Catalog

\`\`\`
Store ──► Product ──┬──► ProductVariant ──► Inventory
                    │
                    ├──► ProductImage
                    │
                    └──► Inventory
\`\`\`

### Order

\`\`\`
Order ──┬──► OrderItem
        ├──► OrderStatusHistory
        ├──► Payment ──► Transaction
        ├──► Delivery
        └──► Review
\`\`\`

### Service (Phase 2)

\`\`\`
Service ──┬──► ServiceImage
          ├──► ServiceZone
          ├──► Availability
          ├──► Quote ──┬──► QuoteResponse
          │            └──► Booking
          └──► Review
\`\`\`

## Stratégie de migration

### Règles

1. **Une migration = un changement cohérent**
2. **Toujours réversible** ou documentée comme destructive
3. **Testée en staging** avant prod
4. **Rétrocompatible** — ne casse pas le code en cours
5. **Versionnée** dans Git

### Ordre d'application

\`\`\`
1. Migration DB (additive uniquement)
2. Déploiement code
3. Vérification
4. Migration de nettoyage (drop, rename)
\`\`\`

### Types de migrations

| Type | Exemple | Risque |
|---|---|---|
| **Additive** | ADD COLUMN nullable | Faible |
| **Backfill** | UPDATE data | Moyen |
| **Constraint** | ADD CHECK | Moyen |
| **Rename** | RENAME COLUMN | Élevé |
| **Drop** | DROP COLUMN | Critique |

### Stratégie pour les migrations critiques

**Rename column** (3 étapes) :
1. Ajouter nouvelle colonne nullable
2. Backfill depuis l'ancienne
3. Drop l'ancienne après vérification

## Contraintes DB critiques

### Unicité

\`\`\`sql
-- SKU unique global
ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);

-- Slug unique par store
ALTER TABLE products
  ADD CONSTRAINT products_store_slug_key UNIQUE (store_id, slug);

-- XOR Inventory
ALTER TABLE inventory
  ADD CONSTRAINT inventory_owner_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  );

-- reserved <= quantity
ALTER TABLE inventory
  ADD CONSTRAINT inventory_reserved_check
  CHECK (reserved >= 0 AND reserved <= quantity);
\`\`\`

### Index

\`\`\`sql
-- Lookup rapide
CREATE INDEX products_store_id_idx ON products (store_id);
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX product_variants_product_id_idx ON product_variants (product_id);

-- Recherche full-text (à venir)
CREATE INDEX products_search_idx ON products
  USING GIN (to_tsvector('french', name || ' ' || coalesce(description, '')));
\`\`\`

## Transactions

### Niveaux d'isolation utilisés

| Cas | Niveau |
|---|---|
| Lectures simples | Read Committed |
| Création produit + variantes | Serializable |
| Création commande + réservation | Serializable |
| Commit paiement | Serializable |
| Calcul de stats | Read Committed |

### Retry automatique

\`\`\`typescript
async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (!isSerializationConflict || attempt >= maxAttempts) {
        throw error;
      }

      const delay =
        Math.min(100 * 2 ** attempt, 2000) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
\`\`\`

## Audit

### Tables d'audit

\`\`\`prisma
model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  actorId    String?  @map("actor_id") @db.Uuid
  action     String   @db.VarChar(100)
  entityType String   @map("entity_type") @db.VarChar(50)
  entityId   String   @map("entity_id") @db.Uuid
  metadata   Json?
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")
}
\`\`\`

### Actions tracées

- Toutes les actions ADMIN
- Créations/suppressions sensibles
- Modifications de permissions
- Accès aux données personnelles

## Sauvegarde et restauration

### Stratégie

| Type | Fréquence | Rétention |
|---|---|---|
| **Full backup** | Quotidien (2h) | 30 jours |
| **WAL archiving** | Continu | 7 jours |
| **Snapshot S3** | Hebdomadaire | 90 jours |

### RTO / RPO

| Métrique | Cible |
|---|---|
| RTO (Recovery Time) | 1h |
| RPO (Recovery Point) | 5 min |

### Drill de restauration

**Trimestriel** — Restauration complète sur environnement isolé.

## Croissance et partitioning

### Seuils de partitioning

| Table | Seuil | Stratégie |
|---|---|---|
| Order | 10M lignes | Par mois |
| OrderItem | 50M lignes | Avec Order |
| AuditLog | 100M lignes | Par mois |
| Notification | 50M lignes | Par mois |

### Archive

- Données > 2 ans archivées sur S3
- Accès via API dédiée
- Suppression après 10 ans (légal)

## Sécurité des données

### Chiffrement

| Couche | Méthode |
|---|---|
| En transit | TLS 1.3 |
| Au repos (DB) | AES-256 (managed) |
| Sauvegardes | AES-256 |
| PII sensible | Chiffrement applicatif (Phase 2) |

### Row-Level Security (Phase 2)

Pour les tables multi-tenant :
\`\`\`sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
\`\`\`

## Monitoring DB

### Métriques clés

| Métrique | Seuil d'alerte |
|---|---|
| Connexions actives | > 80% du pool |
| Requêtes lentes (> 1s) | > 10/min |
| Deadlocks | > 0 |
| Replication lag | > 30s |
| Taille DB | > 80% disque |

### Requêtes lentes

\`\`\`sql
CREATE EXTENSION pg_stat_statements;
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
\`\`\`

${footer("0.2.0", defaultChanges())}
`;

FILES["05-data/database-schema.md"] = `
${header("Schéma de base de données", "05-data")}

## Vue d'ensemble

Le schéma PostgreSQL complet, avec les contraintes critiques,
les index et les règles métier garanties au niveau DB.

## Tables principales

### users

\`\`\`sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  phone           VARCHAR(20),
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_status_check
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED'))
);

CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_status_idx ON users (status);
\`\`\`

### professional_profiles

\`\`\`sql
CREATE TABLE professional_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES users(id),
  business_name        VARCHAR(200) NOT NULL,
  slug                 VARCHAR(200) NOT NULL UNIQUE,
  description          TEXT,
  verification_status  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  verified_at          TIMESTAMPTZ,
  phone                VARCHAR(20),
  email                VARCHAR(255),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT professional_profiles_status_check
    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  CONSTRAINT professional_profiles_verified_at_check
    CHECK (
      (verification_status = 'VERIFIED' AND verified_at IS NOT NULL)
      OR verification_status != 'VERIFIED'
    )
);
\`\`\`

### stores

\`\`\`sql
CREATE TABLE stores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES professional_profiles(id),
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(200) NOT NULL UNIQUE,
  description       TEXT,
  logo_key          VARCHAR(500),
  banner_key        VARCHAR(500),
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT stores_status_check
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'))
);

CREATE INDEX stores_professional_id_idx ON stores (professional_id);
CREATE INDEX stores_status_idx ON stores (status);
\`\`\`

### categories

\`\`\`sql
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id  UUID NOT NULL REFERENCES verticals(id),
  parent_id    UUID REFERENCES categories(id),
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(200) NOT NULL,
  type         VARCHAR(20) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_type_check
    CHECK (type IN ('PRODUCT', 'SERVICE')),
  CONSTRAINT categories_no_self_parent
    CHECK (parent_id IS NULL OR parent_id != id),
  CONSTRAINT categories_vertical_slug_unique
    UNIQUE (vertical_id, slug)
);

CREATE INDEX categories_parent_id_idx ON categories (parent_id);
\`\`\`

### products

\`\`\`sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id),
  category_id     UUID REFERENCES categories(id),
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(200) NOT NULL,
  sku             VARCHAR(100),
  description     TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  has_variants    BOOLEAN NOT NULL DEFAULT FALSE,
  price           DECIMAL(12, 2),
  currency        VARCHAR(3) NOT NULL DEFAULT 'XOF',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_store_slug_unique
    UNIQUE (store_id, slug),
  CONSTRAINT products_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'INACTIVE', 'ARCHIVED')),
  CONSTRAINT products_price_check
    CHECK (
      (has_variants = TRUE AND price IS NULL)
      OR
      (has_variants = FALSE AND price IS NOT NULL AND price > 0)
    )
);

CREATE INDEX products_store_id_idx ON products (store_id);
CREATE INDEX products_category_id_idx ON products (category_id);
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX products_created_at_idx ON products (created_at DESC);
\`\`\`

### product_variants

\`\`\`sql
CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        VARCHAR(180) NOT NULL,
  sku         VARCHAR(100) UNIQUE,
  price       DECIMAL(12, 2) NOT NULL,
  currency    VARCHAR(3) NOT NULL DEFAULT 'XOF',
  attributes  JSONB,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_variants_price_check
    CHECK (price > 0)
);

CREATE INDEX product_variants_product_id_idx ON product_variants (product_id);
CREATE INDEX product_variants_sku_idx ON product_variants (sku);
\`\`\`

### product_images

\`\`\`sql
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  object_key  VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX product_images_product_id_idx ON product_images (product_id);

-- Un seul primaire par produit
CREATE UNIQUE INDEX product_images_primary_unique
  ON product_images (product_id)
  WHERE is_primary = TRUE;
\`\`\`

### inventory

\`\`\`sql
CREATE TABLE inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity    INT NOT NULL DEFAULT 0,
  reserved    INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inventory_owner_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  ),
  CONSTRAINT inventory_quantity_check
    CHECK (quantity >= 0 AND reserved >= 0 AND reserved <= quantity)
);

CREATE INDEX inventory_quantity_idx ON inventory (quantity);
\`\`\`

### orders

\`\`\`sql
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  store_id          UUID NOT NULL REFERENCES stores(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  total_amount      DECIMAL(12, 2) NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'XOF',
  delivery_address  TEXT NOT NULL,
  delivery_fee      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes             TEXT,
  canceled_at       TIMESTAMPTZ,
  refunded_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_status_check
    CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
  CONSTRAINT orders_total_amount_check
    CHECK (total_amount >= 0),
  CONSTRAINT orders_canceled_at_check
    CHECK (
      (status = 'CANCELLED' AND canceled_at IS NOT NULL)
      OR status != 'CANCELLED'
    )
);

CREATE INDEX orders_user_id_idx ON orders (user_id);
CREATE INDEX orders_store_id_idx ON orders (store_id);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);
\`\`\`

### order_items

\`\`\`sql
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  variant_id    UUID REFERENCES product_variants(id),
  product_name  VARCHAR(200) NOT NULL,
  variant_name  VARCHAR(180),
  quantity      INT NOT NULL,
  unit_price    DECIMAL(12, 2) NOT NULL,
  subtotal      DECIMAL(12, 2) NOT NULL,

  CONSTRAINT order_items_xor_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  ),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_prices_check
    CHECK (unit_price >= 0 AND subtotal >= 0)
);

CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);
CREATE INDEX order_items_variant_id_idx ON order_items (variant_id);
\`\`\`

### order_status_history

\`\`\`sql
CREATE TABLE order_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status  VARCHAR(20) NOT NULL,
  to_status    VARCHAR(20) NOT NULL,
  changed_by   UUID REFERENCES users(id),
  reason       TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT order_status_history_transition_check
    CHECK (from_status != to_status)
);

CREATE INDEX order_status_history_order_id_idx ON order_status_history (order_id);
\`\`\`

### payments

\`\`\`sql
CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID UNIQUE REFERENCES orders(id),
  booking_id    UUID UNIQUE REFERENCES bookings(id),
  amount        DECIMAL(12, 2) NOT NULL,
  currency      VARCHAR(3) NOT NULL DEFAULT 'XOF',
  status        VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  provider      VARCHAR(50),
  provider_ref  VARCHAR(255) UNIQUE,
  paid_at       TIMESTAMPTZ,
  refunded_at   TIMESTAMPTZ,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payments_xor_check CHECK (
    (order_id IS NOT NULL AND booking_id IS NULL)
    OR
    (order_id IS NULL AND booking_id IS NOT NULL)
  ),
  CONSTRAINT payments_status_check
    CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
  CONSTRAINT payments_amount_check CHECK (amount >= 0)
);

CREATE INDEX payments_order_id_idx ON payments (order_id);
CREATE INDEX payments_status_idx ON payments (status);
CREATE INDEX payments_provider_ref_idx ON payments (provider_ref);
\`\`\`

### transactions

\`\`\`sql
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID NOT NULL REFERENCES payments(id),
  type          VARCHAR(20) NOT NULL,
  amount        DECIMAL(12, 2) NOT NULL,
  provider_ref  VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT transactions_type_check
    CHECK (type IN ('CHARGE', 'REFUND', 'REVERSAL')),
  CONSTRAINT transactions_amount_check CHECK (amount >= 0)
);

CREATE INDEX transactions_payment_id_idx ON transactions (payment_id);
\`\`\`

### reviews

\`\`\`sql
CREATE TABLE reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  rating                INT NOT NULL,
  comment               TEXT,
  product_id            UUID REFERENCES products(id),
  service_id            UUID REFERENCES services(id),
  store_id              UUID REFERENCES stores(id),
  professional_id       UUID REFERENCES professional_profiles(id),
  order_id              UUID UNIQUE REFERENCES orders(id),
  booking_id            UUID UNIQUE REFERENCES bookings(id),
  is_verified_purchase  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reviews_rating_check
    CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT reviews_target_check CHECK (
    product_id IS NOT NULL
    OR service_id IS NOT NULL
    OR store_id IS NOT NULL
    OR professional_id IS NOT NULL
  )
);

CREATE INDEX reviews_product_id_idx ON reviews (product_id);
CREATE INDEX reviews_service_id_idx ON reviews (service_id);
CREATE INDEX reviews_store_id_idx ON reviews (store_id);
CREATE INDEX reviews_professional_id_idx ON reviews (professional_id);
CREATE INDEX reviews_created_at_idx ON reviews (created_at DESC);
\`\`\`

### addresses

\`\`\`sql
CREATE TABLE addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         VARCHAR(50),
  line1         VARCHAR(255) NOT NULL,
  line2         VARCHAR(255),
  city          VARCHAR(100) NOT NULL,
  region        VARCHAR(100),
  country       VARCHAR(2) NOT NULL DEFAULT 'ML',
  postal_code   VARCHAR(20),
  phone         VARCHAR(20),
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX addresses_user_id_idx ON addresses (user_id);

-- Une seule adresse par défaut par user
CREATE UNIQUE INDEX addresses_default_unique
  ON addresses (user_id)
  WHERE is_default = TRUE;
\`\`\`

### notifications

\`\`\`sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  channel     VARCHAR(20) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  metadata    JSONB,
  read_at     TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notifications_channel_check
    CHECK (channel IN ('EMAIL', 'SMS', 'PUSH', 'IN_APP'))
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_read_at_idx ON notifications (read_at);
CREATE INDEX notifications_created_at_idx ON notifications (created_at DESC);
\`\`\`

### idempotency_keys

\`\`\`sql
CREATE TABLE idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             VARCHAR(255) NOT NULL,
  scope           VARCHAR(150) NOT NULL,
  user_id         UUID REFERENCES users(id),
  request_hash    VARCHAR(64) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
  response_status INT,
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,

  CONSTRAINT idempotency_keys_unique UNIQUE (key, scope),
  CONSTRAINT idempotency_keys_status_check
    CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX idempotency_keys_expires_at_idx ON idempotency_keys (expires_at);
\`\`\`

### audit_logs

\`\`\`sql
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    UUID NOT NULL,
  metadata     JSONB,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_logs_actor_id_idx ON audit_logs (actor_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
\`\`\`

## Tables Phase 2 (services)

### services

\`\`\`sql
CREATE TABLE services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES professional_profiles(id),
  category_id       UUID REFERENCES categories(id),
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(200) NOT NULL UNIQUE,
  description       TEXT,
  pricing_model     VARCHAR(20) NOT NULL,
  base_price        DECIMAL(12, 2),
  currency          VARCHAR(3) NOT NULL DEFAULT 'XOF',
  duration_minutes  INT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT services_pricing_model_check
    CHECK (pricing_model IN ('QUOTE', 'FIXED', 'HOURLY')),
  CONSTRAINT services_base_price_check CHECK (
    (pricing_model IN ('FIXED', 'HOURLY') AND base_price IS NOT NULL AND base_price > 0)
    OR
    (pricing_model = 'QUOTE')
  )
);

CREATE INDEX services_professional_id_idx ON services (professional_id);
CREATE INDEX services_category_id_idx ON services (category_id);
\`\`\`

### service_images

\`\`\`sql
CREATE TABLE service_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  object_key  VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX service_images_primary_unique
  ON service_images (service_id)
  WHERE is_primary = TRUE;
\`\`\`

### service_zones

\`\`\`sql
CREATE TABLE service_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  city        VARCHAR(100),
  region      VARCHAR(100),
  radius_km   INT,

  CONSTRAINT service_zones_check CHECK (
    city IS NOT NULL OR region IS NOT NULL OR radius_km IS NOT NULL
  )
);
\`\`\`

### availabilities

\`\`\`sql
CREATE TABLE availabilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  day_of_week    INT,
  start_time     VARCHAR(5),
  end_time       VARCHAR(5),
  specific_date  DATE,
  is_recurring   BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT availabilities_day_check
    CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT availabilities_recurring_check CHECK (
    (is_recurring = TRUE AND day_of_week IS NOT NULL
      AND start_time IS NOT NULL AND end_time IS NOT NULL
      AND start_time < end_time)
    OR
    (is_recurring = FALSE AND specific_date IS NOT NULL)
  )
);
\`\`\`

### quotes

\`\`\`sql
CREATE TABLE quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  service_id      UUID NOT NULL REFERENCES services(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  description     TEXT NOT NULL,
  address         TEXT,
  preferred_date  TIMESTAMPTZ,
  budget          DECIMAL(12, 2),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT quotes_status_check
    CHECK (status IN ('PENDING', 'RESPONDED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'))
);

CREATE INDEX quotes_user_id_idx ON quotes (user_id);
CREATE INDEX quotes_service_id_idx ON quotes (service_id);
CREATE INDEX quotes_status_idx ON quotes (status);
\`\`\`

### quote_responses

\`\`\`sql
CREATE TABLE quote_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id          UUID NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES professional_profiles(id),
  proposed_price    DECIMAL(12, 2) NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'XOF',
  message           TEXT,
  proposed_date     TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT quote_responses_price_check CHECK (proposed_price >= 0)
);
\`\`\`

### bookings

\`\`\`sql
CREATE TABLE bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  service_id    UUID NOT NULL REFERENCES services(id),
  quote_id      UUID UNIQUE REFERENCES quotes(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration      INT,
  address       TEXT,
  total_amount  DECIMAL(12, 2) NOT NULL,
  currency      VARCHAR(3) NOT NULL DEFAULT 'XOF',
  notes         TEXT,
  completed_at  TIMESTAMPTZ,
  canceled_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bookings_status_check
    CHECK (status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  CONSTRAINT bookings_unique_slot UNIQUE (service_id, scheduled_at)
);

CREATE INDEX bookings_user_id_idx ON bookings (user_id);
CREATE INDEX bookings_service_id_idx ON bookings (service_id);
CREATE INDEX bookings_scheduled_at_idx ON bookings (scheduled_at);
\`\`\`

## Résumé des contraintes

| Table | Contraintes critiques |
|---|---|
| users | email unique, status valide |
| products | slug unique par store, price cohérent, status valide |
| product_variants | sku unique global, price > 0 |
| product_images | 1 seul primaire par produit (partial index) |
| inventory | XOR owner, reserved ≤ quantity |
| orders | status valide, canceled_at cohérent |
| order_items | XOR product/variant, quantity > 0 |
| payments | XOR order/booking, status valide, provider_ref unique |
| reviews | rating 1-5, au moins 1 cible |
| addresses | 1 seul défaut par user (partial index) |
| idempotency_keys | (key, scope) unique |
| services | pricing_model cohérent |
| bookings | créneau unique (service_id, scheduled_at) |

${footer("0.2.0", defaultChanges())}
`;

FILES["05-data/entity-relationship.md"] = `
${header("Diagramme entité-relation", "05-data")}

## Mermaid ER global

\`\`\`mermaid
erDiagram
    User ||--o| ProfessionalProfile : has
    User ||--o{ Address : owns
    User ||--o{ Notification : receives
    User ||--o{ Order : places
    User ||--o{ Quote : requests
    User ||--o{ Booking : books
    User ||--o{ Review : writes

    ProfessionalProfile ||--o{ Store : owns
    ProfessionalProfile ||--o{ Service : offers
    ProfessionalProfile ||--o{ QuoteResponse : responds
    ProfessionalProfile ||--o{ Review : receives

    Store ||--o{ Product : contains
    Store ||--o{ Order : receives
    Store ||--o{ Review : rated

    Category ||--o{ Product : classifies
    Category ||--o{ Service : classifies

    Product ||--o{ ProductVariant : has
    Product ||--o{ ProductImage : has
    Product ||--o| Inventory : has
    Product ||--o{ Review : reviewed

    ProductVariant ||--o| Inventory : has

    Service ||--o{ ServiceImage : has
    Service ||--o{ ServiceZone : covers
    Service ||--o{ Availability : has
    Service ||--o{ Quote : receives
    Service ||--o{ Booking : booked
    Service ||--o{ Review : reviewed

    Order ||--o{ OrderItem : contains
    Order ||--o{ OrderStatusHistory : tracks
    Order ||--o| Payment : paid_by
    Order ||--o| Delivery : shipped_by
    Order ||--o| Review : has

    OrderItem }o--|| Product : references
    OrderItem }o--|| ProductVariant : references

    Quote ||--o| QuoteResponse : has
    Quote ||--o| Booking : converts_to

    Booking ||--o| Payment : paid_by
    Booking ||--o| Review : has

    Payment ||--o{ Transaction : has

    Review ||--o{ ReviewReport : reported
\`\`\`

## Détails par contexte

### Identity

\`\`\`mermaid
erDiagram
    User ||--o| ProfessionalProfile : has
    User ||--o{ UserRoleAssignment : has
    Role ||--o{ UserRoleAssignment : assigned
    Role ||--o{ RolePermission : has
    Permission ||--o{ RolePermission : granted

    User {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        string status
    }

    ProfessionalProfile {
        uuid id PK
        uuid userId FK
        string businessName
        string slug UK
        string verificationStatus
    }

    Role {
        uuid id PK
        string code UK
        string name
    }

    Permission {
        uuid id PK
        string code UK
        string resource
        string action
    }
\`\`\`

### Catalog

\`\`\`mermaid
erDiagram
    Store ||--o{ Product : contains
    Category ||--o{ Product : classifies
    Product ||--o{ ProductVariant : has
    Product ||--o{ ProductImage : has
    Product ||--o| Inventory : has
    ProductVariant ||--o| Inventory : has

    Product {
        uuid id PK
        uuid storeId FK
        uuid categoryId FK
        string name
        string slug
        string sku
        string status
        boolean hasVariants
        decimal price
        string currency
    }

    ProductVariant {
        uuid id PK
        uuid productId FK
        string name
        string sku UK
        decimal price
        boolean isActive
    }

    ProductImage {
        uuid id PK
        uuid productId FK
        string objectKey
        int sortOrder
        boolean isPrimary
    }

    Inventory {
        uuid id PK
        uuid productId FK
        uuid variantId FK
        int quantity
        int reserved
    }
\`\`\`

### Order

\`\`\`mermaid
erDiagram
    User ||--o{ Order : places
    Store ||--o{ Order : receives
    Order ||--o{ OrderItem : contains
    Order ||--o{ OrderStatusHistory : tracks
    Order ||--o| Payment : paid
    Order ||--o| Delivery : shipped
    Order ||--o| Review : reviewed
    OrderItem }o--|| Product : references
    OrderItem }o--|| ProductVariant : references
    Payment ||--o{ Transaction : has
\`\`\`

### Service (Phase 2)

\`\`\`mermaid
erDiagram
    ProfessionalProfile ||--o{ Service : offers
    Service ||--o{ ServiceImage : has
    Service ||--o{ ServiceZone : covers
    Service ||--o{ Availability : has
    Service ||--o{ Quote : receives
    Service ||--o{ Booking : booked
    Quote ||--o| QuoteResponse : has
    Quote ||--o| Booking : converts
    Booking ||--o| Payment : paid
\`\`\`

## Cardinalités

| Relation | Cardinalité | Contrainte |
|---|---|---|
| User → ProfessionalProfile | 1-0..1 | 1 profil par user |
| User → Address | 1-N | N adresses |
| User → Order | 1-N | Historique |
| ProfessionalProfile → Store | 1-N | Plusieurs boutiques |
| Store → Product | 1-N | Catalogue |
| Product → ProductVariant | 1-N | Si hasVariants |
| Product → ProductImage | 1-N | Plusieurs images |
| Product → Inventory | 1-0..1 | Si produit simple |
| ProductVariant → Inventory | 1-0..1 | Une par variante |
| Order → OrderItem | 1-N | Lignes |
| Order → Payment | 1-0..1 | Un paiement |
| Order → Delivery | 1-0..1 | Une livraison |
| Order → Review | 1-0..1 | Un avis |
| Service → Quote | 1-N | Demandes |
| Quote → Booking | 1-0..1 | Conversion |
| Booking → Payment | 1-0..1 | Un paiement |

## Relations critiques

### XOR contraintes

| Table | Contrainte |
|---|---|
| inventory | product_id XOR variant_id |
| order_items | product_id XOR variant_id |
| payments | order_id XOR booking_id |

### Unicité

| Table | Contrainte |
|---|---|
| users | email |
| professional_profiles | user_id, slug |
| stores | slug |
| products | (store_id, slug) |
| product_variants | sku |
| payments | provider_ref |
| reviews | order_id, booking_id |
| idempotency_keys | (key, scope) |
| bookings | (service_id, scheduled_at) |

### Index partiels

| Table | Index | Condition |
|---|---|---|
| product_images | unique (product_id) | WHERE is_primary = TRUE |
| service_images | unique (service_id) | WHERE is_primary = TRUE |
| addresses | unique (user_id) | WHERE is_default = TRUE |

## Cardinalités par volume

| Table | Volume An 1 | Volume An 3 |
|---|---|---|
| users | 2 000 | 60 000 |
| professional_profiles | 100 | 2 000 |
| stores | 120 | 2 500 |
| products | 2 000 | 50 000 |
| product_variants | 8 000 | 200 000 |
| product_images | 10 000 | 300 000 |
| inventory | 8 000 | 200 000 |
| orders | 5 000 | 200 000 |
| order_items | 15 000 | 600 000 |
| payments | 4 500 | 180 000 |
| reviews | 1 000 | 60 000 |
| notifications | 20 000 | 1 000 000 |
| audit_logs | 50 000 | 5 000 000 |

## Décisions de modélisation

1. **UUID partout** — Pas d'IDs auto-incrémentés exposés (IDOR)
2. **Soft delete via status** — Pas de suppression physique
3. **Snapshot dans OrderItem** — Préserver l'historique
4. **Index partiels** — Pour les unicités conditionnelles
5. **CHECK constraints** — Pour les invariants critiques
6. **Audit séparé** — Table \`audit_logs\` indépendante

${footer("0.2.0", defaultChanges())}
`;

FILES["05-data/data-dictionary.md"] = `
${header("Dictionnaire de données", "05-data")}

## Format

Chaque entrée spécifie : table, colonne, type, contraintes,
description, et exemple.

## users

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| email | VARCHAR(255) | UNIQUE NOT NULL | Email |
| password_hash | VARCHAR(255) | NOT NULL | Hash bcrypt |
| first_name | VARCHAR(100) | — | Prénom |
| last_name | VARCHAR(100) | — | Nom |
| phone | VARCHAR(20) | — | Téléphone |
| status | VARCHAR(20) | NOT NULL | ACTIVE / SUSPENDED / DELETED |
| email_verified | BOOLEAN | NOT NULL | Email confirmé |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## products

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| store_id | UUID | FK stores | Boutique |
| category_id | UUID | FK categories | Catégorie |
| name | VARCHAR(200) | NOT NULL | Nom |
| slug | VARCHAR(200) | UNIQUE(store_id) | Slug URL |
| sku | VARCHAR(100) | — | SKU produit simple |
| description | TEXT | — | Description |
| status | VARCHAR(20) | NOT NULL | DRAFT / ACTIVE / OUT_OF_STOCK / INACTIVE / ARCHIVED |
| has_variants | BOOLEAN | NOT NULL | Mode variantes |
| price | DECIMAL(12,2) | NULL | Prix (null si variantes) |
| currency | VARCHAR(3) | NOT NULL | XOF / EUR / USD |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## product_variants

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| product_id | UUID | FK products | Produit parent |
| name | VARCHAR(180) | NOT NULL | Nom variante |
| sku | VARCHAR(100) | UNIQUE | SKU global |
| price | DECIMAL(12,2) | NOT NULL | Prix |
| currency | VARCHAR(3) | NOT NULL | Devise |
| attributes | JSONB | — | Attributs (taille, couleur) |
| is_active | BOOLEAN | NOT NULL | Active |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

### Exemple attributes

\`\`\`json
{
  "size": "42",
  "color": "Rouge",
  "material": "Coton"
}
\`\`\`

## product_images

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| product_id | UUID | FK products | Produit |
| object_key | VARCHAR(500) | NOT NULL | Clé S3 |
| alt_text | VARCHAR(255) | — | Texte alternatif |
| sort_order | INT | NOT NULL | Ordre |
| is_primary | BOOLEAN | NOT NULL | Primaire |
| created_at | TIMESTAMPTZ | NOT NULL | Création |

## inventory

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| product_id | UUID | FK UNIQUE | Produit (XOR) |
| variant_id | UUID | FK UNIQUE | Variante (XOR) |
| quantity | INT | NOT NULL | Stock total |
| reserved | INT | NOT NULL | Stock réservé |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## orders

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| user_id | UUID | FK users | Client |
| store_id | UUID | FK stores | Boutique |
| status | VARCHAR(20) | NOT NULL | Statut |
| total_amount | DECIMAL(12,2) | NOT NULL | Total |
| currency | VARCHAR(3) | NOT NULL | Devise |
| delivery_address | TEXT | NOT NULL | Adresse |
| delivery_fee | DECIMAL(12,2) | NOT NULL | Frais |
| notes | TEXT | — | Notes |
| canceled_at | TIMESTAMPTZ | — | Annulation |
| refunded_at | TIMESTAMPTZ | — | Remboursement |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## order_items

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| order_id | UUID | FK orders | Commande |
| product_id | UUID | FK products (XOR) | Produit |
| variant_id | UUID | FK product_variants (XOR) | Variante |
| product_name | VARCHAR(200) | NOT NULL | Snapshot nom |
| variant_name | VARCHAR(180) | — | Snapshot variante |
| quantity | INT | NOT NULL | Quantité |
| unit_price | DECIMAL(12,2) | NOT NULL | Snapshot prix |
| subtotal | DECIMAL(12,2) | NOT NULL | Sous-total |

## payments

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| order_id | UUID | FK UNIQUE (XOR) | Commande |
| booking_id | UUID | FK UNIQUE (XOR) | Réservation |
| amount | DECIMAL(12,2) | NOT NULL | Montant |
| currency | VARCHAR(3) | NOT NULL | Devise |
| status | VARCHAR(30) | NOT NULL | Statut |
| provider | VARCHAR(50) | — | ORANGE_MONEY / WAVE |
| provider_ref | VARCHAR(255) | UNIQUE | Ref provider |
| paid_at | TIMESTAMPTZ | — | Paiement |
| refunded_at | TIMESTAMPTZ | — | Remboursement |
| metadata | JSONB | — | Métadonnées |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## reviews

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| user_id | UUID | FK users | Auteur |
| rating | INT | NOT NULL | Note 1-5 |
| comment | TEXT | — | Commentaire |
| product_id | UUID | FK products | Cible |
| service_id | UUID | FK services | Cible |
| store_id | UUID | FK stores | Cible |
| professional_id | UUID | FK professionals | Cible |
| order_id | UUID | FK UNIQUE | Commande |
| booking_id | UUID | FK UNIQUE | Réservation |
| is_verified_purchase | BOOLEAN | NOT NULL | Achat vérifié |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## addresses

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| user_id | UUID | FK users | Propriétaire |
| label | VARCHAR(50) | — | Libellé |
| line1 | VARCHAR(255) | NOT NULL | Adresse 1 |
| line2 | VARCHAR(255) | — | Adresse 2 |
| city | VARCHAR(100) | NOT NULL | Ville |
| region | VARCHAR(100) | — | Région |
| country | VARCHAR(2) | NOT NULL | Pays (ML) |
| postal_code | VARCHAR(20) | — | Code postal |
| phone | VARCHAR(20) | — | Téléphone |
| is_default | BOOLEAN | NOT NULL | Défaut |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## notifications

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| user_id | UUID | FK users | Destinataire |
| type | VARCHAR(50) | NOT NULL | Type |
| channel | VARCHAR(20) | NOT NULL | EMAIL/SMS/PUSH/IN_APP |
| title | VARCHAR(255) | NOT NULL | Titre |
| body | TEXT | NOT NULL | Corps |
| metadata | JSONB | — | Métadonnées |
| read_at | TIMESTAMPTZ | — | Lu à |
| sent_at | TIMESTAMPTZ | — | Envoyé à |
| created_at | TIMESTAMPTZ | NOT NULL | Création |

## Types énumérés

### User.status

- \`ACTIVE\` — Actif
- \`SUSPENDED\` — Suspendu
- \`DELETED\` — Supprimé

### Product.status

- \`DRAFT\` — Brouillon
- \`ACTIVE\` — Publié
- \`OUT_OF_STOCK\` — Rupture
- \`INACTIVE\` — Désactivé
- \`ARCHIVED\` — Archivé

### Order.status

- \`PENDING\` — En attente de paiement
- \`PAID\` — Payée
- \`SHIPPED\` — Expédiée
- \`DELIVERED\` — Livrée
- \`CANCELLED\` — Annulée
- \`REFUNDED\` — Remboursée

### Payment.status

- \`PENDING\` — En attente
- \`PROCESSING\` — En cours
- \`PAID\` — Payé
- \`FAILED\` — Échec
- \`REFUNDED\` — Remboursé
- \`PARTIALLY_REFUNDED\` — Partiel

### Store.status

- \`PENDING\` — En attente de validation
- \`ACTIVE\` — Actif
- \`SUSPENDED\` — Suspendu
- \`CLOSED\` — Fermé

### Review target

Une review doit avoir au moins un des :
- \`product_id\`
- \`service_id\`
- \`store_id\`
- \`professional_id\`

## Règles de validation

### users.email

- Format email valide
- Max 255 caractères
- Lowercase

### products.slug

- Min 3 caractères
- Max 200 caractères
- Regex : \`^[a-z0-9]+(?:-[a-z0-9]+)*$\`

### products.price

- \`> 0\` si \`has_variants = false\`
- \`NULL\` si \`has_variants = true\`

### product_variants.sku

- Max 100 caractères
- Uppercase
- Caractères : \`[A-Z0-9-_]\`

### reviews.rating

- Entier entre 1 et 5

### addresses.country

- Code ISO 3166-1 alpha-2
- Défaut : \`ML\`

## Champs sensibles

| Champ | Sensibilité | Traitement |
|---|---|---|
| password_hash | Critique | Hash bcrypt, jamais exposé |
| provider_ref | Haute | Chiffré si possible |
| ip_address | Haute | Rétention 30 jours |
| user_agent | Moyenne | Rétention 30 jours |
| phone | Moyenne | Masquage partiel dans les logs |

${footer("0.2.0", defaultChanges())}
`;

FILES["05-data/indexing-strategy.md"] = `
${header("Stratégie d'indexation", "05-data")}

## Principes

1. **Index sur les colonnes de filtre fréquent** — status, dates
2. **Index sur les FK** — pour les joins
3. **Index composites** — quand plusieurs colonnes sont filtrées ensemble
4. **Index partiels** — pour les unicités conditionnelles
5. **Index GIN** — pour les recherches JSONB et full-text
6. **Ne pas sur-indexer** — chaque index a un coût en écriture

## Index critiques

### users

\`\`\`sql
CREATE UNIQUE INDEX users_email_idx ON users (email);
CREATE INDEX users_status_idx ON users (status);
CREATE INDEX users_created_at_idx ON users (created_at DESC);
\`\`\`

**Justification** :
- \`email\` : lookup à chaque login
- \`status\` : filtrage admin
- \`created_at\` : tri récent

### professional_profiles

\`\`\`sql
CREATE UNIQUE INDEX professional_profiles_user_id_idx
  ON professional_profiles (user_id);
CREATE UNIQUE INDEX professional_profiles_slug_idx
  ON professional_profiles (slug);
CREATE INDEX professional_profiles_status_idx
  ON professional_profiles (verification_status);
\`\`\`

### stores

\`\`\`sql
CREATE UNIQUE INDEX stores_slug_idx ON stores (slug);
CREATE INDEX stores_professional_id_idx ON stores (professional_id);
CREATE INDEX stores_status_idx ON stores (status);
\`\`\`

### products

\`\`\`sql
-- Unicité slug par store
CREATE UNIQUE INDEX products_store_slug_idx
  ON products (store_id, slug);

-- Lookup par store
CREATE INDEX products_store_id_idx ON products (store_id);

-- Filtrage par catégorie
CREATE INDEX products_category_id_idx ON products (category_id);

-- Filtrage par statut (critique pour la visibilité)
CREATE INDEX products_status_idx ON products (status);

-- Tri par date
CREATE INDEX products_created_at_idx ON products (created_at DESC);

-- Recherche full-text
CREATE INDEX products_search_idx ON products
  USING GIN (to_tsvector('french',
    coalesce(name, '') || ' ' || coalesce(description, '')));

-- Recherche par SKU
CREATE INDEX products_sku_idx ON products (sku) WHERE sku IS NOT NULL;
\`\`\`

### product_variants

\`\`\`sql
CREATE UNIQUE INDEX product_variants_sku_idx
  ON product_variants (sku) WHERE sku IS NOT NULL;
CREATE INDEX product_variants_product_id_idx
  ON product_variants (product_id);
CREATE INDEX product_variants_is_active_idx
  ON product_variants (product_id, is_active);
\`\`\`

### product_images

\`\`\`sql
CREATE INDEX product_images_product_id_idx
  ON product_images (product_id);

-- Un seul primaire par produit (partial unique)
CREATE UNIQUE INDEX product_images_primary_unique
  ON product_images (product_id)
  WHERE is_primary = TRUE;

-- Tri par ordre
CREATE INDEX product_images_sort_idx
  ON product_images (product_id, sort_order);
\`\`\`

### inventory

\`\`\`sql
CREATE UNIQUE INDEX inventory_product_id_idx
  ON inventory (product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX inventory_variant_id_idx
  ON inventory (variant_id) WHERE variant_id IS NOT NULL;

-- Pour les recherches de stock bas
CREATE INDEX inventory_quantity_idx ON inventory (quantity);
\`\`\`

### orders

\`\`\`sql
-- Lookup par user
CREATE INDEX orders_user_id_idx ON orders (user_id);

-- Lookup par store
CREATE INDEX orders_store_id_idx ON orders (store_id);

-- Filtrage par statut (dashboard)
CREATE INDEX orders_status_idx ON orders (status);

-- Tri récent
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);

-- Requêtes composites fréquentes
CREATE INDEX orders_user_status_idx ON orders (user_id, status);
CREATE INDEX orders_store_status_idx ON orders (store_id, status);
\`\`\`

### order_items

\`\`\`sql
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE INDEX order_items_product_id_idx ON order_items (product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX order_items_variant_id_idx ON order_items (variant_id)
  WHERE variant_id IS NOT NULL;
\`\`\`

### order_status_history

\`\`\`sql
CREATE INDEX order_status_history_order_id_idx
  ON order_status_history (order_id);
CREATE INDEX order_status_history_changed_at_idx
  ON order_status_history (order_id, changed_at DESC);
\`\`\`

### payments

\`\`\`sql
CREATE INDEX payments_order_id_idx ON payments (order_id)
  WHERE order_id IS NOT NULL;
CREATE INDEX payments_booking_id_idx ON payments (booking_id)
  WHERE booking_id IS NOT NULL;
CREATE INDEX payments_status_idx ON payments (status);
CREATE UNIQUE INDEX payments_provider_ref_idx
  ON payments (provider_ref) WHERE provider_ref IS NOT NULL;
\`\`\`

### reviews

\`\`\`sql
CREATE INDEX reviews_user_id_idx ON reviews (user_id);
CREATE INDEX reviews_product_id_idx ON reviews (product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX reviews_service_id_idx ON reviews (service_id)
  WHERE service_id IS NOT NULL;
CREATE INDEX reviews_store_id_idx ON reviews (store_id)
  WHERE store_id IS NOT NULL;
CREATE INDEX reviews_professional_id_idx ON reviews (professional_id)
  WHERE professional_id IS NOT NULL;
CREATE INDEX reviews_created_at_idx ON reviews (created_at DESC);
\`\`\`

### addresses

\`\`\`sql
CREATE INDEX addresses_user_id_idx ON addresses (user_id);

-- Un seul défaut par user (partial unique)
CREATE UNIQUE INDEX addresses_default_unique
  ON addresses (user_id)
  WHERE is_default = TRUE;
\`\`\`

### notifications

\`\`\`sql
CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_user_read_idx
  ON notifications (user_id, read_at);
CREATE INDEX notifications_created_at_idx
  ON notifications (created_at DESC);
\`\`\`

### idempotency_keys

\`\`\`sql
CREATE UNIQUE INDEX idempotency_keys_key_scope_idx
  ON idempotency_keys (key, scope);
CREATE INDEX idempotency_keys_expires_at_idx
  ON idempotency_keys (expires_at);

-- Pour la purge opportuniste
CREATE INDEX idempotency_keys_status_idx
  ON idempotency_keys (status, expires_at);
\`\`\`

### audit_logs

\`\`\`sql
CREATE INDEX audit_logs_actor_id_idx ON audit_logs (actor_id);
CREATE INDEX audit_logs_entity_idx
  ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_action_idx ON audit_logs (action);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
\`\`\`

## Index Phase 2

### services

\`\`\`sql
CREATE UNIQUE INDEX services_slug_idx ON services (slug);
CREATE INDEX services_professional_id_idx
  ON services (professional_id);
CREATE INDEX services_category_id_idx
  ON services (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX services_is_active_idx ON services (is_active);
\`\`\`

### bookings

\`\`\`sql
CREATE INDEX bookings_user_id_idx ON bookings (user_id);
CREATE INDEX bookings_service_id_idx ON bookings (service_id);
CREATE INDEX bookings_scheduled_at_idx
  ON bookings (scheduled_at);
CREATE UNIQUE INDEX bookings_unique_slot
  ON bookings (service_id, scheduled_at);
\`\`\`

## Requêtes lentes à surveiller

### 1. Liste paginée produits par store + status

\`\`\`sql
SELECT * FROM products
WHERE store_id = $1 AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;
\`\`\`

**Index** : \`products_store_id_idx\` + \`products_status_idx\`

### 2. Réservation de stock (critique)

\`\`\`sql
UPDATE inventory
SET reserved = reserved + $1
WHERE id = $2
  AND quantity - reserved >= $1
RETURNING id;
\`\`\`

**Index** : \`inventory_product_id_idx\` ou \`inventory_variant_id_idx\`

### 3. Liste des commandes d'un client

\`\`\`sql
SELECT * FROM orders
WHERE user_id = $1 AND status != 'CANCELLED'
ORDER BY created_at DESC;
\`\`\`

**Index** : \`orders_user_status_idx\`

### 4. Dashboard boutique

\`\`\`sql
SELECT status, count(*) FROM orders
WHERE store_id = $1
GROUP BY status;
\`\`\`

**Index** : \`orders_store_status_idx\`

### 5. Détection des doublons SKU

\`\`\`sql
SELECT id FROM product_variants WHERE sku = $1;
\`\`\`

**Index** : \`product_variants_sku_idx\`

## Index manquants à surveiller

Pour identifier les index manquants :

\`\`\`sql
SELECT
  schemaname, tablename, attname, n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;
\`\`\`

## Analyse de performance

### Activer pg_stat_statements

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
\`\`\`

### Top 10 requêtes lentes

\`\`\`sql
SELECT
  substring(query, 1, 60) AS query_preview,
  calls,
  mean_exec_time::numeric(10, 2) AS avg_ms,
  total_exec_time::numeric(10, 2) AS total_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 10;
\`\`\`

### Index inutilisés

\`\`\`sql
SELECT
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename;
\`\`\`

## Impact des index sur les écritures

| Table | Nb index | Impact |
|---|---|---|
| users | 3 | Faible |
| products | 6 | Moyen (beaucoup d'écritures) |
| product_variants | 3 | Moyen |
| inventory | 3 | Élevé (UPDATE fréquent) |
| orders | 6 | Moyen |
| order_items | 3 | Faible |
| payments | 4 | Faible |
| reviews | 6 | Faible |
| notifications | 3 | Faible |

## Stratégie de maintenance

### VACUUM / ANALYZE

Automatique via PostgreSQL autovacuum.

### REINDEX périodique

Pour les tables à fort UPDATE (inventory, orders) :
\`\`\`sql
REINDEX TABLE CONCURRENTLY inventory;
\`\`\`

**Fréquence** : trimestrielle.

### Détection de bloat

\`\`\`sql
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
\`\`\`

${footer("0.2.0", defaultChanges())}
`;

FILES["06-api/api-overview.md"] = `
${header("Vue d'ensemble de l'API", "06-api")}

## Base URL

| Environnement | URL |
|---|---|
| Local | http://localhost:3000/api/v1 |
| Staging | https://staging.demepro.ml/api/v1 |
| Production | https://api.demepro.ml/api/v1 |

## Versionnement

**Stratégie** : préfixe URL (\`/api/v1/\`).

**Politique** : une version reste supportée 12 mois après dépréciation.

## Format de réponse

### Succès

\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

### Succès paginé

\`\`\`json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "limit": 20,
    "nextCursor": "uuid-or-null",
    "hasMore": true
  }
}
\`\`\`

### Erreur

\`\`\`json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Produit introuvable.",
    "statusCode": 404,
    "details": [ ... ]
  }
}
\`\`\`

## Endpoints par module

### Auth

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/register | Non | Inscription |
| POST | /auth/login | Non | Connexion |
| POST | /auth/refresh | Non | Renouvellement token |
| POST | /auth/logout | Oui | Déconnexion |
| GET | /me | Oui | Profil |

### Catalog — Products

| Méthode | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | /catalog/products | Oui | catalog.product.create |
| POST | /catalog/products/full | Oui | catalog.product.create |
| GET | /catalog/products | Non | — |
| GET | /catalog/products/store/:storeId | Oui | catalog.product.read.own |
| GET | /catalog/products/:id | Non | — |
| PATCH | /catalog/products/:id | Oui | catalog.product.update |
| POST | /catalog/products/:id/activate | Oui | catalog.product.activate |
| POST | /catalog/products/:id/enable-variants | Oui | catalog.product.update |
| POST | /catalog/products/:id/disable-variants | Oui | catalog.product.update |
| DELETE | /catalog/products/:id | Oui | catalog.product.archive |
| DELETE | /catalog/products/:id/hard | Oui | catalog.product.delete |

### Catalog — Variants

| Méthode | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | /catalog/products/:productId/variants | Oui | catalog.variant.create |
| GET | /catalog/products/:productId/variants | Non | — |
| GET | /catalog/variants/:id | Non | — |
| PATCH | /catalog/variants/:id | Oui | catalog.variant.update |
| DELETE | /catalog/variants/:id | Oui | catalog.variant.delete |
| POST | /catalog/variants/:id/activate | Oui | catalog.variant.activate |
| POST | /catalog/variants/:id/deactivate | Oui | catalog.variant.deactivate |

### Catalog — Images

| Méthode | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | /catalog/products/:productId/images | Oui | catalog.image.create |
| GET | /catalog/products/:productId/images | Non | — |
| POST | /catalog/products/:productId/images/reorder | Oui | catalog.image.reorder |
| GET | /catalog/images/:id | Non | — |
| PATCH | /catalog/images/:id | Oui | catalog.image.update |
| DELETE | /catalog/images/:id | Oui | catalog.image.delete |

### Catalog — Inventory

| Méthode | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | /catalog/inventory/product/:productId | Oui | catalog.inventory.update |
| POST | /catalog/inventory/variant/:variantId | Oui | catalog.inventory.update |
| GET | /catalog/inventory/:id | Oui | catalog.inventory.read |
| PATCH | /catalog/inventory/:id | Oui | catalog.inventory.update |
| POST | /catalog/inventory/:id/adjust | Oui | catalog.inventory.adjust |

### Store (à implémenter)

| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /stores | Oui |
| GET | /stores/me | Oui |
| GET | /stores/:slug | Non |
| PATCH | /stores/:id | Oui |
| POST | /stores/:id/activate | Oui (admin) |
| POST | /stores/:id/suspend | Oui (admin) |

### Order (à implémenter)

| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /orders | Oui |
| GET | /orders | Oui |
| GET | /orders/:id | Oui |
| POST | /orders/:id/pay | Oui |
| POST | /orders/:id/cancel | Oui |
| POST | /orders/:id/ship | Oui (pro) |
| POST | /orders/:id/deliver | Oui (pro) |

### Review (à implémenter)

| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /reviews | Oui |
| GET | /reviews | Non |
| PATCH | /reviews/:id | Oui |
| DELETE | /reviews/:id | Oui |
| POST | /reviews/:id/report | Oui |

## Headers standards

| Header | Valeurs | Usage |
|---|---|---|
| Authorization | Bearer {token} | Auth |
| Content-Type | application/json | Body |
| Idempotency-Key | string | Créations sensibles |
| X-Test-User-Id | UUID | Tests uniquement (NODE_ENV=test) |

## Codes HTTP

| Code | Usage |
|---|---|
| 200 | Succès lecture/update |
| 201 | Création réussie |
| 204 | Suppression (sans body) |
| 400 | Validation Zod échouée |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource introuvable |
| 409 | Conflit (slug, SKU, idempotence) |
| 422 | État invalide |
| 429 | Rate limit dépassé |
| 500 | Erreur interne |
| 503 | Service indisponible |

## Pagination

### Curseur (recommandé)

\`\`\`
GET /resources?limit=20&cursor=<lastId>
\`\`\`

**Avantages** : stable, performant sur grandes collections.

### Offset (déprécié)

\`\`\`
GET /resources?page=2&limit=20
\`\`\`

## Filtrage

\`\`\`
GET /catalog/products?status=ACTIVE&storeId=xxx
\`\`\`

## Tri

\`\`\`
GET /catalog/products?sort=createdAt:desc
\`\`\`

## Recherche

\`\`\`
GET /catalog/products?q=robe
\`\`\`

**Implémentation** : full-text PostgreSQL (à venir).

## Rate limiting

| Endpoint | Limite |
|---|---|
| POST /auth/login | 5 / 15 min / IP |
| POST /auth/register | 3 / h / IP |
| POST /catalog/products | 60 / min / user |
| POST /orders | 10 / min / user |
| Global | 1000 / min / IP |

**Header de réponse** :
\`\`\`
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1700000000
\`\`\`

## Idempotence

### Endpoints supportés

- \`POST /catalog/products\`
- \`POST /catalog/products/full\`
- \`POST /catalog/products/:productId/variants\`
- \`POST /orders\`
- \`POST /payments\`

### Usage

\`\`\`http
POST /catalog/products
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ ... }
\`\`\`

**Réponse** : identique pour la même clé + même payload.
**Conflit** : 409 \`IDEMPOTENCY_CONFLICT\` si payload différent.

## Authentification

### JWT Bearer

\`\`\`http
GET /me
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
\`\`\`

### Tokens

| Token | Durée | Usage |
|---|---|---|
| Access | 15 min | Requêtes API |
| Refresh | 7 jours | Renouvellement |

### Rafraîchissement

\`\`\`http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "..." }
\`\`\`

## Documentation

- **OpenAPI 3.1** : \`/docs/openapi.yaml\`
- **Swagger UI** : \`/docs\` (dev/staging uniquement)
- **Postman** : collection exportable

## Exemples

### Créer un produit simple

\`\`\`bash
curl -X POST https://api.demepro.ml/api/v1/catalog/products \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "storeId": "550e8400-e29b-41d4-a716-446655440000",
    "categoryId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Robe wax",
    "slug": "robe-wax",
    "hasVariants": false,
    "price": 15000,
    "currency": "XOF"
  }'
\`\`\`

### Créer un produit à variantes

\`\`\`bash
curl -X POST https://api.demepro.ml/api/v1/catalog/products/full \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "storeId": "...",
    "categoryId": "...",
    "name": "Chaussure homme",
    "slug": "chaussure-homme",
    "hasVariants": true,
    "currency": "XOF",
    "variants": [
      { "name": "41", "sku": "CH-41", "price": 15000, "inventory": 10 },
      { "name": "42", "sku": "CH-42", "price": 15000, "inventory": 8 }
    ],
    "images": [
      { "objectKey": "products/chaussure.jpg", "isPrimary": true }
    ]
  }'
\`\`\`

${footer("0.2.0", defaultChanges())}
`;

FILES["06-api/errors.md"] = `
${header("Erreurs API", "06-api")}

## Format standard

\`\`\`json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SKU",
    "message": "Le SKU \"CH-41\" est déjà utilisé.",
    "statusCode": 409,
    "details": { "sku": "CH-41" }
  }
}
\`\`\`

## Catalogue complet des codes

### 400 — Validation

| Code | Description | Exemple |
|---|---|---|
| \`VALIDATION_ERROR\` | Validation Zod échouée | Body invalide |
| \`INVALID_UUID\` | UUID malformé | Param invalide |
| \`INVALID_QUERY\` | Query string invalide | Filtre invalide |

### 401 — Authentification

| Code | Description |
|---|---|
| \`UNAUTHENTICATED\` | Token manquant ou invalide |
| \`TOKEN_EXPIRED\` | Token JWT expiré |
| \`INVALID_CREDENTIALS\` | Email/password incorrect |
| \`EMAIL_NOT_VERIFIED\` | Email non confirmé |

### 403 — Autorisation

| Code | Description |
|---|---|
| \`UNAUTHORIZED\` | Permission manquante |
| \`UNAUTHORIZED_STORE\` | Non propriétaire de la ressource |
| \`STORE_NOT_ACTIVE\` | Boutique suspendue |
| \`PRO_ACCOUNT_REQUIRED\` | Rôle insuffisant |
| \`VERIFICATION_REQUIRED\` | KYC manquant |

### 404 — Ressource introuvable

| Code | Description |
|---|---|
| \`PRODUCT_NOT_FOUND\` | Produit inexistant |
| \`PRODUCT_VARIANT_NOT_FOUND\` | Variante inexistante |
| \`PRODUCT_IMAGE_NOT_FOUND\` | Image inexistante |
| \`INVENTORY_NOT_FOUND\` | Inventaire inexistant |
| \`STORE_NOT_FOUND\` | Boutique inexistante |
| \`CATEGORY_NOT_FOUND\` | Catégorie inexistante |
| \`ORDER_NOT_FOUND\` | Commande inexistante |
| \`PAYMENT_NOT_FOUND\` | Paiement inexistant |
| \`REVIEW_NOT_FOUND\` | Avis inexistant |
| \`USER_NOT_FOUND\` | Utilisateur inexistant |
| \`PROFESSIONAL_NOT_FOUND\` | Professionnel inexistant |

### 409 — Conflit

| Code | Description |
|---|---|
| \`DUPLICATE_SLUG\` | Slug déjà utilisé |
| \`DUPLICATE_SKU\` | SKU déjà utilisé |
| \`DUPLICATE_EMAIL\` | Email déjà utilisé |
| \`DUPLICATE_REVIEW\` | Avis déjà laissé |
| \`IDEMPOTENCY_CONFLICT\` | Clé utilisée avec payload différent |
| \`IDEMPOTENCY_IN_PROGRESS\` | Clé en cours de traitement |
| \`BOOKING_CONFLICT\` | Créneau déjà réservé |

### 422 — État invalide

| Code | Description |
|---|---|
| \`INVALID_PRODUCT_STATE\` | État du produit incompatible |
| \`INVALID_INVENTORY_QUANTITY\` | Quantité invalide |
| \`PRODUCT_HAS_NO_VARIANTS\` | Opération nécessite hasVariants=true |
| \`VARIANTS_EXIST\` | Impossible de désactiver les variantes |
| \`LAST_ACTIVE_VARIANT\` | Dernière variante active |
| \`INSUFFICIENT_STOCK\` | Stock insuffisant |
| \`INVALID_ORDER_STATE\` | Transition de statut invalide |
| \`INVALID_PAYMENT_STATE\` | État de paiement incompatible |
| \`QUOTE_EXPIRED\` | Devis expiré |
| \`REFUND_WINDOW_EXPIRED\` | Délai de remboursement dépassé |

### 429 — Rate limit

| Code | Description |
|---|---|
| \`RATE_LIMIT_EXCEEDED\` | Trop de requêtes |

### 500 — Erreur interne

| Code | Description |
|---|---|
| \`INTERNAL_ERROR\` | Erreur serveur non gérée |
| \`DATABASE_ERROR\` | Erreur PostgreSQL |

### 503 — Indisponible

| Code | Description |
|---|---|
| \`SERVICE_UNAVAILABLE\` | Maintenance ou surcharge |
| \`PAYMENT_PROVIDER_UNAVAILABLE\` | Provider down |

## Implémentation

### Hiérarchie des erreurs

\`\`\`typescript
// Base
class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Catalog
class CatalogError extends AppError {
  constructor(code: CatalogErrorCode, message: string, statusCode = 400) {
    super(code, message, statusCode);
  }
}

// Order (Phase 2)
class OrderError extends AppError { /* ... */ }
\`\`\`

### Codes centralisés

\`\`\`typescript
// apps/api/src/modules/catalog/errors/catalog-error.ts
export const CatalogErrorCode = {
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  // ...
} as const;

const STATUS_BY_CODE: Record<CatalogErrorCode, number> = {
  PRODUCT_NOT_FOUND: 404,
  UNAUTHORIZED_STORE: 403,
  DUPLICATE_SKU: 409,
  // ...
};
\`\`\`

### Mapping Prisma → Catalog

\`\`\`typescript
export function mapCatalogPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");

      if (target.includes("sku")) {
        throw new CatalogError(
          CatalogErrorCode.DUPLICATE_SKU,
          "Ce SKU est déjà utilisé.",
        );
      }
      if (target.includes("slug")) {
        throw new CatalogError(
          CatalogErrorCode.DUPLICATE_SLUG,
          "Ce slug est déjà utilisé.",
        );
      }
      if (target.includes("email")) {
        throw new CatalogError(
          CatalogErrorCode.DUPLICATE_EMAIL,
          "Cet email est déjà utilisé.",
        );
      }
    }

    if (error.code === "P2034") {
      throw new CatalogError(
        CatalogErrorCode.INTERNAL_ERROR,
        "Conflit de transaction, veuillez réessayer.",
      );
    }
  }

  throw error;
}
\`\`\`

### Error handler global

\`\`\`typescript
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // CatalogError
  if (error instanceof CatalogError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      },
    });
    return;
  }

  // ZodError
  if (error && typeof error === "object" && "name" in error
    && (error as any).name === "ZodError") {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Les données fournies sont invalides.",
        statusCode: 400,
        details: (error as any).issues,
      },
    });
    return;
  }

  // Fallback
  console.error("[errorHandler] Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Erreur interne.",
      statusCode: 500,
    },
  });
}
\`\`\`

## Bonnes pratiques

### 1. Jamais de message technique exposé

\`\`\`typescript
// ❌ Faux
throw new Error("Prisma P2002: Duplicate key on product_variants.sku");

// ✅ Correct
throw new CatalogError(
  CatalogErrorCode.DUPLICATE_SKU,
  "Le SKU \"CH-41\" est déjà utilisé.",
);
\`\`\`

### 2. Code stable et documenté

Chaque code doit :
- Être documenté dans ce fichier
- Avoir un mapping status HTTP
- Avoir un test

### 3. Détails optionnels

\`\`\`typescript
throw new CatalogError(
  CatalogErrorCode.DUPLICATE_SKU,
  \`Le SKU "\${sku}" est déjà utilisé.\`,
  409,
  { sku, field: "sku" },
);
\`\`\`

### 4. Idempotence des erreurs

Une même erreur doit toujours avoir le même code.

### 5. Ne pas masquer les erreurs critiques

Les erreurs internes doivent être loggées, pas silencieuses.

## Tests

Chaque code d'erreur doit avoir un test :

\`\`\`typescript
it("retourne 404 PRODUCT_NOT_FOUND", async () => {
  const res = await api.get("/catalog/products/00000000-0000-0000-0000-000000000000");
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
});
\`\`\`

## Tableau récapitulatif

| Code HTTP | Nb codes | Exemples |
|---|---|---|
| 400 | 3 | VALIDATION_ERROR, INVALID_UUID |
| 401 | 4 | UNAUTHENTICATED, TOKEN_EXPIRED |
| 403 | 5 | UNAUTHORIZED, UNAUTHORIZED_STORE |
| 404 | 11 | PRODUCT_NOT_FOUND, ORDER_NOT_FOUND |
| 409 | 7 | DUPLICATE_SKU, IDEMPOTENCY_CONFLICT |
| 422 | 10 | INVALID_PRODUCT_STATE, INSUFFICIENT_STOCK |
| 429 | 1 | RATE_LIMIT_EXCEEDED |
| 500 | 2 | INTERNAL_ERROR, DATABASE_ERROR |
| 503 | 2 | SERVICE_UNAVAILABLE |
| **Total** | **45** | — |

${footer("0.2.0", defaultChanges())}
`;

/* ================================================================
 * FICHIERS — VAGUE 5 (04-architecture, 10-decisions, 12-roadmap)
 * ================================================================ */

FILES["04-architecture/component-view.md"] = `
${header("C4 — Component View (API)", "04-architecture")}

## Vue d'ensemble

L'API est organisée en **modules faiblement couplés** (modular
monolith). Chaque module a ses contrôleurs, services, repositories,
DTOs et erreurs.

## Structure des modules

\`\`\`
apps/api/
├── modules/
│   ├── auth/
│   ├── rbac/
│   ├── catalog/
│   ├── store/
│   ├── category/
│   ├── order/
│   ├── payment/
│   ├── service/        (Phase 2)
│   ├── quote/          (Phase 2)
│   ├── booking/        (Phase 2)
│   ├── review/
│   └── notification/
│
├── shared/
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── require-permission.ts
│   │   ├── validate.ts
│   │   └── error-handler.ts
│   ├── errors/
│   │   └── app-error.ts
│   ├── utils/
│   │   ├── with-serializable-retry.ts
│   │   └── req-user.ts
│   └── types/
│       └── auth-context.ts
│
└── infrastructure/
    ├── database/
    │   └── prisma.ts
    └── logger/
        └── logger.ts
\`\`\`

## Structure d'un module

\`\`\`
module/
├── controllers/          # Handlers HTTP
│   └── xxx.controller.ts
├── services/            # Logique métier
│   └── xxx.service.ts
├── repositories/        # Accès données
│   └── xxx.repository.ts
├── dtos/                # Schémas Zod + types
│   └── xxx.dto.ts
├── errors/              # Erreurs spécifiques
│   └── xxx-error.ts
├── routes/              # Wiring Express
│   └── xxx.routes.ts
└── domain/              # (optionnel) Logique pure
    └── state-machines.ts
\`\`\`

## Diagramme des composants

\`\`\`
                    ┌──────────────────────────────────┐
                    │          Express App              │
                    └───────────────┬──────────────────┘
                                    │
                    ┌───────────────┼──────────────────┐
                    │               │                  │
                    ▼               ▼                  ▼
            ┌──────────┐    ┌──────────┐        ┌──────────┐
            │ Middleware│    │  Routes  │        │  Error   │
            │ (auth,   │    │  (wiring)│        │ Handler  │
            │  validate)│    └────┬─────┘        └──────────┘
            └──────────┘         │
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │Controller│  │Controller│  │Controller│
            └────┬─────┘  └────┬─────┘  └────┬─────┘
                 │             │             │
                 └─────────────┼─────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ Service  │ │ Service  │ │ Service  │
            │ (logique)│ │(logique) │ │(logique) │
            └────┬─────┘ └────┬─────┘ └────┬─────┘
                 │            │            │
                 └────────────┼────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │Repository│ │Repository│ │Repository│
            └────┬─────┘ └────┬─────┘ └────┬─────┘
                 │            │            │
                 └────────────┼────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Prisma Client  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    └──────────────────┘
\`\`\`

## Modules par contexte

### Identity

**auth**
- \`AuthController\` : register, login, refresh, logout
- \`AuthService\` : logique JWT, hashing, tokens
- \`AuthRepository\` : lookup users
- Routes : \`/auth/*\`

**rbac**
- \`RbacService\` : vérification permissions
- \`RbacRepository\` : lookup role/permission
- Middleware : \`requirePermission\`

### Catalog

**catalog** (produits)
- \`ProductController\` / \`ProductService\` / \`ProductRepository\`
- \`ProductVariantController\` / \`ProductVariantService\` / \`ProductVariantRepository\`
- \`ProductImageController\` / \`ProductImageService\` / \`ProductImageRepository\`
- \`InventoryController\` / \`InventoryService\` / \`InventoryRepository\`
- \`IdempotencyService\` : anti-double-soumission
- Routes : \`/catalog/*\`

### Store (à créer)

**store**
- \`StoreController\` / \`StoreService\` / \`StoreRepository\`
- Routes : \`/stores/*\`

### Order (à créer)

**order**
- \`OrderController\` / \`OrderService\` / \`OrderRepository\`
- \`OrderItemRepository\`
- \`OrderStatusHistoryRepository\`
- \`OrderStateMachine\` (domain)
- Routes : \`/orders/*\`

### Payment (à créer)

**payment**
- \`PaymentController\` / \`PaymentService\` / \`PaymentRepository\`
- \`PaymentProviderAdapter\` (Orange Money, Wave)
- \`WebhookController\` (réception webhooks)
- Routes : \`/payments/*\`, \`/webhooks/*\`

### Service (Phase 2)

**service**
- \`ServiceController\` / \`ServiceService\` / \`ServiceRepository\`
- Routes : \`/services/*\`

**quote**
- \`QuoteController\` / \`QuoteService\` / \`QuoteRepository\`
- Routes : \`/quotes/*\`

**booking**
- \`BookingController\` / \`BookingService\` / \`BookingRepository\`
- Routes : \`/bookings/*\`

### Transverse

**review**
- \`ReviewController\` / \`ReviewService\` / \`ReviewRepository\`
- Routes : \`/reviews/*\`

**notification**
- \`NotificationService\` : envoi email/SMS/push
- \`NotificationRepository\`
- \`EmailAdapter\`, \`SmsAdapter\`, \`PushAdapter\`
- Écoute les events métier

## Communication inter-modules

### Principe

- **Un module ne référence JAMAIS les modèles d'un autre module**
- Communication via **interfaces** (services publics)
- Ou via **events** (asynchrone, Phase 3)

### Exemples

\`\`\`typescript
// ✅ Order utilise InventoryService
import { InventoryService } from "../catalog/services/inventory.service";

class OrderService {
  constructor(private inventory: InventoryService) {}

  async createOrder(dto: CreateOrderDto, ctx: AuthContext) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await this.inventory.reserve(item.inventoryId, item.quantity, tx);
      }
      return this.orderRepository.create(...);
    });
  }
}

// ❌ Order n'importe PAS directement InventoryRepository
// ❌ Order n'accède PAS à tx.inventory directement (sauf dans son propre repo)
\`\`\`

## Couches

### Controller

**Responsabilité** : Décoder la requête HTTP, appeler le service,
formater la réponse.

**Ne fait JAMAIS** : logique métier, accès DB.

\`\`\`typescript
export class ProductController {
  constructor(private service: ProductService) {}

  create = async (req, res, next) => {
    try {
      const result = await this.service.createProduct(
        req.body,
        { userId: req.user.id },
        req.header("Idempotency-Key"),
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
\`\`\`

### Service

**Responsabilité** : Logique métier, transactions, règles.

**Ne fait JAMAIS** : HTTP.

\`\`\`typescript
export class ProductService {
  constructor(
    private prisma: PrismaClient,
    private repository: ProductRepository,
    private idempotency: IdempotencyService,
  ) {}

  async createProduct(dto, ctx, idempotencyKey?) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(async (tx) => {
        // logique métier
      }),
    );
  }
}
\`\`\`

### Repository

**Responsabilité** : Accès données (Prisma).

**Ne fait JAMAIS** : règles métier.

\`\`\`typescript
export class ProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string, tx = this.prisma) {
    return tx.product.findUnique({ where: { id } });
  }
}
\`\`\`

### Domain (optionnel)

**Responsabilité** : Logique pure (state machines, value objects).

\`\`\`typescript
// domain/state-machines.ts
export const PRODUCT_TRANSITIONS = { ... };

export function canTransition(from, to): boolean {
  return PRODUCT_TRANSITIONS[from].includes(to);
}
\`\`\`

## Middlewares

### authenticate

Vérifie JWT et injecte \`req.user\`.

### requirePermission

Vérifie la permission RBAC.

### validate

Valide body/params/query avec Zod.

### errorHandler

Convertit les erreurs en réponses JSON.

## Wiring des routes

\`\`\`typescript
// catalog.routes.ts
const repository = new ProductRepository(prisma);
const idempotency = new IdempotencyService(prisma);
const service = new ProductService(prisma, repository, idempotency);
const controller = new ProductController(service);

router.post(
  "/products",
  authenticate,
  requirePermission("catalog.product.create"),
  validate(createProductSchema, "body"),
  controller.create,
);
\`\`\`

## Tests par couche

| Couche | Type de test | Outil |
|---|---|---|
| Controller | E2E (supertest) | Vitest |
| Service | Intégration (DB) | Vitest + Testcontainers |
| Repository | Intégration (DB) | Vitest + Testcontainers |
| Domain | Unit | Vitest |
| Middleware | E2E | Vitest + supertest |

## État d'avancement

| Module | Controllers | Services | Repositories | Tests |
|---|---|---|---|---|
| auth | ✅ | ✅ | ✅ | ⚠️ |
| rbac | — | ✅ | ✅ | ⚠️ |
| catalog | ✅ | ✅ | ✅ | ✅ 142 |
| store | ❌ | ❌ | ❌ | ❌ |
| category | ❌ | ❌ | ❌ | ❌ |
| order | ❌ | ❌ | ❌ | ❌ |
| payment | ❌ | ❌ | ❌ | ❌ |
| service | ❌ | ❌ | ❌ | ❌ |
| quote | ❌ | ❌ | ❌ | ❌ |
| booking | ❌ | ❌ | ❌ | ❌ |
| review | ❌ | ❌ | ❌ | ❌ |
| notification | ❌ | ❌ | ❌ | ❌ |

## Décisions structurantes

1. **Un module = un dossier**
2. **Communication via services, pas via repositories**
3. **Transactions gérées par les services**
4. **Controllers sans logique**
5. **Repositories sans règles**
6. **Domain pour la logique pure**

${footer("0.2.0", defaultChanges())}
`;

FILES["04-architecture/runtime-view.md"] = `
${header("C4 — Runtime View", "04-architecture")}

## Introduction

Ce document décrit les **scénarios d'exécution** (runtime) des
opérations critiques du système, avec les transactions, les
interactions inter-modules, et les événements.

## Scénario 1 — Création de produit simple

\`\`\`
Client    API      Auth    Catalog   DB
  │        │        │        │      │
  ├──POST─►│        │        │      │
  │        │        │        │      │
  │        ├──verify─►       │      │
  │        │        │        │      │
  │        ├──create────────►│      │
  │        │        │        ├──BEGIN►
  │        │        │        ├──SELECT store
  │        │        │        ├──SELECT category
  │        │        │        ├──SELECT product (slug)
  │        │        │        ├──SELECT variant (sku)
  │        │        │        ├──INSERT product
  │        │        │        ├──COMMIT
  │        │        │        │      │
  │◄──201──┤        │        │      │
\`\`\`

**Temps** : ~200ms (p95)
**Transaction** : Serializable
**Retry** : 3 tentatives sur P2034

## Scénario 2 — Création de produit complet (atomique)

\`\`\`
Client    API      Catalog   DB
  │        │        │        │
  ├──POST─►│        │        │
  │        │        │        │
  │        ├──BEGIN TRANSACTION (Serializable)──►
  │        │        │        │
  │        │        ├──SELECT store (ownership)
  │        │        │        │
  │        │        ├──SELECT category
  │        │        │        │
  │        │        ├──SELECT product (slug unique)
  │        │        │        │
  │        │        ├──SELECT variants (SKU unique × N)
  │        │        │        │
  │        │        ├──INSERT product
  │        │        │        │
  │        │        ├──INSERT variants (× N)
  │        │        │        │
  │        │        ├──INSERT inventories (× N)
  │        │        │        │
  │        │        ├──INSERT images (× M)
  │        │        │        │
  │        ├──COMMIT─────────────────────────────►
  │        │        │        │
  │◄──201──┤        │        │
\`\`\`

**Temps** : ~400ms (p95) pour 5 variants + 3 images
**Transaction** : Serializable
**Timeout** : 15s
**Atomicité** : tout ou rien

## Scénario 3 — Création de commande (réservation stock)

\`\`\`
Client    Order    Catalog   DB
  │        │        │      │
  ├──POST─►│        │      │
  │        │        │      │
  │        ├──BEGIN TRANSACTION (Serializable)──►
  │        │        │      │
  │        │        │      │
  │        ├──for each item:───────────────────┐
  │        │        │      │                   │
  │        │        ├──reserveStock(id, qty)───┤
  │        │        │      │                   │
  │        │        │      ├──UPDATE inventory │
  │        │        │      │  SET reserved+=qty│
  │        │        │      │  WHERE qty-res>=qty
  │        │        │      │  RETURNING id     │
  │        │        │      │                   │
  │        │        │      ├──if 0 rows → ─────┐
  │        │        │      │  ROLLBACK         │
  │        │        │      │  throw INSUFFICIENT_STOCK
  │        │        │      │                   │
  │        ├──◄───────────────────────────────┘
  │        │        │      │
  │        ├──INSERT Order (PENDING)
  │        │        │      │
  │        ├──INSERT OrderItems (snapshot prix/nom)
  │        │        │      │
  │        ├──INSERT OrderStatusHistory
  │        │        │      │
  │        ├──COMMIT──────────────────────────►
  │        │        │      │
  ├──POST-COMMIT async──────────────────────────┐
  │        │        │      │                   │
  │        │        ├──sendNotification────────┤
  │        │        │      │                   │
  │◄──201──┤        │      │◄──────────────────┘
\`\`\`

**Temps** : ~500ms (p95) pour 3 articles
**Transaction** : Serializable
**Concurrence** : jusqu'à 10 réservations simultanées testées

## Scénario 4 — Paiement via Orange Money

\`\`\`
Client    Order    Payment   Provider   DB
  │        │        │        │         │
  ├──POST─►│        │        │         │
  │/pay    │        │        │         │
  │        │        │        │         │
  │        ├──createPayment─►│         │
  │        │        │        │         │
  │        │        ├──SELECT order    │
  │        │        │        │         │
  │        │        ├──INSERT Payment (PENDING)
  │        │        │        │         │
  │        │        ├──initiate────────►│
  │        │        │        │         │
  │◄──302──┤        │        │         │
  │Redirect  │        │        │         │
  │        │        │        │         │
  ├──Pay──►Orange Money      │         │
  │        │        │        │         │
  │        │        │        │         │
  │        │        │◄──webhook────────┤
  │        │        │        │         │
  │        │        ├──verify signature │
  │        │        │        │         │
  │        │        ├──BEGIN TRANSACTION──►
  │        │        │        │         │
  │        │        ├──for each item:─────┐
  │        │        │        │         │  │
  │        │        │        │         │  │
  │        │        ├──commitStock──────┤  │
  │        │        │        │         │  │
  │        │        │        │         │  │
  │        │        ├──UPDATE Order PAID│  │
  │        │        │        │         │  │
  │        │        ├──UPDATE Payment PAID
  │        │        │        │         │  │
  │        │        ├──COMMIT─────────────►
  │        │        │        │         │
  │        ├──POST-COMMIT (async)          │
  │        │        ├──sendEmail───────────┤
  │        │        ├──sendSms─────────────┤
  │        │        ├──notifyPro───────────┤
  │        │        │        │         │
  │        │        │◄──200──┤         │
  │        │        │        │         │
  │◄──200──┤        │        │         │
\`\`\`

**Idempotence** : webhook peut être appelé plusieurs fois sans effet
**Sécurité** : signature vérifiée
**Commit** : décrémente quantity ET reserved

## Scénario 5 — Annulation de commande

\`\`\`
Client    Order    Catalog   DB
  │        │        │      │
  ├──POST─►│        │      │
  │/cancel │        │      │
  │        │        │      │
  │        ├──BEGIN TRANSACTION (Serializable)──►
  │        │        │      │
  │        │        ├──SELECT Order
  │        │        │      │
  │        │        ├──verify status PENDING|PAID
  │        │        │      │
  │        │        ├──for each item:──────────┐
  │        │        │      │                   │
  │        │        ├──releaseStock(id, qty)───┤
  │        │        │      │                   │
  │        │        │      ├──UPDATE inventory │
  │        │        │      │  SET reserved-=qty│
  │        │        │      │  WHERE reserved>=qty
  │        │        │      │                   │
  │        ├──◄───────────────────────────────┘
  │        │        │      │
  │        ├──UPDATE Order CANCELLED
  │        │        │      │
  │        ├──if PAID: triggerRefund
  │        │        │      │
  │        ├──COMMIT──────────────────────────►
  │        │        │      │
  │        ├──POST-COMMIT async
  │        │        ├──sendEmail───────────────┐
  │        │        │      │                   │
  │◄──200──┤        │      │◄──────────────────┘
\`\`\`

## Scénario 6 — Concurrence sur réservation

**Situation** : 10 clients tentent simultanément de réserver
le dernier article (stock=1).

\`\`\`
Time  Client1   Client2   Client3   DB
  │     │         │         │       │
  T0    ├─reserve─┤         │       │
  │     │         ├─reserve─┤       │
  │     │         │         ├─reserve─┤
  │     │         │         │       │
  T1    │         │         │  ┌────┴────┐
  │     │         │         │  │Serilize │
  │     │         │         │  │ updates │
  │     │         │         │  └────┬────┘
  │     │         │         │       │
  T2    │◄──OK────┤         │       │
  │     │         │         │       │
  │     │         │◄──ERR───┤       │
  │     │         │ (stock=0)│      │
  │     │         │         │◄──ERR─┤
  │     │         │         │ (stock=0)
  │     │         │         │       │
\`\`\`

**Résultat** : exactement 1 réussite, 9 échecs INSUFFICIENT_STOCK
**Garantie** : SQL atomique + Serializable
**Test** : couvert (10 réservations simultanées)

## Scénario 7 — Idempotence (double clic)

\`\`\`
Client    API      Idempotency   DB
  │        │        │            │
  ├─POST──►│        │            │
  │key=K1  │        │            │
  │        ├──acquire(K1)───────►│
  │        │        │            │
  │        │        ├──INSERT (PROCESSING)
  │        │        │            │
  │        ├──process──────────► │
  │        │        │            │
  │        │        ├──INSERT product
  │        │        │            │
  │        │        ├──UPDATE (COMPLETED)
  │        │        │            │
  │◄──201──┤        │            │
  │        │        │            │
  ├─POST──►│        │            │
  │key=K1  │        │            │
  │        ├──acquire(K1)───────►│
  │        │        │            │
  │        │        │◄──COMPLETED─┤
  │        │        │            │
  │◄──201──┤  (réponse en cache) │
\`\`\`

**Résultat** : 1 seul produit créé, mêmes réponses
**TTL** : 24h

## Scénario 8 — Retry Serializable (P2034)

\`\`\`
Time  Service   DB
  │     │       │
  T0    ├─BEGIN─►│
  │     │       │
  │     ├─SELECT│
  │     │       │
  │     ├─UPDATE│
  │     │       │
  │     │◄─ERR──┤ P2034 (serialization conflict)
  │     │       │
  │     │ wait 200ms
  │     │       │
  T1    ├─BEGIN─►│
  │     │       │
  │     ├─SELECT│
  │     │       │
  │     ├─UPDATE│
  │     │       │
  │     ├─COMMIT│
  │     │       │
  │◄─OK─┤       │
\`\`\`

**Stratégie** : 3 tentatives, backoff exponentiel + jitter
**Timeout total** : ~10s max

## Transactions et isolation

| Scénario | Isolation | Timeout | Retry |
|---|---|---|---|
| Créer produit | Serializable | 15s | 3 |
| Créer commande | Serializable | 15s | 3 |
| Payer commande | Serializable | 15s | 3 |
| Annuler commande | Serializable | 15s | 3 |
| Réservation stock | — (SQL atomique) | — | — |
| Commit stock | — (SQL atomique) | — | — |
| Lecture | Read Committed | — | — |

## Événements post-commit

| Événement | Déclencheur | Consommateurs |
|---|---|---|
| OrderCreated | POST /orders | Notification, Analytics |
| OrderPaid | Webhook paiement | Notification, Analytics |
| OrderShipped | POST /ship | Notification |
| OrderDelivered | POST /deliver | Notification, Review (ouverture) |
| PaymentConfirmed | Webhook | Order, Notification |
| BookingConfirmed | POST /quotes/accept | Notification |

**Implémentation MVP** : enqueue asynchrone post-commit
**Implémentation Phase 3** : bus d'événements (Redis Streams)

## Performance observée

| Scénario | p50 | p95 | p99 |
|---|---|---|---|
| Créer produit simple | 100ms | 200ms | 400ms |
| Créer produit complet | 250ms | 400ms | 800ms |
| Créer commande | 300ms | 500ms | 1s |
| Payer commande | 400ms | 700ms | 1.5s |
| Lecture produit | 30ms | 80ms | 150ms |

## Optimisations prévues

1. **Cache Redis** pour les lectures fréquentes (produits publics)
2. **CDN** pour les images
3. **Index full-text** pour la recherche
4. **Vues matérialisées** pour les dashboards
5. **Read replicas** pour les lectures (Phase 3)

${footer("0.2.0", defaultChanges())}
`;

FILES["10-decisions/ADR-008-marketplace-hybride.md"] = `
# ADR-008 — Marketplace hybride (Produits + Services)

- **Date** : ${TODAY}
- **Statut** : Accepté
- **Décideurs** : Équipe produit et technique
- **Consultés** : —

## Contexte

DɛmɛPro a été initialement conçu comme une plateforme e-commerce
classique (vente de produits physiques). Après une première phase de
construction (module Catalog complet, 142 tests), une réflexion
stratégique a révélé un besoin plus large :

Le consommateur malien a **deux intentions fondamentales** :
1. **ACHETER** un produit tangible
2. **TROUVER** un professionnel pour un service

Ces deux intentions sont aujourd'hui traitées par des canaux
**séparés** (Facebook, WhatsApp, bouche-à-oreille, marchés
physiques), sans plateforme unifiée.

**Question** : devons-nous étendre DɛmɛPro pour couvrir les deux
flux, ou rester sur le seul flux produits ?

## Décision

**Nous adoptons une architecture de marketplace hybride.**

DɛmɛPro couvrira les **deux flux** :

### Flux ACHETER (produits)
- Catalogue de produits physiques
- Variantes, stock, images
- Commande, paiement, livraison
- Avis produits

### Flux TROUVER (services)
- Portfolio de professionnels
- Services avec tarification (fixe, horaire, devis)
- Demande de devis
- Réservation de créneau
- Avis services / professionnels

### Infrastructure commune
- **Identité** (User, Role, KYC)
- **Paiement** (Orange Money, Wave, cash)
- **Avis** (mécanisme unifié)
- **Notification** (email, SMS, push)
- **Adresse** (livraison + intervention)

## Conséquences

### Positives

1. **Différenciation forte** — Aucun concurrent local ne couvre les
   deux flux.

2. **Effet réseau renforcé** — Les clients qui achètent peuvent aussi
   trouver des services (et inversement).

3. **Mutualisation des coûts** — Infrastructure de confiance,
   paiement, notifications partagées.

4. **Valeur pour les professionnels** — Un artisan peut vendre ses
   produits ET proposer des services.

5. **Vision long terme cohérente** — Positionnement de plateforme
   économique locale complète.

6. **Réutilisation du Catalog** — Le module Catalog est directement
   réutilisable (produits, images, avis).

### Négatives

1. **Complexité accrue** — Deux flux à concevoir, tester, maintenir.

2. **MVP plus tardif** — Le flux SERVICE doit être développé
   (Phase 2).

3. **Risque de dilution** — Ne pas exceller sur l'un ou l'autre.

4. **Coûts marketing** — Deux propositions de valeur à communiquer.

5. **Support client** — Deux cas d'usage à supporter.

### Neutres

1. **Architecture modulaire monolithique** — Déjà prévue, adaptée.

2. **Base de données PostgreSQL** — Peut gérer les deux flux.

3. **Frontend** — Deux parcours mais composants partagés.

## Stratégie de mise en œuvre

### Phase 1 — MVP ACHETER

- Finaliser Store, Category, Order, Payment
- Lancer le flux produits
- Valider le modèle économique

### Phase 2 — Extension TROUVER

- Ajouter Service, Quote, Booking
- Réutiliser l'infrastructure transverse
- Lancer le flux services

### Phase 3 — Écosystème

- Analytics avancé
- Programme de fidélité
- API publique

## Alternatives considérées

### Alternative 1 — Rester sur les produits uniquement

- **Avantages** : Focus, MVP plus rapide, moins de complexité
- **Inconvénients** : Perte de différenciation, marché plus étroit,
  concurrence internationale
- **Raison du rejet** : Nous croyons au potentiel de la marketplace
  hybride pour le marché malien

### Alternative 2 — Deux plateformes séparées

- **Avantages** : Spécialisation, MVP indépendants
- **Inconvénients** : Duplication infrastructure, pas d'effet réseau,
  complexité opérationnelle
- **Raison du rejet** : La valeur réside dans l'unification

### Alternative 3 — Commencer par les services

- **Avantages** : Différenciation immédiate
- **Inconvénients** : Module Catalog déjà 100% fait, perte de
  l'investissement
- **Raison du rejet** : Miser sur l'acquis

## Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Complexité de gestion | Élevée | Moyen | Modular monolith strict |
| MVP plus tardif | Moyenne | Moyen | Phase ACHETER d'abord |
| Dilution de la marque | Faible | Moyen | Deux propositions distinctes |
| Support client complexe | Moyenne | Faible | Formation, documentation |
| Difficulté à recruter | Faible | Faible | — |

## Métriques de succès

- **Phase 1** : 100 pros produits actifs, 500 commandes/mois
- **Phase 2** : 50 pros services actifs, 100 devis/mois
- **Phase 3** : GMV hybride > 250M FCFA/mois

## Implémentation technique

### Modifications DB

Ajouts :
- \`services\`, \`service_images\`, \`service_zones\`, \`availabilities\`
- \`quotes\`, \`quote_responses\`
- \`bookings\`
- \`reviews\` étendu (target polymorphique)
- \`payments\` étendu (XOR order/booking)

### Modifications API

Nouveaux modules :
- \`service\`, \`quote\`, \`booking\`

Endpoints Phase 2 :
- \`POST /services\`, \`GET /services\`, ...
- \`POST /quotes\`, \`POST /quotes/:id/respond\`, ...
- \`POST /bookings\`, ...

### Modifications Frontend

Pages nouvelles :
- Liste des services
- Détail d'un service
- Portfolio professionnel
- Demande de devis
- Réservation de créneau
- Mes réservations

## Références

- [Vision produit](../01-product/vision.md)
- [Domain Overview](../03-domain/domain-overview.md)
- [Roadmap](../12-roadmap/roadmap.md)

---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 1.0.0 |
| Statut | ✅ Accepté |
| Dernière mise à jour | ${TODAY} |
`;

FILES["12-roadmap/roadmap.md"] = `
${header("Roadmap", "12-roadmap")}

## Vue d'ensemble

\`\`\`
Phase 1 — FOUNDATION        ████████████████████  100%  ✅
Phase 2 — CATALOG           ████████████████████  100%  ✅
Phase 3 — STORE + CATEGORY  ███░░░░░░░░░░░░░░░░░   15%  ⏭️
Phase 4 — ORDER + PAYMENT   ░░░░░░░░░░░░░░░░░░░░    0%  ⏭️
Phase 5 — SERVICE (TROUVER) ░░░░░░░░░░░░░░░░░░░░    0%  🆕
Phase 6 — TRANSVERSE        ░░░░░░░░░░░░░░░░░░░░    0%  🆕
Phase 7 — ANALYTICS         ░░░░░░░░░░░░░░░░░░░░    0%
Phase 8 — FRONTENDS         ░░░░░░░░░░░░░░░░░░░░    0%
\`\`\`

## Phase 1 — Foundation ✅

**Objectif** : Infrastructure technique et Auth.

**Livrables** :
- [x] Monorepo pnpm
- [x] TypeScript strict + ESLint + Prettier
- [x] Prisma 7 + PostgreSQL 16
- [x] Authentification JWT
- [x] RBAC (permissions granulaires)
- [x] Tests (Vitest + Testcontainers)
- [x] Docker Compose (Postgres, Redis, SeaweedFS)
- [x] CI (GitHub Actions)

**Statut** : 100% ✅

## Phase 2 — Catalog ✅

**Objectif** : Cœur transactionnel du flux ACHETER.

**Livrables** :
- [x] ProductService (CRUD, création atomique)
- [x] ProductVariantService
- [x] ProductImageService
- [x] InventoryService (SQL atomique)
- [x] IdempotencyService
- [x] Contraintes DB (SKU, slug, XOR)
- [x] Controllers + Routes
- [x] **142 tests** (97 intégration + 45 E2E)

**Statut** : 100% ✅

## Phase 3 — Store + Category ⏭️

**Objectif** : Compléter les entités supports du flux ACHETER.

**Livrables** :
- [ ] StoreService (CRUD + statuts)
- [ ] StoreController + routes
- [ ] StoreHourRepository
- [ ] CategoryService (hiérarchie)
- [ ] CategoryController + routes
- [ ] Tests d'intégration
- [ ] Tests E2E

**Durée estimée** : 2 sessions
**Bloquant pour** : Phase 4 (Order nécessite Store)

## Phase 4 — Order + Payment ⏭️

**Objectif** : Flux transactionnel complet.

**Livrables** :
- [ ] OrderService (création + réservation stock)
- [ ] OrderItem + snapshots prix
- [ ] OrderStatusHistory
- [ ] Cycle de vie : PENDING → PAID → SHIPPED → DELIVERED
- [ ] Annulation + release stock
- [ ] Remboursement
- [ ] PaymentService
- [ ] Intégration Orange Money
- [ ] Intégration Wave
- [ ] Webhooks signés + idempotents
- [ ] DeliveryService
- [ ] Tests de concurrence (2 commandes simultanées)
- [ ] Tests E2E

**Durée estimée** : 3-4 sessions
**Bloquant pour** : Phase 5

## Phase 5 — SERVICE (TROUVER) 🆕

**Objectif** : Ouvrir le flux services.

**Livrables** :
- [ ] ServiceService (CRUD, portfolio)
- [ ] ServiceImageService
- [ ] ServiceZoneService
- [ ] AvailabilityService
- [ ] QuoteService (demande + réponse)
- [ ] BookingService (réservation de créneau)
- [ ] Intégration Payment (XOR order/booking)
- [ ] Tests de concurrence (créneau unique)
- [ ] Tests E2E

**Durée estimée** : 3-4 sessions
**Dépend de** : Phase 4 (Payment)

## Phase 6 — Transverse 🆕

**Objectif** : Infrastructure partagée.

**Livrables** :
- [ ] AddressService
- [ ] ReviewService (unifié produits + services)
- [ ] ReviewReportService
- [ ] NotificationService (email, SMS, push)
- [ ] NotificationTemplateService
- [ ] Templates email transactionnels
- [ ] Scheduler (cron jobs)

**Durée estimée** : 2-3 sessions
**Parallélisable** avec Phase 5

## Phase 7 — Analytics

**Objectif** : Mesurer et optimiser.

**Livrables** :
- [ ] AnalyticsEventService
- [ ] Dashboard professionnel
- [ ] Dashboard admin
- [ ] Rapports exportables
- [ ] Vues matérialisées
- [ ] Cache Redis

**Durée estimée** : 2 sessions

## Phase 8 — Frontends

**Objectif** : Interfaces utilisateur.

**Livrables** :
- [ ] Next.js web client
- [ ] Pages catalogue
- [ ] Panier + checkout
- [ ] Suivi de commande
- [ ] Recherche de services (Phase 5)
- [ ] Demande de devis
- [ ] Backoffice admin (Next.js)
- [ ] Dashboard modération
- [ ] Mobile (Phase 3+)

**Durée estimée** : plusieurs sessions

## Chemin critique vers le MVP

\`\`\`
Phase 3 (Store + Category)
    │
    ▼
Phase 4 (Order + Payment)
    │
    ├──► MVP ACHETER ✅ (utilisable)
    │
    ▼
Phase 5 (Service)
    │
    ▼
Phase 6 (Transverse)
    │
    ├──► MVP TROUVER ✅ (utilisable)
    │
    ▼
Phase 7 (Analytics)
    │
    ▼
Phase 8 (Frontends)
    │
    ▼
PRODUIT COMPLET
\`\`\`

## Jalons clés

| Jalon | Description | Phase |
|---|---|---|
| M1 | Catalog validé | Phase 2 ✅ |
| M2 | MVP ACHETER | Phase 4 |
| M3 | MVP TROUVER | Phase 6 |
| M4 | Beta fermée | Phase 8 |
| M5 | GA (General Availability) | Phase 8+ |

## Risques de la roadmap

| Risque | Impact | Mitigation |
|---|---|---|
| Retard Phase 4 | Retard global | Focus, priorisation |
| Complexité Payment | Retard | Commencer par 1 provider |
| Adoption lente | Retard revenus | Marketing actif |
| Complexité frontend | Retard MVP | Composants partagés |
| Surcharge équipe | Burnout | Recrutements ciblés |

## Priorités si contraintes

Si les ressources sont limitées, prioriser :

1. **MVP ACHETER** (Phases 3-4) — Valeur immédiate
2. **Transverse minimal** (Phase 6) — Review + Notification
3. **Frontend web** (Phase 8) — Interface utilisateur
4. **SERVICES** (Phase 5) — Différenciation
5. **Analytics** (Phase 7) — Optimisation

## Budget par phase

| Phase | Coût estimé | Durée |
|---|---|---|
| Phase 3 | 500 K FCFA | 2 semaines |
| Phase 4 | 1,5 M FCFA | 6 semaines |
| Phase 5 | 1,5 M FCFA | 6 semaines |
| Phase 6 | 1 M FCFA | 4 semaines |
| Phase 7 | 800 K FCFA | 3 semaines |
| Phase 8 | 2 M FCFA | 8 semaines |
| **Total** | **7,3 M FCFA** | **~7 mois** |

## Métriques de succès par phase

| Phase | Métrique clé | Cible |
|---|---|---|
| Phase 3 | Couverture tests Store | > 80% |
| Phase 4 | Commandes réussies en beta | > 50 |
| Phase 5 | Devis envoyés en beta | > 20 |
| Phase 6 | Notifications envoyées | > 100 |
| Phase 7 | Dashboard utilisé | > 10 pros |
| Phase 8 | Utilisateurs actifs | > 200 |

${footer("0.2.0", defaultChanges())}
`;

FILES["12-roadmap/milestones.md"] = `
${header("Milestones", "12-roadmap")}

## Vue d'ensemble

\`\`\`
M1 ── Catalog validé           ✅ ATTEINT
M2 ── MVP ACHETER              ⏭️ EN COURS
M3 ── MVP TROUVER              ⏭️ PRÉVU
M4 ── Beta fermée              ⏭️ PRÉVU
M5 ── GA (production)          ⏭️ PRÉVU
M6 ── Rentabilité              ⏭️ PRÉVU
\`\`\`

## M1 — Catalog validé ✅

**Date d'atteinte** : 2026-10-11

**Livrables** :
- [x] ProductService + VariantService + ImageService + InventoryService
- [x] IdempotencyService
- [x] Contraintes DB critiques
- [x] 142 tests verts (97 intégration + 45 E2E)
- [x] Documentation blueprint (13 sections)

**Métriques** :
- 142 tests
- 100% de couverture sur les services Catalog
- Zéro bug critique
- Performance : p95 < 500ms

**Critères de sortie** : tous atteints ✅

## M2 — MVP ACHETER ⏭️

**Date cible** : À définir (estimé 2-3 mois)

**Livrables** :
- [ ] StoreService + Controller
- [ ] CategoryService + Controller
- [ ] OrderService + cycle de vie
- [ ] PaymentService + Orange Money + Wave
- [ ] ReviewService
- [ ] AddressService
- [ ] NotificationService (email + SMS)
- [ ] Frontend web client (catalogue + panier + checkout)
- [ ] Tests E2E complets

**Métriques de succès** :
- 5-10 professionnels pilotes
- 20-30 clients testeurs
- 50 commandes réelles
- NPS > 30
- Taux de rétention client M1 > 40%

**Critères de sortie** :
- [ ] Parcours complet : créer boutique → produit → commande → paiement → livraison → avis
- [ ] Zéro bug critique pendant 2 semaines
- [ ] Uptime > 99.5%

**Risques** :
- Complexité Payment
- Adoption pro lente
- Logistique de livraison

## M3 — MVP TROUVER ⏭️

**Date cible** : 2-3 mois après M2

**Livrables** :
- [ ] ServiceService + portfolio
- [ ] QuoteService (demande + réponse)
- [ ] BookingService (réservation)
- [ ] Intégration Payment (booking)
- [ ] Extension Review (services)
- [ ] Frontend : recherche services, devis, réservation

**Métriques de succès** :
- 5-10 professionnels services pilotes
- 20 demandes de devis
- 10 réservations complétées
- NPS services > 30

**Critères de sortie** :
- [ ] Parcours complet : créer service → demande → devis → réservation → avis
- [ ] Taux de conversion devis > 30%
- [ ] Taux de réalisation > 70%

## M4 — Beta fermée ⏭️

**Date cible** : après M3

**Livrables** :
- [ ] Tous les modules MVP
- [ ] Frontend web complet
- [ ] Backoffice admin
- [ ] Monitoring complet
- [ ] Support client en place

**Métriques de succès** :
- 20 professionnels actifs
- 100 clients actifs
- 200 commandes + 50 services
- NPS global > 35
- Taux de rétention pro M3 > 60%

**Critères de sortie** :
- [ ] Zéro bug bloquant
- [ ] Documentation complète
- [ ] Formation des pros pilotes

## M5 — GA (General Availability) ⏭️

**Date cible** : après M4

**Livrables** :
- [ ] Ouverture publique
- [ ] Marketing actif (réseaux, radio, influence)
- [ ] Support multi-canal (WhatsApp + email + SMS)
- [ ] Monitoring + alerting production
- [ ] Infrastructure scalée

**Métriques de succès** :
- 100 professionnels actifs
- 2 000 clients actifs
- 500 commandes/mois
- 10 M FCFA GMV mensuel
- Uptime > 99.9%

**Critères de sortie** :
- [ ] Critères d'adoption MVP atteints
- [ ] Break-even opérationnel
- [ ] Équipe formée

## M6 — Rentabilité ⏭️

**Date cible** : 12-18 mois après GA

**Métriques de succès** :
- 2 000 professionnels actifs
- 60 000 clients actifs
- 250 M FCFA GMV mensuel
- Résultat net ≈ 0 (break-even financier)
- NPS > 50

**Critères de sortie** :
- [ ] Break-even financier atteint
- [ ] Levée de fonds Série A ou autofinancement
- [ ] Préparation expansion géographique

## Jalons intermédiaires

| Jalon | Description | Phase |
|---|---|---|
| J1 | Premier produit publié | ✅ |
| J2 | Premier test E2E vert | ✅ |
| J3 | 100 tests d'intégration | ✅ |
| J4 | Store + Category complets | Phase 3 |
| J5 | Première commande réelle | Phase 4 |
| J6 | Premier paiement Orange Money | Phase 4 |
| J7 | Premier avis publié | Phase 6 |
| J8 | Premier devis envoyé | Phase 5 |
| J9 | Première réservation | Phase 5 |
| J10 | 1 000 utilisateurs | Phase 8 |

## Critères de passage entre jalons

### M1 → M2

- [x] Catalog 100% fonctionnel
- [x] Tests verts
- [x] Documentation complète
- [ ] Décision go/no-go sur la suite

### M2 → M3

- [ ] MVP ACHETER validé en beta
- [ ] 50 commandes réelles
- [ ] NPS client > 30
- [ ] Décision go/no-go sur les services

### M3 → M4

- [ ] MVP TROUVER validé
- [ ] 10 réservations complétées
- [ ] NPS services > 30
- [ ] Préparation beta fermée

### M4 → M5

- [ ] Beta fermée validée
- [ ] 200 utilisateurs actifs
- [ ] Zéro bug bloquant
- [ ] Préparation GA

### M5 → M6

- [ ] GA stable
- [ ] 2 000 utilisateurs actifs
- [ ] Revenus mensuels > 300 K FCFA
- [ ] Préparation scale

${footer("0.2.0", defaultChanges())}
`;

FILES["12-roadmap/backlog.md"] = `
${header("Backlog", "12-roadmap")}

## Priorité P0 — Critique (bloquant MVP)

### Phase 3 — Store + Category
- [ ] StoreService (CRUD + statuts)
- [ ] StoreController + routes
- [ ] CategoryService (hiérarchie)
- [ ] CategoryController + routes
- [ ] Tests d'intégration

### Phase 4 — Order + Payment
- [ ] OrderService (création atomique)
- [ ] Cycle de vie order
- [ ] PaymentService (Orange Money)
- [ ] PaymentService (Wave)
- [ ] Webhooks sécurisés
- [ ] DeliveryService
- [ ] Tests concurrence

### Phase 6 — Transverse minimal
- [ ] AddressService
- [ ] ReviewService (produits uniquement)
- [ ] NotificationService (email)

### Phase 8 — Frontend MVP
- [ ] Next.js setup
- [ ] Pages catalogue
- [ ] Panier + checkout
- [ ] Authentification UI
- [ ] Dashboard pro minimal

## Priorité P1 — Important (valeur utilisateur)

### Phase 5 — Service (TROUVER)
- [ ] ServiceService + portfolio
- [ ] QuoteService (devis)
- [ ] BookingService (réservation)
- [ ] Intégration Payment (booking)

### Phase 6 — Transverse étendu
- [ ] ReviewService (services)
- [ ] ReviewReportService
- [ ] NotificationService (SMS, push)
- [ ] Templates email
- [ ] Scheduler (cron)

### Phase 8 — Frontend étendu
- [ ] Recherche de services
- [ ] Demande de devis
- [ ] Réservation de créneau
- [ ] Backoffice admin

## Priorité P2 — Nice to have

### Fonctionnalités avancées
- [ ] Recherche full-text
- [ ] Filtres avancés
- [ ] Recommandations personnalisées
- [ ] Programme de fidélité
- [ ] Parrainage
- [ ] Coupons et promotions

### Analytics
- [ ] Dashboard professionnel avancé
- [ ] Rapports exportables
- [ ] Tendances et prédictions
- [ ] A/B testing infrastructure

### Communication
- [ ] Chat interne (client ↔ pro)
- [ ] Notifications push mobile
- [ ] Templates personnalisables

### Mobile
- [ ] PWA (Progressive Web App)
- [ ] Application React Native
- [ ] Notifications push natives

### Infrastructure
- [ ] Cache Redis (lectures)
- [ ] Read replicas (Phase 3)
- [ ] CDN images
- [ ] Multi-région (Phase 4)

## Priorité P3 — Idées futures

- [ ] Multi-langue (bambara, anglais)
- [ ] Multi-devises
- [ ] Extension géographique (Sénégal, Côte d'Ivoire, Burkina)
- [ ] Marketplace de gros (B2B)
- [ ] API publique
- [ ] Marketplace de partenaires
- [ ] Formation en ligne
- [ ] Assurance transactionnelle
- [ ] Financement des pros (micro-crédit)
- [ ] Avance de trésorerie

## Dette technique

### À adresser en priorité

- [ ] Uniformiser \`errors/\` (kebab-case partout)
- [ ] Uniformiser \`dtos/\` vs \`dto/\`
- [ ] Extraire \`withSerializableRetry\` en utilitaire partagé
- [ ] Extraire \`AuthContext\` en type global
- [ ] Retirer warning \`__dirname\` Vitest
- [ ] Retirer warning \`poolOptions\` Vitest 4+
- [ ] Améliorer \`truncateAll\` (plus sélectif)
- [ ] Documentation inline (JSDoc)

### À surveiller

- [ ] Couverture de tests > 80%
- [ ] Complexité cyclomatique < 10
- [ ] Duplication < 3%
- [ ] Bundle size (frontend)

## Idées non structurées

### Améliorations UX
- Onboarding interactif pour pros
- Guide de démarrage pour clients
- Tour guidé première visite
- Notifications intelligentes (fréquence adaptée)
- Recherche vocale (bambara)

### Modèle économique
- Abonnement annuel (réduction)
- Sponsoring de catégories
- Publicités ciblées (non intrusives)
- Certification pro premium
- Formation payante

### Partenariats
- Chambre des métiers
- Coopératives d'artisans
- Opérateurs mobile money
- ONG et bailleurs (impact social)
- Institutions financières (paiement)

## Roadmap des versions

| Version | Contenu | Date cible |
|---|---|---|
| 0.1.0 | Foundation | ✅ |
| 0.2.0 | Catalog | ✅ |
| 0.3.0 | Store + Category | À venir |
| 0.4.0 | Order + Payment | À venir |
| 0.5.0 | Service (TROUVER) | À venir |
| 0.6.0 | Transverse | À venir |
| 0.7.0 | Analytics | À venir |
| 1.0.0 | MVP complet | À venir |

## Méthodologie de priorisation

### Framework RICE

**R**each (portée) × **I**mpact × **C**onfidence / **E**ffort

| Feature | Reach | Impact | Conf. | Effort | Score |
|---|---|---|---|---|---|
| Order + Payment | Élevé | Élevé | Élevé | Élevé | Prioritaire |
| Service | Élevé | Élevé | Moyen | Élevé | Haut |
| Frontend | Élevé | Élevé | Élevé | Très élevé | Prioritaire |
| Analytics | Moyen | Moyen | Élevé | Moyen | Moyen |
| Programme fidélité | Moyen | Moyen | Faible | Moyen | Faible |

### Règles de priorisation

1. **Bloquer le MVP** → P0
2. **Valeur utilisateur directe** → P1
3. **Différenciation** → P1
4. **Optimisation** → P2
5. **Nice to have** → P3

## Prochaine action immédiate

**P0** : Commencer la Phase 3 (Store + Category).

Voir [roadmap.md](./roadmap.md) pour la séquence complète.

${footer("0.2.0", defaultChanges())}
`;

/* ================================================================
 * FICHIERS — VAGUE 6 (00-index)
 * ================================================================ */

FILES["00-index/glossary.md"] = `
${header("Glossaire", "00-index")}

## Termes métier

| Terme | Définition |
|---|---|
| **Vertical** | Secteur d'activité (ex : Artisans, Mode, Alimentation) |
| **Store** | Boutique en ligne d'un professionnel |
| **Product** | Produit physique vendu (bien tangible) |
| **Variant** | Déclinaison d'un produit (taille, couleur, etc.) |
| **SKU** | Stock Keeping Unit — identifiant unique d'une variante |
| **Inventory** | Stock d'un produit ou d'une variante |
| **Reserved** | Quantité réservée (paniers, commandes en cours) |
| **Available** | Stock disponible = \`quantity - reserved\` |
| **Order** | Commande passée par un client |
| **OrderItem** | Ligne de commande |
| **Payment** | Paiement d'une commande ou réservation |
| **Transaction** | Mouvement financier associé à un paiement |
| **Delivery** | Livraison physique d'une commande |
| **Review** | Avis laissé par un client après transaction |
| **Rating** | Note numérique (1-5 étoiles) |
| **Service** | Prestation proposée par un professionnel |
| **Quote** | Demande de devis pour un service |
| **QuoteResponse** | Réponse du professionnel à une demande de devis |
| **Booking** | Réservation d'un créneau de service |
| **Availability** | Créneau horaire où un service est disponible |
| **Professional** | Utilisateur avec un profil vérifié (vendeur / prestataire) |
| **Client** | Utilisateur acheteur |
| **KYC** | Know Your Customer — vérification d'identité |
| **Badge** | Marqueur visuel de vérification (✓ Pro, ✓ Business) |
| **Escrow** | Séquestre (paiement bloqué jusqu'à validation) |

## Termes techniques

| Terme | Définition |
|---|---|
| **ADR** | Architecture Decision Record |
| **Aggregate** | Groupe d'entités traitées comme une unité transactionnelle |
| **Bounded Context** | Frontière explicite d'un modèle de domaine |
| **CQRS** | Command Query Responsibility Segregation |
| **DDD** | Domain-Driven Design |
| **DI** | Dependency Injection |
| **DTO** | Data Transfer Object |
| **Domain Event** | Événement métier significatif |
| **Event Sourcing** | Stockage de l'état via une séquence d'événements |
| **FK** | Foreign Key |
| **Idempotence** | Propriété d'une opération qui peut être répétée sans effet |
| **JWT** | JSON Web Token |
| **Monolith** | Application déployée en un seul bloc |
| **Modular Monolith** | Monolithe organisé en modules faiblement couplés |
| **ORM** | Object-Relational Mapping |
| **Ownership** | Propriété d'une ressource par un utilisateur |
| **PII** | Personally Identifiable Information |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **RTO** | Recovery Time Objective |
| **RPO** | Recovery Point Objective |
| **Saga** | Pattern pour transactions distribuées |
| **Serializable** | Niveau d'isolation maximal en DB |
| **Soft Delete** | Suppression logique (marquage au lieu de suppression) |
| **TTL** | Time To Live |
| **UUID** | Universally Unique Identifier |
| **Value Object** | Objet immuable sans identité propre |

## Acronymes

| Acronyme | Signification |
|---|---|
| **ADR** | Architecture Decision Record |
| **API** | Application Programming Interface |
| **CDN** | Content Delivery Network |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **CRUD** | Create Read Update Delete |
| **DDD** | Domain-Driven Design |
| **DI** | Dependency Injection |
| **DTO** | Data Transfer Object |
| **ERD** | Entity-Relationship Diagram |
| **FK** | Foreign Key |
| **GMV** | Gross Merchandise Volume |
| **JWT** | JSON Web Token |
| **KYC** | Know Your Customer |
| **MoSCoW** | Must Should Could Won't |
| **MVP** | Minimum Viable Product |
| **NPS** | Net Promoter Score |
| **ORM** | Object-Relational Mapping |
| **PII** | Personally Identifiable Information |
| **PK** | Primary Key |
| **PWA** | Progressive Web App |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **RGPD** | Règlement Général sur la Protection des Données |
| **RICE** | Reach Impact Confidence Effort |
| **RPO** | Recovery Point Objective |
| **RTO** | Recovery Time Objective |
| **SaaS** | Software as a Service |
| **SKU** | Stock Keeping Unit |
| **TTL** | Time To Live |
| **UI** | User Interface |
| **UUID** | Universally Unique Identifier |
| **UX** | User Experience |
| **XOR** | Exclusive OR |

## Termes DɛmɛPro spécifiques

| Terme | Définition |
|---|---|
| **Acheter** | Flux de vente de produits physiques |
| **Trouver** | Flux de prestation de services |
| **DɛmɛPro** | Nom de la plateforme (bambara : « aider, soutenir ») |
| **Vertical** | Secteur d'activité (ARTISANS, MODE, etc.) |
| **Artisan** | Professionnel de l'artisanat (couturier, menuisier, etc.) |
| **Mobile Money** | Paiement via téléphone (Orange Money, Wave) |
| **SeaweedFS** | Système de stockage S3-compatible utilisé |

## Codes d'état

### Product.status
- **DRAFT** — Brouillon, non publié
- **ACTIVE** — Publié, achetable
- **OUT_OF_STOCK** — Rupture de stock
- **INACTIVE** — Désactivé
- **ARCHIVED** — Archivé (soft delete)

### Order.status
- **PENDING** — En attente de paiement
- **PAID** — Payée
- **SHIPPED** — Expédiée
- **DELIVERED** — Livrée
- **CANCELLED** — Annulée
- **REFUNDED** — Remboursée

### Payment.status
- **PENDING** — En attente
- **PROCESSING** — En cours
- **PAID** — Payé
- **FAILED** — Échoué
- **REFUNDED** — Remboursé
- **PARTIALLY_REFUNDED** — Partiellement remboursé

### Store.status
- **PENDING** — En attente de validation
- **ACTIVE** — Active
- **SUSPENDED** — Suspendue
- **CLOSED** — Fermée

### Quote.status (Phase 2)
- **PENDING** — En attente de réponse
- **RESPONDED** — Répondue
- **ACCEPTED** — Acceptée
- **REJECTED** — Refusée
- **EXPIRED** — Expirée
- **CONVERTED** — Convertie en réservation

### Booking.status (Phase 2)
- **CONFIRMED** — Confirmée
- **IN_PROGRESS** — En cours
- **COMPLETED** — Terminée
- **CANCELLED** — Annulée
- **NO_SHOW** — Client absent

## Rôles

| Rôle | Description |
|---|---|
| **VISITEUR** | Non authentifié |
| **CLIENT** | Acheteur authentifié |
| **PROFESSIONAL** | Vendeur / prestataire |
| **ADMIN** | Modérateur plateforme |
| **SUPER_ADMIN** | Super administrateur |

${footer("0.2.0", defaultChanges())}
`;

FILES["00-index/document-status.md"] = `
${header("Statut des documents", "00-index")}

## Vue d'ensemble

| Section | Complétion | Dernière mise à jour |
|---|---|---|
| 00-index | 90% | ${TODAY} |
| 01-product | 85% | ${TODAY} |
| 02-requirements | 75% | ${TODAY} |
| 03-domain | 80% | ${TODAY} |
| 04-architecture | 40% | ${TODAY} |
| 05-data | 70% | ${TODAY} |
| 06-api | 40% | ${TODAY} |
| 07-security | 20% | ${TODAY} |
| 08-engineering | 30% | ${TODAY} |
| 09-infrastructure | 20% | ${TODAY} |
| 10-decisions | 60% | ${TODAY} |
| 11-ai-engineering | 30% | ${TODAY} |
| 12-roadmap | 70% | ${TODAY} |

## Détail par section

### 00-index

| Fichier | Statut |
|---|---|
| README.md | ✅ |
| glossary.md | ✅ |
| document-status.md | ✅ |

### 01-product

| Fichier | Statut |
|---|---|
| vision.md | ✅ |
| problem.md | ✅ |
| users.md | ✅ |
| value-proposition.md | ✅ |
| business-model.md | ✅ |
| verticals.md | 🟡 |
| mvp.md | ✅ |
| success-metrics.md | ✅ |

### 02-requirements

| Fichier | Statut |
|---|---|
| functional-requirements.md | ✅ |
| non-functional-requirements.md | ✅ |
| business-rules.md | ✅ |
| permissions-matrix.md | ✅ |
| acceptance-criteria.md | ✅ |

### 03-domain

| Fichier | Statut |
|---|---|
| domain-overview.md | ✅ |
| actors.md | ✅ |
| entities.md | ✅ |
| aggregates.md | ✅ |
| workflows.md | ✅ |
| state-machines.md | ✅ |
| domain-rules.md | ✅ |

### 04-architecture

| Fichier | Statut |
|---|---|
| architecture-overview.md | 🟡 |
| principles.md | 🟡 |
| system-context.md | 🟡 |
| container-view.md | 🟡 |
| component-view.md | ✅ |
| runtime-view.md | ✅ |
| deployment-view.md | 🟡 |
| integration-architecture.md | 🟡 |
| evolution-roadmap.md | 🟡 |

### 05-data

| Fichier | Statut |
|---|---|
| data-architecture.md | ✅ |
| database-schema.md | ✅ |
| entity-relationship.md | ✅ |
| data-dictionary.md | ✅ |
| data-lifecycle.md | 🟡 |
| indexing-strategy.md | ✅ |

### 06-api

| Fichier | Statut |
|---|---|
| api-overview.md | ✅ |
| conventions.md | 🟡 |
| authentication.md | 🟡 |
| authorization.md | 🟡 |
| errors.md | ✅ |
| pagination.md | 🟡 |
| versioning.md | 🟡 |
| openapi.yaml | 🟡 |

### 07-security

| Fichier | Statut |
|---|---|
| security-overview.md | 🟡 |
| threat-model.md | 🟡 |
| authentication-security.md | 🟡 |
| authorization-security.md | 🟡 |
| data-protection.md | 🟡 |
| file-security.md | 🟡 |
| api-security.md | 🟡 |
| incident-response.md | 🟡 |

### 08-engineering

| Fichier | Statut |
|---|---|
| coding-standards.md | 🟡 |
| git-workflow.md | 🟡 |
| testing-strategy.md | 🟡 |
| quality-gates.md | 🟡 |
| error-handling.md | 🟡 |
| logging.md | 🟡 |
| observability.md | 🟡 |
| configuration.md | 🟡 |
| dependency-policy.md | 🟡 |

### 09-infrastructure

| Fichier | Statut |
|---|---|
| environments.md | 🟡 |
| docker.md | 🟡 |
| local-development.md | 🟡 |
| ci-cd.md | 🟡 |
| deployment.md | 🟡 |
| backup-recovery.md | 🟡 |
| monitoring.md | 🟡 |

### 10-decisions

| Fichier | Statut |
|---|---|
| README.md | 🟡 |
| ADR-001-monorepo.md | 🟡 |
| ADR-002-modular-monolith.md | 🟡 |
| ADR-003-typescript.md | 🟡 |
| ADR-004-express-react.md | 🟡 |
| ADR-005-postgresql.md | 🟡 |
| ADR-006-prisma.md | 🟡 |
| ADR-007-rest-api.md | 🟡 |
| ADR-008-marketplace-hybride.md | ✅ |

### 11-ai-engineering

| Fichier | Statut |
|---|---|
| agents.md | 🟡 |
| skills.md | 🟡 |
| rules.md | 🟡 |
| hooks.md | 🟡 |
| agent-workflow.md | 🟡 |
| definition-of-done.md | 🟡 |

### 12-roadmap

| Fichier | Statut |
|---|---|
| roadmap.md | ✅ |
| milestones.md | ✅ |
| backlog.md | ✅ |
| release-strategy.md | 🟡 |
| future-verticals.md | 🟡 |

## Légende

- ✅ **Validé** — Contenu complet et à jour
- 🟡 **Draft** — Contenu initial, à enrichir
- 🚧 **En cours** — Rédaction active
- 📦 **Archivé** — Obsolète

## Prochaines priorités documentaires

1. **04-architecture** — Compléter architecture-overview, principles,
   system-context, container-view, deployment-view
2. **07-security** — Compléter threat-model, api-security
3. **08-engineering** — Compléter coding-standards, git-workflow,
   testing-strategy
4. **09-infrastructure** — Compléter docker, ci-cd, deployment
5. **06-api** — Compléter openapi.yaml, conventions

## Statistiques

| Catégorie | Fichiers | ✅ | 🟡 | 🚧 |
|---|---|---|---|---|
| Index | 3 | 3 | 0 | 0 |
| Product | 8 | 7 | 1 | 0 |
| Requirements | 5 | 5 | 0 | 0 |
| Domain | 7 | 7 | 0 | 0 |
| Architecture | 9 | 2 | 7 | 0 |
| Data | 6 | 5 | 1 | 0 |
| API | 8 | 2 | 6 | 0 |
| Security | 8 | 0 | 8 | 0 |
| Engineering | 9 | 0 | 9 | 0 |
| Infrastructure | 7 | 0 | 7 | 0 |
| Decisions | 9 | 1 | 8 | 0 |
| AI Engineering | 6 | 0 | 6 | 0 |
| Roadmap | 5 | 3 | 2 | 0 |
| **Total** | **90** | **35** | **55** | **0** |

**Complétion globale** : ~45%

${footer("0.2.0", defaultChanges())}
`;

FILES["00-index/README.md"] = `
${header("Blueprint DɛmɛPro", "00-index")}

## À propos

Ce dossier contient la **documentation de conception complète** de
DɛmɛPro, organisée en 13 sections.

## Structure

| Section | Contenu | Complétion |
|---|---|---|
| [01-product](../01-product/) | Vision, personas, MVP | 85% |
| [02-requirements](../02-requirements/) | Exigences fonctionnelles et non-fonctionnelles | 75% |
| [03-domain](../03-domain/) | Modèle de domaine, workflows | 80% |
| [04-architecture](../04-architecture/) | Architecture technique | 40% |
| [05-data](../05-data/) | Schéma de données | 70% |
| [06-api](../06-api/) | Contrats API | 40% |
| [07-security](../07-security/) | Sécurité | 20% |
| [08-engineering](../08-engineering/) | Standards d'ingénierie | 30% |
| [09-infrastructure](../09-infrastructure/) | Infrastructure, CI/CD | 20% |
| [10-decisions](../10-decisions/) | ADRs | 60% |
| [11-ai-engineering](../11-ai-engineering/) | Règles pour les agents IA | 30% |
| [12-roadmap](../12-roadmap/) | Roadmap, milestones | 70% |

## Comment lire ce blueprint

### Pour comprendre le produit

1. [01-product/vision.md](../01-product/vision.md)
2. [01-product/problem.md](../01-product/problem.md)
3. [01-product/users.md](../01-product/users.md)
4. [01-product/value-proposition.md](../01-product/value-proposition.md)
5. [01-product/mvp.md](../01-product/mvp.md)

### Pour comprendre le domaine

1. [03-domain/domain-overview.md](../03-domain/domain-overview.md)
2. [03-domain/entities.md](../03-domain/entities.md)
3. [03-domain/aggregates.md](../03-domain/aggregates.md)
4. [03-domain/domain-rules.md](../03-domain/domain-rules.md)

### Pour développer

1. [04-architecture/component-view.md](../04-architecture/component-view.md)
2. [08-engineering/coding-standards.md](../08-engineering/coding-standards.md)
3. [10-decisions/README.md](../10-decisions/README.md)

### Pour contribuer

1. [11-ai-engineering/rules.md](../11-ai-engineering/rules.md)
2. [11-ai-engineering/definition-of-done.md](../11-ai-engineering/definition-of-done.md)

## Principes directeurs

DɛmɛPro est une **place de marché hybride** qui couvre **deux
intentions** :

1. **ACHETER** — Vente de produits physiques
2. **TROUVER** — Prestation de services

Les deux flux partagent :
- **Identité** (User, Role, KYC)
- **Confiance** (avis, vérification)
- **Paiement** (Orange Money, Wave, cash)
- **Notifications** (email, SMS, push)

## Navigation rapide

- **Index** : ce document
- **Glossaire** : [glossary.md](./glossary.md)
- **Statut** : [document-status.md](./document-status.md)

## Statut actuel du projet

\`\`\`
Phase 1 — Foundation       ✅
Phase 2 — Catalog          ✅ (142 tests)
Phase 3 — Store + Category ⏭️ Prochaine
Phase 4 — Order + Payment  ⏭️
Phase 5 — Service          ⏭️
Phase 6 — Transverse       ⏭️
Phase 7 — Analytics        ⏭️
Phase 8 — Frontends        ⏭️
\`\`\`

## Comment contribuer

### Avant de modifier

1. Lire les documents concernés
2. Vérifier les ADRs existants
3. Consulter le statut des documents

### Convention de mise à jour

- **Toujours** mettre à jour le \`## Historique\` en bas de chaque
  document
- **Toujours** passer la version à la suivante
- **Jamais** supprimer du contenu sans raison explicite
- **Signaler** les sections incomplètes avec 🚧 ou 🟡

### Processus

1. Proposer le changement (issue ou PR)
2. Discuter si nécessaire
3. Modifier le document
4. Mettre à jour l'historique
5. Mettre à jour [document-status.md](./document-status.md)
6. Commit avec message clair

## Outils

### Scripts de génération

\`\`\`bash
# Générer la structure initiale
node scripts/init-blueprint.mjs

# Mettre à jour les fichiers (Vague 1 + 2)
node scripts/update-blueprint-v1.mjs

# Mettre à jour les fichiers (Vagues 3-6)
node scripts/update-blueprint-v2.mjs
\`\`\`

### Options

\`\`\`bash
# Voir sans écrire
node scripts/update-blueprint-v2.mjs --dry-run

# Forcer l'écrasement
node scripts/update-blueprint-v2.mjs --force
\`\`\`

## Références externes

- [DɛmɛPro - README principal](../../README.md)
- [CHANGELOG](../../CHANGELOG.md)
- [Conventions de code](../CONVENTIONS.md)

## Contact

- **Équipe produit** : —
- **Équipe technique** : —
- **Slack / WhatsApp** : —

${footer("0.2.0", defaultChanges())}
`;

/* ================================================================
 * MAIN
 * ================================================================ */

async function main() {
  console.log(`\n${c.bold}📚 Mise à jour blueprint DɛmɛPro (V2)${c.reset}`);
  console.log(`${c.gray}Racine : ${BLUEPRINT}${c.reset}`);
  console.log(`${c.gray}${Object.keys(FILES).length} fichiers à traiter${c.reset}`);

  if (DRY_RUN) log.warn("Mode DRY-RUN — aucun fichier ne sera écrit");
  if (FORCE) log.warn("Mode FORCE — écrasement systématique");

  const stats = {
    create: 0, update: 0, skip: 0,
    "dry-create": 0, "dry-update": 0, error: 0,
  };

  log.header("📝 Traitement des fichiers");

  for (const [relPath, content] of Object.entries(FILES)) {
    try {
      const result = await writeBlueprintFile(relPath, content);
      stats[result] = (stats[result] ?? 0) + 1;
    } catch (error) {
      log.err(`${relPath} : ${error.message}`);
      stats.error++;
    }
  }

  log.header("📊 Résumé");
  console.log(`  ${c.green}Créés       :${c.reset} ${stats.create}`);
  console.log(`  ${c.green}Mis à jour  :${c.reset} ${stats.update}`);
  console.log(`  ${c.gray}Ignorés     :${c.reset} ${stats.skip}`);
  if (DRY_RUN) {
    console.log(`  ${c.cyan}Dry create  :${c.reset} ${stats["dry-create"]}`);
    console.log(`  ${c.cyan}Dry update  :${c.reset} ${stats["dry-update"]}`);
  }
  if (stats.error > 0) {
    console.log(`  ${c.red}Erreurs     :${c.reset} ${stats.error}`);
  }
  console.log(`  ${c.bold}Total       :${c.reset} ${Object.keys(FILES).length}`);

  if (stats.skip > 0 && !FORCE) {
    log.warn(
      `Certains fichiers ont été ignorés. Utilise ${c.bold}--force${c.reset} pour les écraser.`,
    );
  }

  log.ok("\n✨ Blueprint à jour !\n");
}

main().catch((error) => {
  log.err(`Échec : ${error.message}`);
  if (VERBOSE) console.error(error);
  process.exit(1);
});
