#!/usr/bin/env node
// scripts/update-docs-full.mjs
//
// Met à jour la documentation complète du projet DɛmɛPro.
//
// Usage :
//   node scripts/update-docs-full.mjs
//   node scripts/update-docs-full.mjs --dry-run
//   node scripts/update-docs-full.mjs --force
//   node scripts/update-docs-full.mjs --verbose

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

/* ================================================================
 * CONFIGURATION
 * ================================================================ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DOCS = join(ROOT, "docs", "blueprint");

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

const TODAY = new Date().toISOString().slice(0, 10);

/* ================================================================
 * UTILITAIRES
 * ================================================================ */

const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m",
};

const log = {
  info: (m) => console.log(`${c.cyan}ℹ${c.reset} ${m}`),
  ok: (m) => console.log(`${c.green}✓${c.reset} ${m}`),
  skip: (m) => console.log(`${c.gray}○${c.reset} ${m}`),
  warn: (m) => console.log(`${c.yellow}⚠${c.reset} ${m}`),
  err: (m) => console.log(`${c.red}✗${c.reset} ${m}`),
  dir: (m) => console.log(`${c.magenta}▸${c.reset} ${m}`),
  header: (m) => console.log(`\n${c.bold}${m}${c.reset}`),
  debug: (m) => {
    if (VERBOSE) console.log(`${c.gray}· ${m}${c.reset}`);
  },
};

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(d) {
  if (DRY_RUN) return;
  await mkdir(d, { recursive: true });
}

async function writeFileSafe(path, content, label) {
  const has = await exists(path);

  if (has && !FORCE) {
    log.skip(label);
    return "skip";
  }

  if (DRY_RUN) {
    log.info(`[DRY] ${label}`);
    return "dry";
  }

  // Sécurité : le dossier parent doit exister.
  await ensureDir(dirname(path));

  await writeFile(path, content.trimEnd() + "\n", "utf-8");
  log.ok(`${label} ${has ? "(écrasé)" : "(créé)"}`);
  return "write";
}

/**
 * Résout une clé de FILES vers un chemin absolu.
 * - Les clés relatives sont résolues depuis DOCS.
 * - Les clés absolues (ex. README racine) sont utilisées telles quelles.
 */
function resolveTarget(key) {
  if (isAbsolute(key)) return key;
  return join(DOCS, key);
}

/* ================================================================
 * CONTENU DES FICHIERS
 * ================================================================ */

const FILES = {};

/* ------------------------------------------------------------------
 * docs/blueprint/00-index/document-status.md
 * ------------------------------------------------------------------ */

FILES["00-index/document-status.md"] = `
# Statut des documents

> **Section** : 00-index
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : ${TODAY}

## Vue d'ensemble

| Section | Complétion | Dernière mise à jour |
|---|---|---|
| 00-index | 90% | ${TODAY} |
| 01-product | 85% | ${TODAY} |
| 02-requirements | 75% | ${TODAY} |
| 03-domain | 80% | ${TODAY} |
| 04-architecture | 60% | ${TODAY} |
| 05-data | 70% | ${TODAY} |
| 06-api | 60% | ${TODAY} |
| 07-security | 20% | ${TODAY} |
| 08-engineering | 30% | ${TODAY} |
| 09-infrastructure | 20% | ${TODAY} |
| 10-decisions | 60% | ${TODAY} |
| 11-ai-engineering | 30% | ${TODAY} |
| 12-roadmap | 85% | ${TODAY} |

## État du projet (code)

| Indicateur | Valeur |
|---|---|
| Tests verts | **390** |
| Modules validés | Catalog, Store, Category, Verification, Order, Payment, Address, Review, Notification, Service |
| Migrations Prisma | 14 |
| Couverture de tests | > 85% |

## Légende

- ✅ **Validé** — Contenu complet et à jour
- 🟡 **Draft** — Contenu initial, à enrichir
- 🚧 **En cours** — Rédaction active
- 📦 **Archivé** — Obsolète

## Prochaines priorités documentaires

1. **Compléter 04-architecture** (architecture-overview, principles, system-context)
2. **Compléter 07-security** (threat-model, api-security)
3. **Compléter 08-engineering** (coding-standards, git-workflow, testing-strategy)
4. **Compléter 09-infrastructure** (docker, ci-cd, deployment)

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| ${TODAY} | 0.3.0 | Mise à jour 390 tests + modules validés | — |
`;

