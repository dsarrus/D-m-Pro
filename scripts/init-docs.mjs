#!/usr/bin/env node
// scripts/init-docs.mjs

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

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

/* ================================================================
 * UTILITAIRES
 * ================================================================ */

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  skip: (msg) => console.log(`${colors.gray}○${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${msg}${colors.reset}`),
};

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir) {
  if (DRY_RUN) return;
  await mkdir(dir, { recursive: true });
}

async function writeFileSafe(path, content, label) {
  const exists = await fileExists(path);

  if (exists && !FORCE) {
    log.skip(`${label} existe déjà (utilise --force pour écraser)`);
    return { written: false, skipped: true };
  }

  if (DRY_RUN) {
    log.info(`[DRY-RUN] Écrirait ${path}`);
    return { written: false, skipped: false, dryRun: true };
  }

  await writeFile(path, content.trim() + "\n", "utf-8");
  log.success(`${label} ${exists ? "(écrasé)" : "(créé)"}`);
  return { written: true, skipped: false };
}

/* ================================================================
 * CONTENU DES FICHIERS
 * ================================================================ */

const FILES = {
  /* --------------------------------------------------------------
   * README.md (racine)
   * -------------------------------------------------------------- */
  "README.md": `
# DɛmɛPro

Plateforme e-commerce B2B/B2C pour artisans et professionnels du Mali.

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

## Structure du monorepo

\`\`\`
demepro/
├── apps/
│   ├── api/          # Backend Express + Prisma
│   ├── web/          # Frontend client (Next.js)
│   └── admin/        # Backoffice admin
├── packages/         # Code partagé (types, utils)
├── prisma/           # Schéma Prisma + migrations
└── docs/             # Documentation
\`\`\`

## Démarrage rapide

\`\`\`bash
# 1. Installer les dépendances
pnpm install

# 2. Configurer l'environnement
cp .env.example .env

# 3. Démarrer PostgreSQL
pnpm docker:up

# 4. Appliquer les migrations
pnpm db:migrate

# 5. Générer le client Prisma
pnpm db:generate

# 6. Lancer en dev
pnpm dev
\`\`\`

## Commandes utiles

| Commande | Description |
|---|---|
| \`pnpm dev\` | Lance web + api + admin en parallèle |
| \`pnpm build\` | Build tous les packages |
| \`pnpm test\` | Lance tous les tests |
| \`pnpm test:unit\` | Tests unitaires uniquement |
| \`pnpm test:integration\` | Tests d'intégration (Testcontainers) |
| \`pnpm db:migrate\` | Applique les migrations |
| \`pnpm db:studio\` | Ouvre Prisma Studio |
| \`pnpm db:seed\` | Seed la base |

## Documentation

- [Architecture globale](./docs/ARCHITECTURE.md)
- [Conventions de code](./docs/CONVENTIONS.md)
- [Roadmap fonctionnelle](./docs/ROADMAP.md)
- [État des modules](./docs/modules/README.md)

## Statut du projet

**Phase actuelle** : Développement actif — Module Catalog validé

| Module | Statut | Couverture tests |
|---|---|---|
| Catalog | ✅ Validé | 97 tests |
| Store | ⚠️ Partiel | — |
| Category | ⚠️ Partiel | — |
| Order | ❌ À faire | — |
| Payment | ❌ À faire | — |
| Auth / RBAC | ✅ Existant | — |

Voir [CHANGELOG.md](./CHANGELOG.md) pour l'historique détaillé.
`,

  /* --------------------------------------------------------------
   * CHANGELOG.md
   * -------------------------------------------------------------- */
  "CHANGELOG.md": `
# Changelog

Toutes les modifications notables du projet sont documentées ici.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnement selon [Semantic Versioning](https://semver.org/lang/fr/).

---

## [Unreleased]

### En cours
- Finalisation du module Catalog (contrôleurs HTTP + tests E2E)

### Prévu
- Module Order (réservation de stock, cycle de vie commande)
- Module Payment
- Tests E2E HTTP sur Catalog

---

## [0.3.0] — 2026-10-10

### Ajouté — Module Catalog : cœur transactionnel validé

#### Services
- \`ProductService\` — CRUD complet, création atomique, idempotence
- \`ProductVariantService\` — CRUD, SKU unique, gestion \`hasVariants\`
- \`ProductImageService\` — cohérence primaire, réordonnancement
- \`InventoryService\` — réservation atomique, commit, release
- \`IdempotencyService\` — anti-double-soumission avec scope composite

#### Repositories
- \`ProductRepository\`
- \`ProductVariantRepository\`
- \`ProductImageRepository\`
- \`InventoryRepository\` — méthodes SQL atomiques

#### Contraintes base de données
- SKU unique global sur \`ProductVariant\`
- Slug unique par store sur \`Product\`
- Contrainte XOR sur \`Inventory\`
- Champ \`requestHash\` sur \`IdempotencyKey\`
- Clé composite \`(key, scope)\` sur \`IdempotencyKey\`

#### Tests d'intégration (97 tests sur PostgreSQL réel)

Voir [docs/modules/catalog.md](./docs/modules/catalog.md) pour le détail.

### Modifié
- \`CatalogError\` : passage de \`type union\` à \`objet const as const\`
- \`IdempotencyService\` : alignement sur clé composite \`(key, scope)\`

### Corrigé
- \`InventoryService.reserve()\` : condition \`reserved <= 0\` supprimée
- \`ProductImageService.createImage()\` : première image primaire auto
- \`ProductImageService.updateImage()\` : refus retrait primaire sans successeur

---

## [0.2.0] — 2026-09-XX

### Ajouté
- Module Auth (JWT + RBAC)
- Module Store (partiel)
- Module Category (partiel)
- Schéma Prisma initial

---

## [0.1.0] — 2026-09-XX

### Ajouté
- Initialisation du monorepo pnpm
- Configuration TypeScript, ESLint, Prettier
- Setup Vitest
`,

  /* --------------------------------------------------------------
   * docs/ARCHITECTURE.md
   * -------------------------------------------------------------- */
  "docs/ARCHITECTURE.md": `
# Architecture DɛmɛPro

## Vue d'ensemble

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │   web    │  │  admin   │  │  mobile  │  (à venir)        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │      API Express         │
        │   apps/api               │
        │                          │
        │  ┌────────────────────┐  │
        │  │   Routes           │  │
        │  ├────────────────────┤  │
        │  │   Controllers      │  │
        │  ├────────────────────┤  │
        │  │   Services         │  │
        │  ├────────────────────┤  │
        │  │   Repositories     │  │
        │  └─────────┬──────────┘  │
        └────────────┼─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │      PostgreSQL 16       │
        │      via Prisma 7        │
        └──────────────────────────┘
\`\`\`

## Principes architecturaux

### 1. Séparation en couches

| Couche | Responsabilité | Ne fait jamais |
|---|---|---|
| **Route** | Wiring HTTP + middlewares | Logique métier |
| **Controller** | Décodage requête, format réponse | Accès DB direct |
| **Service** | Logique métier + transactions | Accès HTTP |
| **Repository** | Accès données | Logique métier |

### 2. Transactions atomiques

Toute opération qui touche **plusieurs tables** ou qui **vérifie puis écrit** passe par une transaction PostgreSQL.

Niveaux d'isolation utilisés :
- **Read Committed** (défaut) : lectures simples
- **Serializable** : opérations critiques

Retry automatique sur \`P2034\` (3 tentatives, backoff exponentiel).

### 3. Idempotence

Header \`Idempotency-Key\` supporté sur les endpoints de création sensibles.
Clé composite \`(key, scope)\` en DB, TTL 24h.

### 4. Réservation de stock atomique

\`\`\`sql
UPDATE "inventory"
SET "reserved" = "reserved" + $1
WHERE "id" = $2::uuid
  AND "quantity" - "reserved" >= $1
RETURNING "id";
\`\`\`

Aucune race condition possible.

## Sécurité

### Auth
- JWT Bearer Token
- Middleware \`authenticate\` injecte \`req.user\`

### RBAC
- Permissions granulaires : \`catalog.product.create\`, etc.
- Middleware \`requirePermission\`

### Ownership
- Chaque service vérifie \`product.store.professional.userId === ctx.userId\`
- Erreur \`UNAUTHORIZED_STORE\` (403)

## Performance

### Index critiques
- \`Product(storeId, slug)\` — unicité slug
- \`ProductVariant(sku)\` — unicité SKU
- \`Inventory(productId)\` / \`Inventory(variantId)\`
- \`IdempotencyKey(key, scope)\`

### Optimisations
- \`createMany\` pour les inserts batch
- Pagination par curseur (\`createdAt desc\`)
- Limite \`limit + 1\` pour détecter la page suivante

## Tests

| Type | Outil | Base |
|---|---|---|
| Unitaires | Vitest | Aucune |
| Intégration | Vitest + Testcontainers | PostgreSQL éphémère |
| E2E | Vitest + Supertest | PostgreSQL + serveur HTTP |
`,

  /* --------------------------------------------------------------
   * docs/CONVENTIONS.md
   * -------------------------------------------------------------- */
  "docs/CONVENTIONS.md": `
# Conventions de code DɛmɛPro

## Nommage

### Fichiers

| Type | Convention | Exemple |
|---|---|---|
| Service | \`kebab-case.service.ts\` | \`product.service.ts\` |
| Repository | \`kebab-case.repository.ts\` | \`inventory.repository.ts\` |
| Controller | \`kebab-case.controller.ts\` | \`product.controller.ts\` |
| Routes | \`kebab-case.routes.ts\` | \`productVariant.routes.ts\` |
| DTO | \`kebab-case.dto.ts\` | \`product-image.dto.ts\` |
| Erreur | \`kebab-case.ts\` | \`catalog-error.ts\` |
| Test | \`*.integration.test.ts\` ou \`*.test.ts\` | — |

### Classes

- **PascalCase** : \`ProductService\`, \`InventoryRepository\`
- **Suffixes** : \`Service\`, \`Repository\`, \`Controller\`

### Méthodes

- **camelCase** : \`createProduct\`, \`updateVariant\`
- **Prefix \`try\`** pour les méthodes qui peuvent échouer silencieusement : \`tryReserve\`
- **Prefix \`assert\`** pour les validations : \`assertSkuIsFree\`
- **Prefix \`load\`** pour les chargements vérifiés : \`loadAuthorizedProduct\`

### Constantes

- **SCREAMING_SNAKE_CASE** : \`SERIALIZABLE_MAX_ATTEMPTS\`

## Structure d'un service

\`\`\`typescript
export class XxxService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: XxxRepository,
  ) {}

  /* HELPERS PRIVÉS */
  private async helperMethod() { ... }

  /* OPÉRATIONS PUBLIQUES */
  async publicMethod(dto: XxxDto, ctx: AuthContext) { ... }
}
\`\`\`

## Signature des méthodes publiques

### Convention \`(dto, ctx)\`

\`\`\`typescript
// ✅ Correct
async createProduct(dto: CreateProductDto, ctx: AuthContext)
async updateProduct(id: string, dto: UpdateProductDto, ctx: AuthContext)
async archiveProduct(id: string, ctx: AuthContext)

// ❌ Faux
async createProduct(dto: CreateProductDto, userId: string)
\`\`\`

### Type \`AuthContext\`

\`\`\`typescript
export type AuthContext = {
  userId: string;
  permissions?: string[];
};
\`\`\`

## Gestion des erreurs

\`\`\`typescript
throw new CatalogError(
  CatalogErrorCode.PRODUCT_NOT_FOUND,
  "Produit introuvable.",
);
\`\`\`

### Code d'erreur en objet \`as const\`

\`\`\`typescript
// ✅ Correct — utilisable runtime ET comme type
export const CatalogErrorCode = {
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
} as const;

export type CatalogErrorCode =
  (typeof CatalogErrorCode)[keyof typeof CatalogErrorCode];
\`\`\`

### Mapping \`P2002\` / \`P2034\`

\`\`\`typescript
try {
  return await this.withSerializableRetry(() =>
    this.prisma.$transaction(..., { isolationLevel: "Serializable" })
  );
} catch (error) {
  mapCatalogPrismaError(error);
}
\`\`\`

## Transactions

### Règles

1. **Toute opération multi-tables** passe par \`$transaction\`
2. **Toute vérification + écriture** passe par \`$transaction\`
3. **Isolation \`Serializable\`** pour les opérations critiques
4. **Retry automatique** sur \`P2034\`

### Pattern standard

\`\`\`typescript
private async withSerializableRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = SERIALIZABLE_MAX_ATTEMPTS,
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

## Validation Zod

- **DTO** : validation au niveau route
- **Service** : règles métier supplémentaires
- **DB** : contraintes (\`@unique\`, \`CHECK\`)

## Tests

### Structure d'un test d'intégration

\`\`\`typescript
describe("XxxService (integration)", () => {
  let prisma: PrismaClient;
  let service: XxxService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;
    service = new XxxService(prisma);
  });

  afterAll(async () => {
    await stopPostgres();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  describe("methodName", () => {
    it("description courte", async () => {
      // Arrange / Act / Assert
    });
  });
});
\`\`\`

## Format des réponses HTTP

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

## Codes HTTP utilisés

| Situation | Code |
|---|---|
| Création réussie | 201 |
| Lecture / update / delete | 200 |
| Validation Zod échouée | 400 |
| Non authentifié | 401 |
| Non autorisé | 403 |
| Ressource introuvable | 404 |
| Conflit (slug, SKU, idempotence) | 409 |
| État invalide | 422 |
| Erreur interne | 500 |
`,

  /* --------------------------------------------------------------
   * docs/ROADMAP.md
   * -------------------------------------------------------------- */
  "docs/ROADMAP.md": `
# Roadmap DɛmɛPro

## Vue d'ensemble

\`\`\`
Phase 1 ─ Foundation          [████████████████████] 100% ✅
Phase 2 ─ Catalog             [███████████████████░]  95% 🚧
Phase 3 ─ Order & Payment     [░░░░░░░░░░░░░░░░░░░░]   0% ❌
Phase 4 ─ Store & Category    [███░░░░░░░░░░░░░░░░░]  15% ⚠️
Phase 5 ─ Notifications       [░░░░░░░░░░░░░░░░░░░░]   0% ❌
Phase 6 ─ Analytics & Admin   [░░░░░░░░░░░░░░░░░░░░]   0% ❌
\`\`\`

---

## Phase 1 — Foundation ✅

- [x] Monorepo pnpm
- [x] TypeScript, ESLint, Prettier
- [x] Prisma + PostgreSQL
- [x] Auth JWT
- [x] RBAC
- [x] Tests Vitest + Testcontainers

---

## Phase 2 — Catalog 🚧

### Validé
- [x] ProductService (25 tests)
- [x] ProductVariantService (18 tests)
- [x] ProductImageService (28 tests)
- [x] InventoryService (21 tests)
- [x] IdempotencyService
- [x] Contraintes DB (SKU, slug, XOR)

### En cours
- [ ] InventoryController + routes
- [ ] ProductImageController complet
- [ ] catalog.routes.ts principal
- [ ] Tests E2E Supertest

### Dette technique
- [ ] Uniformiser \`errors/catalog-error.ts\` vs \`errors/CatalogError.ts\`
- [ ] Uniformiser \`dtos/\` vs \`dto/\`
- [ ] Extraire \`withSerializableRetry\` en utilitaire partagé
- [ ] Extraire \`AuthContext\` en type global

---

## Phase 3 — Order & Payment ❌

### Order
- [ ] Modèle \`Order\` + \`OrderItem\`
- [ ] Cycle de vie : PENDING → PAID → SHIPPED → DELIVERED → CANCELLED
- [ ] Réservation de stock à la création
- [ ] Commit au paiement
- [ ] Release sur annulation
- [ ] Tests de concurrence (2 commandes sur le même stock)

### Payment
- [ ] Intégration provider (Orange Money, Wave, etc.)
- [ ] Webhook de confirmation
- [ ] Remboursement

---

## Phase 4 — Store & Category ⚠️

### Store
- [ ] CRUD complet
- [ ] Vérification professional
- [ ] Statut (ACTIVE, SUSPENDED)
- [ ] Horaires d'ouverture

### Category
- [ ] Hiérarchie (parent/enfant)
- [ ] Filtres
- [ ] Rattachement aux verticals

---

## Phase 5 — Notifications ❌

- [ ] Email transactionnel
- [ ] SMS
- [ ] Push notifications
- [ ] Templates

---

## Phase 6 — Analytics & Admin ❌

- [ ] Dashboard ventes
- [ ] Statistiques produits
- [ ] Export CSV
- [ ] Backoffice admin
`,

  /* --------------------------------------------------------------
   * docs/modules/README.md
   * -------------------------------------------------------------- */
  "docs/modules/README.md": `
# Modules DɛmɛPro

Index des modules métier du projet.

## Statuts

| Statut | Signification |
|---|---|
| ✅ | Validé — services + tests complets |
| ⚠️ | Partiel — en cours |
| ❌ | À faire |
| 🚧 | En développement actif |

## Liste des modules

| Module | Statut | Tests | Documentation |
|---|---|---|---|
| **Auth** | ✅ | — | — |
| **RBAC** | ✅ | — | — |
| **Catalog** | ✅ | 97 | [catalog.md](./catalog.md) |
| **Store** | ⚠️ | 0 | [store.md](./store.md) |
| **Category** | ⚠️ | 0 | — |
| **Order** | ❌ | 0 | [order.md](./order.md) |
| **Payment** | ❌ | 0 | — |
| **Notification** | ❌ | 0 | — |

## Dépendances entre modules

\`\`\`
Auth ──┐
       │
RBAC ──┼──► Catalog ──► Order ──► Payment
       │        │          │
Store ─┘        │          │
                │          │
Category ───────┘          │
                           │
Notification ◄─────────────┘
\`\`\`

## Prochaines priorités

1. **Finaliser HTTP Catalog** — contrôleurs + routes + tests E2E
2. **Module Order** — utilise \`InventoryService.reserve/commit\`
3. **Module Store complet** — CRUD, vérification pro
4. **Module Category complet** — hiérarchie, filtres
`,

  /* --------------------------------------------------------------
   * docs/modules/catalog.md
   * -------------------------------------------------------------- */
  "docs/modules/catalog.md": `
# Module Catalog

Gestion des produits, variantes, images et inventaire.

## Statut

| Aspect | État |
|---|---|
| Services | ✅ Complets |
| Repositories | ✅ Complets |
| DTOs | ✅ Complets |
| Contraintes DB | ✅ En place |
| Tests d'intégration | ✅ 97 tests |
| Contrôleurs HTTP | ⚠️ Partiels |
| Tests E2E | ❌ À faire |

## Structure

\`\`\`
apps/api/src/modules/catalog/
├── controllers/
│   ├── product.controller.ts              ✅
│   ├── product-variant.controller.ts      ✅
│   ├── product-image.controller.ts        ⚠️
│   └── inventory.controller.ts            ❌
│
├── services/
│   ├── product.service.ts                 ✅
│   ├── product-variant.service.ts         ✅
│   ├── product-image.service.ts           ✅
│   ├── inventory.service.ts               ✅
│   └── idempotency.service.ts             ✅
│
├── repositories/
│   ├── product.repository.ts              ✅
│   ├── product-variant.repository.ts      ✅
│   ├── product-image.repository.ts        ✅
│   └── inventory.repository.ts            ✅
│
├── errors/
│   ├── catalog-error.ts                   ✅
│   └── catalog-prisma-error.ts            ✅
│
├── dtos/
│   ├── common.dto.ts                      ✅
│   ├── product.dto.ts                     ✅
│   ├── productVariant.dto.ts              ✅
│   ├── productImage.dto.ts                ✅
│   └── inventory.dto.ts                   ✅
│
└── routes/
    ├── product.routes.ts                  ✅
    ├── productVariant.routes.ts           ✅
    ├── productImage.routes.ts             ⚠️
    ├── inventory.routes.ts                ❌
    └── catalog.routes.ts                  ❌
\`\`\`

## Modèle de données

### Product

| Champ | Type | Contrainte |
|---|---|---|
| id | UUID | PK |
| storeId | UUID | FK → Store |
| categoryId | UUID | FK → Category |
| name | String | — |
| slug | String | unique par store |
| sku | String? | nullable |
| status | Enum | DRAFT/ACTIVE/OUT_OF_STOCK/INACTIVE/ARCHIVED |
| hasVariants | Boolean | défaut false |
| price | Decimal? | null si hasVariants |
| currency | String | défaut XOF |

### ProductVariant

| Champ | Type | Contrainte |
|---|---|---|
| id | UUID | PK |
| productId | UUID | FK → Product |
| name | String | — |
| sku | String? | unique global |
| price | Decimal | — |
| isActive | Boolean | défaut true |

### ProductImage

| Champ | Type | Contrainte |
|---|---|---|
| id | UUID | PK |
| productId | UUID | FK → Product |
| objectKey | String | — |
| sortOrder | Int | — |
| isPrimary | Boolean | défaut false |

### Inventory

| Champ | Type | Contrainte |
|---|---|---|
| id | UUID | PK |
| productId | UUID? | XOR avec variantId |
| variantId | UUID? | XOR avec productId |
| quantity | Int | >= 0 |
| reserved | Int | >= 0 |

## Codes d'erreur

| Code | HTTP |
|---|---|
| \`PRODUCT_NOT_FOUND\` | 404 |
| \`PRODUCT_VARIANT_NOT_FOUND\` | 404 |
| \`PRODUCT_IMAGE_NOT_FOUND\` | 404 |
| \`INVENTORY_NOT_FOUND\` | 404 |
| \`STORE_NOT_FOUND\` | 404 |
| \`CATEGORY_NOT_FOUND\` | 404 |
| \`UNAUTHORIZED_STORE\` | 403 |
| \`DUPLICATE_SLUG\` | 409 |
| \`DUPLICATE_SKU\` | 409 |
| \`IDEMPOTENCY_CONFLICT\` | 409 |
| \`INVALID_PRODUCT_STATE\` | 422 |
| \`INVALID_INVENTORY_QUANTITY\` | 422 |
| \`PRODUCT_HAS_NO_VARIANTS\` | 422 |
| \`VARIANTS_EXIST\` | 422 |
| \`LAST_ACTIVE_VARIANT\` | 422 |

## Tests

| Fichier | Tests |
|---|---|
| \`product.service.integration.test.ts\` | 25 |
| \`product-variant.service.integration.test.ts\` | 18 |
| \`product-image.service.integration.test.ts\` | 28 |
| \`inventory.service.integration.test.ts\` | 21 |
| **Total** | **92+** |

### Lancement

\`\`\`bash
pnpm --filter @demepro/api test:integration
\`\`\`

## TODO

- [ ] \`InventoryController\` + routes
- [ ] \`ProductImageController\` complet + routes
- [ ] \`catalog.routes.ts\` principal
- [ ] Tests E2E HTTP (Supertest)
- [ ] Uniformiser \`errors/\`
- [ ] Extraire \`withSerializableRetry\`
- [ ] Extraire \`AuthContext\`
`,

  /* --------------------------------------------------------------
   * docs/modules/store.md
   * -------------------------------------------------------------- */
  "docs/modules/store.md": `
# Module Store

Gestion des boutiques et des professionnels.

## Statut

⚠️ **Partiel** — modèle Prisma existant, services à compléter.

## Modèle

### Store

| Champ | Type |
|---|---|
| id | UUID |
| professionalId | UUID |
| name | String |
| slug | String |
| status | Enum (ACTIVE, SUSPENDED, CLOSED) |

### ProfessionalProfile

| Champ | Type |
|---|---|
| id | UUID |
| userId | UUID |
| businessName | String |
| slug | String |
| verificationStatus | Enum |

## TODO

- [ ] \`StoreService\`
- [ ] \`StoreController\`
- [ ] \`store.routes.ts\`
- [ ] Tests d'intégration
- [ ] Vérification professional
`,

  /* --------------------------------------------------------------
   * docs/modules/order.md
   * -------------------------------------------------------------- */
  "docs/modules/order.md": `
# Module Order

Gestion des commandes et du cycle de vie.

## Statut

❌ **À faire** — blueprint ci-dessous.

## Modèle prévu

### Order

| Champ | Type |
|---|---|
| id | UUID |
| userId | UUID |
| storeId | UUID |
| status | Enum |
| totalAmount | Decimal |
| currency | String |
| idempotencyKey | String |

### OrderItem

| Champ | Type |
|---|---|
| id | UUID |
| orderId | UUID |
| variantId | UUID? |
| productId | UUID? |
| quantity | Int |
| unitPrice | Decimal |

## Cycle de vie

\`\`\`
PENDING ──► PAID ──► SHIPPED ──► DELIVERED
   │         │
   │         └──► REFUNDED
   │
   └──► CANCELLED
\`\`\`

## Interactions avec Catalog

### Création
\`\`\`typescript
// Pour chaque item :
await inventoryService.reserve(inventoryId, quantity);
\`\`\`

### Paiement confirmé
\`\`\`typescript
// Pour chaque item :
await inventoryService.commitReservation(inventoryId, quantity);
\`\`\`

### Annulation
\`\`\`typescript
// Pour chaque item :
await inventoryService.release(inventoryId, quantity);
\`\`\`

## TODO

- [ ] Modèle Prisma \`Order\` + \`OrderItem\`
- [ ] \`OrderService\` avec transactions
- [ ] Cycle de vie complet
- [ ] Intégration \`InventoryService\`
- [ ] Tests de concurrence
- [ ] \`OrderController\` + routes
`,

  /* --------------------------------------------------------------
   * docs/modules/TEMPLATE.md
   * -------------------------------------------------------------- */
  "docs/modules/TEMPLATE.md": `
# Module [NOM]

[Description courte]

## Statut

| Aspect | État |
|---|---|
| Services | — |
| Repositories | — |
| DTOs | — |
| Contraintes DB | — |
| Tests d'intégration | — |
| Contrôleurs HTTP | — |
| Tests E2E | — |

## Structure

\`\`\`
apps/api/src/modules/[nom]/
├── controllers/
├── services/
├── repositories/
├── errors/
├── dtos/
└── routes/
\`\`\`

## Modèle de données

### [Entité]

| Champ | Type | Contrainte |
|---|---|---|
| id | UUID | PK |

## Codes d'erreur

| Code | HTTP |
|---|---|
| — | — |

## Services — API publique

\`\`\`typescript
class [Nom]Service {
  // ...
}
\`\`\`

## Tests

| Fichier | Tests |
|---|---|
| — | — |

## Décisions techniques

- —

## TODO

- [ ] —
`,
};