/* ------------------------------------------------------------------
 * docs/blueprint/12-roadmap/roadmap.md
 * ------------------------------------------------------------------ */

FILES["12-roadmap/roadmap.md"] = `
# Roadmap

> **Section** : 12-roadmap
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : ${TODAY}

## Vue d'ensemble

\`\`\`
Phase 1 — Foundation          ████████████████████  100%  ✅
Phase 2 — Catalog             ████████████████████  100%  ✅
Phase 3 — Store + Category    ████████████████████  100%  ✅
Phase 4 — Order + Payment     ████████████████████  100%  ✅
Phase 5 — Service (TROUVER)   ███████████░░░░░░░░░   55%  🚧
Phase 6 — Transverse          ████████████████████  100%  ✅
Phase 7 — Analytics           ░░░░░░░░░░░░░░░░░░░░    0%  ⏭️
Phase 8 — Frontends           ░░░░░░░░░░░░░░░░░░░░    0%  ⏭️
\`\`\`

## Phase 1 — Foundation ✅

**Statut** : 100% ✅

- [x] Monorepo pnpm
- [x] TypeScript strict + ESLint + Prettier
- [x] Prisma 7 + PostgreSQL 16
- [x] Authentification JWT
- [x] RBAC (permissions granulaires)
- [x] Tests (Vitest + Testcontainers)
- [x] Docker Compose (Postgres, Redis, SeaweedFS)

## Phase 2 — Catalog ✅

**Statut** : 100% ✅

- [x] ProductService (CRUD, création atomique)
- [x] ProductVariantService
- [x] ProductImageService
- [x] InventoryService (SQL atomique)
- [x] IdempotencyService
- [x] Contraintes DB (SKU, slug, XOR)
- [x] **142 tests** (97 intégration + 45 E2E)

## Phase 3 — Store + Category + Verification ✅

**Statut** : 100% ✅

- [x] StoreService (mono-boutique par pro)
- [x] StoreController + routes
- [x] CategoryService (hiérarchie 3 niveaux)
- [x] CategoryController + routes
- [x] VerificationService (BASIC → TRUSTED → CERTIFIED)
- [x] **87 tests** (40 Store + 33 Category + 14 Verification)

## Phase 4 — Order + Payment ✅

**Statut** : 100% ✅

### Order
- [x] OrderService (createOrder, shipOrder, deliverOrder, cancelOrder, markAsPaid)
- [x] Cycle de vie strict : PENDING → PAID → SHIPPED → DELIVERED
- [x] Réservation stock atomique
- [x] Snapshot prix/nom dans OrderItem
- [x] OrderController + 7 routes REST
- [x] **35 tests** (14 intégration + 21 E2E)

### Payment
- [x] PaymentService (initiate, webhook, refund)
- [x] PaymentProviderInterface (initiate, verifyWebhook, refund)
- [x] MockProvider (HMAC-SHA256)
- [x] OrangeMoneyProvider + WaveProvider (stubs)
- [x] Webhooks idempotents (providerRef @unique)
- [x] PaymentController + PaymentWebhookController
- [x] **22 tests** (14 intégration + 8 E2E)

### COD reporté à Phase 4.4

## Phase 5 — Service (TROUVER) 🚧

**Statut** : 55% 🚧

### 5.1 Service ✅
- [x] Modèle Service enrichi (pricingModel, basePrice, ratingAverage, ratingCount)
- [x] ServiceImage, ServiceZone, Availability
- [x] ServiceService (CRUD + images + zones + availabilities)
- [x] ServiceController + 15 routes
- [x] **46 tests** (28 intégration + 18 E2E)

### 5.2 Quote ⏭️
- [ ] Modèle Quote + QuoteResponse
- [ ] QuoteService
- [ ] QuoteController + routes
- [ ] Tests

### 5.3 Booking ⏭️
- [ ] Modèle Booking
- [ ] BookingService
- [ ] BookingController + routes
- [ ] Tests

### 5.4 Intégration Payment + Review ⏭️
- [ ] Payment XOR Order/Booking
- [ ] Review étendu (serviceId + bookingId)
- [ ] Tests

## Phase 6 — Transverse ✅

**Statut** : 100% ✅

### 6.1 Address
- [x] AddressService (CRUD + adresse par défaut)
- [x] AddressController + routes
- [x] Index partiel DB (une seule défaut par user)
- [x] **21 tests** (13 intégration + 8 E2E)

### 6.2 Review
- [x] Modèle Review enrichi (productId, variantId, storeId, professionalId)
- [x] ReviewReport
- [x] ReviewService (create, update, delete, report, moderate, summary)
- [x] Recalcul synchrone Store.ratingAverage
- [x] **25 tests** (14 intégration + 11 E2E)

### 6.3 Notification
- [x] NotificationProviderInterface
- [x] MockEmailProvider + MockSmsProvider
- [x] NotificationTemplateService
- [x] NotificationService (fire-and-forget)
- [x] NotificationController + routes
- [x] Intégration OrderService + ReviewService
- [x] **12 tests** (7 intégration + 5 E2E)

## Phase 7 — Analytics ⏭️

- [ ] AnalyticsService
- [ ] Dashboard pro
- [ ] Dashboard admin
- [ ] Export CSV

## Phase 8 — Frontends ⏭️

- [ ] Next.js web client
- [ ] Backoffice admin
- [ ] Mobile (Phase 3+)

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| ${TODAY} | 0.4.0 | Mise à jour 390 tests, Phases 4, 5.1, 6 complètes | — |
`;

/* ------------------------------------------------------------------
 * docs/blueprint/12-roadmap/milestones.md
 * ------------------------------------------------------------------ */

FILES["12-roadmap/milestones.md"] = `
# Milestones

> **Section** : 12-roadmap
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : ${TODAY}

## Vue d'ensemble

\`\`\`
M1 ── Catalog validé              ✅ ATTEINT
M2 ── Store + Category + KYC      ✅ ATTEINT
M3 ── Order + Payment             ✅ ATTEINT
M4 ── Transverse (6.1 + 6.2 + 6.3) ✅ ATTEINT
M5 ── Service 5.1                 ✅ ATTEINT
M6 ── Service 5.2 + 5.3 + 5.4     ⏭️ EN COURS
M7 ── MVP ACHETER (beta)          ⏭️ PRÉVU
M8 ── GA (production)             ⏭️ PRÉVU
\`\`\`

## M1 — Catalog validé ✅

**Date d'atteinte** : 2026-10-11

- [x] ProductService + VariantService + ImageService + InventoryService
- [x] IdempotencyService
- [x] Contraintes DB critiques
- [x] 142 tests verts

## M2 — Store + Category + KYC ✅

**Date d'atteinte** : 2026-10-11

- [x] StoreService (mono-boutique)
- [x] CategoryService (3 niveaux max, admin-only)
- [x] VerificationService (BASIC → TRUSTED → CERTIFIED)
- [x] 48 tests supplémentaires

## M3 — Order + Payment ✅

**Date d'atteinte** : 2026-10-12

- [x] OrderService (cycle de vie complet, réservation stock atomique)
- [x] PaymentService (initiate, webhook, refund)
- [x] MockProvider + squelettes Orange Money / Wave
- [x] Webhooks idempotents
- [x] 57 tests supplémentaires

## M4 — Transverse ✅

**Date d'atteinte** : 2026-10-12

- [x] AddressService (CRUD + adresse par défaut)
- [x] ReviewService (avis vérifiés + modération)
- [x] NotificationService (email + SMS mockés)
- [x] 58 tests supplémentaires

## M5 — Service 5.1 ✅

**Date d'atteinte** : 2026-10-12

- [x] Modèle Service enrichi
- [x] ServiceImage, ServiceZone, Availability
- [x] ServiceService + ServiceController
- [x] 46 tests supplémentaires
- [x] **Total : 390 tests verts**

## M6 — Service 5.2 + 5.3 + 5.4 ⏭️

**Date cible** : À définir (estimé 2-3 semaines)

- [ ] Quote + QuoteResponse
- [ ] Booking
- [ ] Intégration Payment
- [ ] Review étendu (serviceId + bookingId)

## M7 — MVP ACHETER (beta) ⏭️

**Date cible** : après M6

- [ ] Frontend web client
- [ ] Backoffice admin
- [ ] Monitoring

## M8 — GA (production) ⏭️

**Date cible** : après M7

- [ ] Ouverture publique
- [ ] Marketing
- [ ] Scale

---

## Jalons intermédiaires

| Jalon | Description | Statut |
|---|---|---|
| J1 | Premier produit publié | ✅ |
| J2 | Premier test E2E vert | ✅ |
| J3 | 100 tests d'intégration | ✅ |
| J4 | Store + Category + KYC complets | ✅ |
| J5 | Order + Payment + Transverse | ✅ |
| J6 | Service 5.1 validé | ✅ |
| J7 | **390 tests verts** | ✅ |
| J8 | Service 5.2 (Quote) | ⏭️ |
| J9 | Service 5.3 (Booking) | ⏭️ |
| J10 | Service 5.4 (Payment + Review) | ⏭️ |
| J11 | Frontend MVP | ⏭️ |
| J12 | 1 000 utilisateurs | ⏭️ |

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| ${TODAY} | 0.4.0 | Mise à jour milestones M3-M5 atteints, 390 tests | — |
`;