/* ================================================================
 * MAIN
 * ================================================================ */

async function main() {
  console.log(
    `\n${colors.bold}📚 Génération de la documentation DɛmɛPro${colors.reset}`,
  );
  console.log(`${colors.gray}Racine : ${ROOT}${colors.reset}`);

  if (DRY_RUN) {
    log.warn("Mode DRY-RUN — aucun fichier ne sera écrit");
  }
  if (FORCE) {
    log.warn("Mode FORCE — les fichiers existants seront écrasés");
  }

  /* Créer les dossiers nécessaires */
  const dirs = new Set();
  for (const relPath of Object.keys(FILES)) {
    dirs.add(dirname(join(ROOT, relPath)));
  }

  log.header("📁 Création des dossiers");
  for (const dir of dirs) {
    await ensureDir(dir);
    if (VERBOSE) log.info(`Dossier : ${dir}`);
  }
  log.success(`${dirs.size} dossier(s) prêt(s)`);

  /* Écrire les fichiers */
  log.header("📝 Écriture des fichiers");
  const stats = { written: 0, skipped: 0, dryRun: 0 };

  for (const [relPath, content] of Object.entries(FILES)) {
    const absPath = join(ROOT, relPath);
    const label = relPath;

    try {
      const result = await writeFileSafe(absPath, content, label);
      if (result.written) stats.written++;
      else if (result.skipped) stats.skipped++;
      else if (result.dryRun) stats.dryRun++;
    } catch (error) {
      log.error(`Erreur sur ${label}: ${error.message}`);
    }
  }

  /* Résumé */
  log.header("📊 Résumé");
  console.log(`  ${colors.green}Écrits   :${colors.reset} ${stats.written}`);
  console.log(`  ${colors.gray}Ignorés  :${colors.reset} ${stats.skipped}`);
  if (DRY_RUN) {
    console.log(`  ${colors.cyan}Dry-run  :${colors.reset} ${stats.dryRun}`);
  }
  console.log(
    `  ${colors.bold}Total    :${colors.reset} ${Object.keys(FILES).length}`,
  );

  if (stats.skipped > 0 && !FORCE) {
    log.warn(
      `Utilise ${colors.bold}--force${colors.reset} pour écraser les fichiers existants`,
    );
  }

  log.success("\n✨ Documentation prête !\n");
}

main().catch((error) => {
  log.error(`Échec : ${error.message}`);
  if (VERBOSE) console.error(error);
  process.exit(1);
});