/* ------------------------------------------------------------------
 * docs/blueprint/03-domain/entities.md
 * ------------------------------------------------------------------ */

FILES["03-domain/entities.md"] = `
# Entités

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : ${TODAY}

## Vue d'ensemble

Le domaine DɛmɛPro est composé de **29+ entités** organisées en 9 contextes bornés.

## Contexte Identity

### User
- **Identité** : id (UUID)
- **Invariants** : email unique, passwordHash non vide, status ∈ {ACTIVE, SUSPENDED, DELETED}

### Role
- **Identité** : id (UUID)
- **Invariants** : code unique ∈ {CLIENT, PROFESSIONAL, ADMIN, SUPER_ADMIN}

### Permission
- **Identité** : id (UUID)
- **Invariants** : code unique

### ProfessionalProfile
- **Identité** : id (UUID)
- **Invariants** : userId unique, slug unique, verificationStatus ∈ {UNVERIFIED, PENDING, VERIFIED, REJECTED, EXPIRED}, verificationLevel ∈ {BASIC, TRUSTED, CERTIFIED}

### Verification
- **Identité** : id (UUID)
- **Invariants** : type ∈ {IDENTITY, BUSINESS, PROFESSIONAL, PHONE}

### RefreshToken
- **Identité** : id (UUID)
- **Invariants** : tokenHash unique

### AuditLog
- **Identité** : id (UUID)

### CustomerProfile
- **Identité** : id (UUID)

## Contexte ACHETER — Catalog

### Category
- **Invariants** : slug unique par vertical, type ∈ {PRODUCT, SERVICE, BOTH}

### Product
- **Invariants** : slug unique par store, price obligatoire si hasVariants=false, price null si hasVariants=true

### ProductVariant
- **Invariants** : sku unique global, ne peut exister que si product.hasVariants=true

### ProductImage
- **Invariants** : au plus 1 isPrimary=true par produit

### Inventory
- **Invariants** : XOR(productId, variantId), reserved ≤ quantity

### Vertical
- **Invariants** : code unique ∈ {ARTISANS, MAISON, AUTO, SERVICES, EMPLOI}

## Contexte ACHETER — Store

### Store
- **Invariants** : slug unique, professionalId unique (mono-boutique), status ∈ {DRAFT, ACTIVE, SUSPENDED, CLOSED}

## Contexte ACHETER — Order

### Order
- **Invariants** : status ∈ {PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED}, totalAmount ≥ 0

### OrderItem
- **Invariants** : quantity > 0, XOR(productId, variantId), snapshots figés

### OrderStatusHistory
- **Invariants** : fromStatus ≠ toStatus

## Contexte TROUVER — Service

### Service
- **Invariants** : slug unique par professionnel, pricingModel ∈ {QUOTE, FIXED, HOURLY}, basePrice cohérent avec pricingModel

### ServiceImage
- **Invariants** : au plus 1 isPrimary=true

### ServiceZone
- **Invariants** : au moins city OU region OU radiusKm

### Availability
- **Invariants** : récurrente → dayOfWeek + startTime < endTime, ponctuelle → specificDate

### Quote (stub)
- **Invariants** : status ∈ {PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED, CONVERTED}

### QuoteResponse (stub)
- **Invariants** : quoteId unique

### Booking (stub)
- **Invariants** : status ∈ {CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW}, un créneau ne peut être réservé qu'une fois

## Contexte Transverse

### Address
- **Invariants** : au plus 1 isDefault=true par user

### Payment
- **Invariants** : XOR(orderId, bookingId), status ∈ {PENDING, PROCESSING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED}, providerRef unique si non null

### Review
- **Invariants** : rating ∈ [1, 5], au moins 1 cible (productId, variantId, storeId, professionalId, serviceId), XOR(orderId, bookingId), au plus 1 avis par order/booking

### ReviewReport
- **Invariants** : status ∈ {PENDING, RESOLVED, DISMISSED}

### Notification
- **Invariants** : type, title non vides

### IdempotencyKey
- **Invariants** : (key, scope) unique, requestHash non vide

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| ${TODAY} | 0.4.0 | Ajout Service, ServiceImage, ServiceZone, Availability, Quote, Booking, Notification, ReviewReport | — |
`;

/* ------------------------------------------------------------------
 * docs/blueprint/06-api/api-overview.md
 * ------------------------------------------------------------------ */

FILES["06-api/api-overview.md"] = `
# Vue d'ensemble de l'API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : ${TODAY}

## Base URL

| Environnement | URL |
|---|---|
| Local | http://localhost:3000/api/v1 |
| Staging | https://staging.demepro.ml/api/v1 |
| Production | https://api.demepro.ml/api/v1 |

## Format de réponse

### Succès

\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

### Erreur

\`\`\`json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Produit introuvable.",
    "statusCode": 404
  }
}
\`\`\`

## Endpoints par module

### Auth
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /auth/register | Non |
| POST | /auth/login | Non |

### Catalog
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /catalog/products | Pro |
| POST | /catalog/products/full | Pro |
| GET | /catalog/products | Public |
| GET | /catalog/products/:id | Public |
| PATCH | /catalog/products/:id | Pro |
| DELETE | /catalog/products/:id | Pro |
| POST | /catalog/products/:id/activate | Pro |
| POST | /catalog/products/:id/enable-variants | Pro |
| POST | /catalog/products/:id/disable-variants | Pro |
| POST | /catalog/products/:productId/variants | Pro |
| GET | /catalog/products/:productId/variants | Public |
| GET | /catalog/variants/:id | Public |
| PATCH | /catalog/variants/:id | Pro |
| DELETE | /catalog/variants/:id | Pro |
| POST | /catalog/products/:productId/images | Pro |
| POST | /catalog/products/:productId/images/reorder | Pro |
| PATCH | /catalog/images/:id | Pro |
| DELETE | /catalog/images/:id | Pro |
| GET | /catalog/inventory/:id | Pro |
| PATCH | /catalog/inventory/:id | Pro |
| POST | /catalog/inventory/:id/adjust | Pro |

### Store
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /stores | Pro |
| GET | /stores | Public |
| GET | /stores/mine | Pro |
| GET | /stores/:id | Pro |
| PATCH | /stores/:id | Pro |
| POST | /stores/:id/activate | Pro |
| POST | /stores/:id/suspend | Admin |

### Category
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /categories | Admin |
| GET | /categories | Public |
| GET | /categories/:id | Public |
| PATCH | /categories/:id | Admin |
| DELETE | /categories/:id | Admin |

### Order
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /orders | Client |
| GET | /orders/mine | Client |
| GET | /orders/store/:storeId | Pro |
| GET | /orders/:id | Client/Pro |
| POST | /orders/:id/ship | Pro |
| POST | /orders/:id/deliver | Pro |
| POST | /orders/:id/cancel | Client/Pro |

### Payment
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /orders/:id/payment | Client |
| GET | /orders/:id/payment | Client/Pro |
| POST | /orders/:id/payment/refund | Client/Admin |
| POST | /webhooks/payment/:provider | Public (signé) |

### Address
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /addresses | Client |
| GET | /addresses/mine | Client |
| GET | /addresses/default | Client |
| GET | /addresses/:id | Client |
| PATCH | /addresses/:id | Client |
| POST | /addresses/:id/default | Client |
| DELETE | /addresses/:id | Client |

### Review
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /reviews | Client |
| GET | /reviews/products/:productId | Public |
| GET | /reviews/stores/:storeId | Public |
| GET | /reviews/summary | Public |
| PATCH | /reviews/:id | Client |
| DELETE | /reviews/:id | Client/Admin |
| POST | /reviews/:id/report | Client |
| POST | /reviews/:id/moderate | Admin |

### Notification
| Méthode | Endpoint | Auth |
|---|---|---|
| GET | /notifications/mine | Client/Pro |
| GET | /notifications/unread-count | Client/Pro |
| POST | /notifications/:id/read | Client/Pro |
| POST | /notifications/read-all | Client/Pro |

### Service
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /services | Pro |
| POST | /services/full | Pro |
| GET | /services | Public |
| GET | /services/mine | Pro |
| GET | /services/:id | Public |
| PATCH | /services/:id | Pro |
| POST | /services/:id/activate | Pro |
| DELETE | /services/:id | Pro |
| POST | /services/:id/images | Pro |
| POST | /services/:id/images/reorder | Pro |
| DELETE | /services/images/:imageId | Pro |
| POST | /services/:id/zones | Pro |
| DELETE | /services/zones/:zoneId | Pro |
| POST | /services/:id/availabilities | Pro |
| DELETE | /services/availabilities/:availabilityId | Pro |

### Verification
| Méthode | Endpoint | Auth |
|---|---|---|
| GET | /me/verification | Client/Pro |
| POST | /me/verification/upgrade-trusted | Client/Pro |
| POST | /me/verification/request-certification | Client/Pro |
| POST | /admin/verification/:id/approve | Admin |
| POST | /admin/verification/:id/reject | Admin |

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| ${TODAY} | 0.4.0 | Mise à jour tous endpoints (390 tests) | — |
`;

/* ------------------------------------------------------------------
 * docs/blueprint/00-index/README.md
 * ------------------------------------------------------------------ */

FILES["00-index/README.md"] = `
# Blueprint DɛmɛPro

> **Section** : 00-index
> **Dernière mise à jour** : ${TODAY}

## État du projet

\`\`\`
Tests verts      : 390 ✅
Modules validés  : 10
Migrations Prisma: 14
Phases complètes : 1, 2, 3, 4, 6
Phase en cours   : 5 (Service)
\`\`\`

## Navigation rapide

- **Index** : ce document
- **Glossaire** : [glossary.md](./glossary.md)
- **Statut** : [document-status.md](./document-status.md)

## Modules livrés

| Module | Tests | Statut |
|---|---|---|
| Catalog | 142 | ✅ |
| Store | 40 | ✅ |
| Category | 33 | ✅ |
| Verification | 14 | ✅ |
| Order | 35 | ✅ |
| Payment | 22 | ✅ |
| Address | 21 | ✅ |
| Review | 25 | ✅ |
| Notification | 12 | ✅ |
| Service | 46 | ✅ |
| **Total** | **390** | ✅ |

## Comment contribuer

Voir [11-ai-engineering/rules.md](../11-ai-engineering/rules.md).

## Références externes

- [README principal](../../README.md)
- [CHANGELOG](../../CHANGELOG.md)
- [Conventions de code](../CONVENTIONS.md)

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| ${TODAY} | 0.4.0 | Mise à jour 390 tests, 10 modules validés | — |
`;

/* ------------------------------------------------------------------
 * docs/blueprint/00-index/glossary.md
 * ------------------------------------------------------------------ */

FILES["00-index/glossary.md"] = `
# Glossaire

> **Section** : 00-index
> **Dernière mise à jour** : ${TODAY}

## Termes métier

| Terme | Définition |
|---|---|
| **Vertical** | Secteur d'activité (ex : Artisans, Mode) |
| **Store** | Boutique d'un professionnel (mono-boutique) |
| **Product** | Produit physique |
| **Variant** | Déclinaison d'un produit |
| **SKU** | Stock Keeping Unit |
| **Inventory** | Stock (quantity, reserved) |
| **Order** | Commande client |
| **Payment** | Paiement d'une commande |
| **Review** | Avis client (post-achat) |
| **Service** | Prestation (Phase 5) |
| **Quote** | Devis (Phase 5.2) |
| **Booking** | Réservation (Phase 5.3) |
| **Availability** | Créneaux disponibles (Phase 5.1) |
| **KYC** | Know Your Customer (vérification) |

## Statuts

### ProductStatus
DRAFT, ACTIVE, OUT_OF_STOCK, INACTIVE, ARCHIVED

### StoreStatus
DRAFT, ACTIVE, SUSPENDED, CLOSED

### OrderStatus
PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED

### PaymentStatus
PENDING, PROCESSING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED

### ServiceStatus
DRAFT, ACTIVE, INACTIVE, ARCHIVED

### VerificationLevel
BASIC, TRUSTED, CERTIFIED

### VerificationStatus
UNVERIFIED, PENDING, VERIFIED, REJECTED, EXPIRED

### QuoteStatus (Phase 5.2)
PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED, CONVERTED

### BookingStatus (Phase 5.3)
CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| ${TODAY} | 0.4.0 | Ajout Service, Quote, Booking, Availability, Verification | — |
`;

/* ------------------------------------------------------------------
 * README.md (racine du projet)
 * Utilise une clé ABSOLUE pour être résolu hors de docs/blueprint.
 * ------------------------------------------------------------------ */

FILES[resolve(ROOT, "README.md")] = `
# DɛmɛPro

Plateforme e-commerce B2B/B2C pour artisans et professionnels du Mali.

## État du projet

\`\`\`
Tests verts     : 390 ✅
Modules livrés  : 10
Migrations      : 14
\`\`\`

| Module | Statut | Tests |
|---|---|---|
| Catalog (produits, variantes, stock) | ✅ | 142 |
| Store (mono-boutique) | ✅ | 40 |
| Category (3 niveaux) | ✅ | 33 |
| Verification (KYC progressif) | ✅ | 14 |
| Order (cycle de vie) | ✅ | 35 |
| Payment (webhooks, mock) | ✅ | 22 |
| Address (adresses) | ✅ | 21 |
| Review (avis vérifiés) | ✅ | 25 |
| Notification (email + SMS mock) | ✅ | 12 |
| Service (portfolio) | ✅ | 46 |

**Phase en cours** : 5.2 — Quote (devis)

## Stack technique

| Couche | Technologie |
|---|---|
| Monorepo | pnpm workspaces |
| API | Node.js + Express + TypeScript |
| ORM | Prisma 7 |
| Base de données | PostgreSQL 16 |
| Validation | Zod |
| Tests | Vitest + Testcontainers |
| Auth | JWT + RBAC |

## Démarrage rapide

\`\`\`bash
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:migrate
pnpm db:generate
pnpm dev
\`\`\`

## Commandes

| Commande | Description |
|---|---|
| \`pnpm dev\` | Lance web + api + admin |
| \`pnpm test\` | Tous les tests |
| \`pnpm test:integration\` | Tests intégration |
| \`pnpm test:e2e\` | Tests E2E |
| \`pnpm test:coverage\` | Couverture |
| \`pnpm lint\` | ESLint |
| \`pnpm typecheck\` | TypeScript |
| \`pnpm db:migrate\` | Migrations Prisma |
| \`pnpm db:generate\` | Client Prisma |
| \`pnpm docker:up\` | Démarre Postgres/Redis/SeaweedFS |
| \`pnpm docker:down\` | Arrête les containers |

## Documentation

- [Blueprint](./docs/blueprint/00-index/README.md)
- [Roadmap](./docs/blueprint/12-roadmap/roadmap.md)
- [Milestones](./docs/blueprint/12-roadmap/milestones.md)

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| ${TODAY} | 0.4.0 | Mise à jour 390 tests, 10 modules validés | — |
`;

/* ================================================================
 * EXÉCUTION
 * ================================================================ */

async function main() {
  log.header("📚 Mise à jour de la documentation DɛmɛPro");
  log.info(`Racine       : ${ROOT}`);
  log.info(`Docs         : ${DOCS}`);
  log.info(`Date         : ${TODAY}`);
  log.info(`Mode         : ${DRY_RUN ? "DRY-RUN" : FORCE ? "FORCE" : "NORMAL"}`);
  console.log();

  // Vérification : le dossier docs/blueprint doit exister.
  if (!DRY_RUN && !(await exists(DOCS))) {
    log.warn(`Le dossier ${DOCS} n'existe pas — il sera créé.`);
  }

  const stats = { write: 0, skip: 0, dry: 0, error: 0 };
  const total = Object.keys(FILES).length;
  let i = 0;

  for (const [key, content] of Object.entries(FILES)) {
    i++;
    const fullPath = resolveTarget(key);
    const label = isAbsolute(key)
      ? key.replace(ROOT + "/", "").replace(ROOT + "\\", "")
      : key;

    log.debug(`[${i}/${total}] ${fullPath}`);

    try {
      const result = await writeFileSafe(fullPath, content, label);
      stats[result] = (stats[result] || 0) + 1;
    } catch (err) {
      log.err(`${label} → ${err.message}`);
      stats.error++;
    }
  }

  log.header("📊 Résumé");
  log.ok(`Écrits   : ${stats.write}`);
  log.skip(`Ignorés  : ${stats.skip}`);
  if (DRY_RUN) log.info(`DRY      : ${stats.dry}`);
  if (stats.error > 0) log.err(`Erreurs  : ${stats.error}`);
  console.log();

  if (stats.error > 0) process.exit(1);
  if (stats.write === 0 && stats.dry === 0 && stats.skip > 0 && !FORCE) {
    log.info("Astuce : utilisez --force pour écraser les fichiers existants.");
  }
}

main().catch((err) => {
  log.err(`Erreur fatale : ${err.message}`);
  if (VERBOSE) console.error(err);
  process.exit(1);
});