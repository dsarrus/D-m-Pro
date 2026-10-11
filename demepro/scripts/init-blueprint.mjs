#!/usr/bin/env node
// scripts/init-blueprint.mjs

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, join } from "node:path";
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

  await writeFile(path, content.trimEnd() + "\n", "utf-8");
  log.ok(`${label} ${has ? "(écrasé)" : ""}`);
  return "write";
}

/* ================================================================
 * TEMPLATES DE BASE
 * ================================================================ */

const header = (title, section) => `# ${title}

> **Section** : ${section}
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : ${TODAY}
`;

const docStatus = `## Statut du document

| Champ | Valeur |
|---|---|
| Version | 0.1.0 |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | ${TODAY} |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| ${TODAY} | 0.1.0 | Création initiale | — |
`;

const template = {
  /* ----- README de section ----- */
  sectionReadme: (title, description, files) => `${header(title, "Index")}
${description}

## Contenu de cette section

${files.map((f) => `- [\`${f}\`](./${f})`).join("\n")}

## Navigation

- ⬅️ [Index général](../00-index/README.md)
- ➡️ [Document suivant](./${files[0]})

---

${docStatus}
`,

  /* ----- Vision produit ----- */
  vision: `${header("Vision produit", "01-product")}
## En une phrase

> [Décrire la vision en une phrase percutante]

## Vision long terme (3-5 ans)

[Où voulons-nous être dans 3-5 ans ?]

## Mission

[Quelle est notre mission ?]

## Valeurs

1. **[Valeur 1]** — [Description]
2. **[Valeur 2]** — [Description]
3. **[Valeur 3]** — [Description]

## Ce que nous ne ferons PAS

- [Anti-objectif 1]
- [Anti-objectif 2]

---

${docStatus}
`,

  /* ----- Problème ----- */
  problem: `${header("Problème", "01-product")}
## Contexte

[Quel est le contexte actuel du marché ?]

## Problèmes identifiés

### Problème 1 — [Titre]

- **Qui** : [Utilisateur concerné]
- **Quoi** : [Description du problème]
- **Impact** : [Conséquence]
- **Fréquence** : [Occasionnel / Récurrent / Permanent]

### Problème 2 — [Titre]

[Idem]

## Solutions existantes et leurs limites

| Solution | Limites |
|---|---|
| [Solution A] | [Limite] |
| [Solution B] | [Limite] |

## Opportunité

[Pourquoi maintenant ? Pourquoi nous ?]

---

${docStatus}
`,

  /* ----- Utilisateurs ----- */
  users: `${header("Utilisateurs", "01-product")}
## Personas

### Persona 1 — [Nom]

- **Âge** : —
- **Rôle** : —
- **Localisation** : —
- **Objectifs** : —
- **Frustrations** : —
- **Besoins** : —

### Persona 2 — [Nom]

[Idem]

## Segments

| Segment | Taille | Priorité |
|---|---|---|
| — | — | — |

## Parcours utilisateur

### Parcours 1 — [Nom]

\`\`\`
[Découverte] → [Inscription] → [Usage] → [Fidélisation]
\`\`\`

---

${docStatus}
`,

  /* ----- Value proposition ----- */
  valueProp: `${header("Proposition de valeur", "01-product")}
## Pour [utilisateur cible]

## Qui [a besoin de]

## Notre produit est [catégorie]

## Qui [bénéfice clé]

## Contrairement à [concurrent]

## Notre produit [différenciation]

## Matrice de valeur

| Bénéfice | Pour qui | Preuve |
|---|---|---|
| — | — | — |

---

${docStatus}
`,

  /* ----- Business model ----- */
  businessModel: `${header("Modèle économique", "01-product")}
## Sources de revenus

| Source | Description | Part estimée |
|---|---|---|
| Commission | — | — % |
| Abonnement | — | — % |
| Publicité | — | — % |

## Structure de coûts

| Poste | Description | Part estimée |
|---|---|---|
| Infrastructure | — | — % |
| Équipe | — | — % |
| Marketing | — | — % |

## Pricing

### Plan [Nom]

- **Prix** : —
- **Cible** : —
- **Inclus** : —

## Projections financières

| Année | Revenus | Coûts | Marge |
|---|---|---|---|
| An 1 | — | — | — |
| An 2 | — | — | — |

---

${docStatus}
`,

  /* ----- Verticals ----- */
  verticals: `${header("Verticals (secteurs)", "01-product")}
## Verticals supportés

| Code | Nom | Statut | Priorité |
|---|---|---|---|
| ARTISANS | Artisans | ✅ Actif | P0 |
| — | — | — | — |

## Détail par vertical

### ARTISANS — Artisans

- **Description** : —
- **Catégories typiques** : —
- **Spécificités** : —

## Critères d'ajout d'un nouveau vertical

1. —
2. —

---

${docStatus}
`,

  /* ----- MVP ----- */
  mvp: `${header("MVP (Minimum Viable Product)", "01-product")}
## Périmètre

### Inclus

- [ ] —
- [ ] —

### Exclus (backlog)

- [ ] —
- [ ] —

## User stories critiques

| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-001 | — | — | — | P0 |

## Critères de sortie

- [ ] —
- [ ] —

## Timeline

| Phase | Durée | Livrable |
|---|---|---|
| Alpha | — | — |
| Beta | — | — |
| GA | — | — |

---

${docStatus}
`,

  /* ----- Success metrics ----- */
  successMetrics: `${header("Métriques de succès", "01-product")}
## North Star Metric

**[Métrique]** — [Description]

## Métriques par catégorie

### Acquisition

| Métrique | Cible | Mesure |
|---|---|---|
| — | — | — |

### Activation

| Métrique | Cible | Mesure |
|---|---|---|
| — | — | — |

### Rétention

| Métrique | Cible | Mesure |
|---|---|---|
| — | — | — |

### Revenu

| Métrique | Cible | Mesure |
|---|---|---|
| — | — | — |

### Référence

| Métrique | Cible | Mesure |
|---|---|---|
| — | — | — |

---

${docStatus}
`,

  /* ----- Exigences fonctionnelles ----- */
  functionalReq: `${header("Exigences fonctionnelles", "02-requirements")}
## Format

Chaque exigence est identifiée par \`FR-XXX\` et suit le format :

> **FR-XXX** — [Titre]
> **Priorité** : Must / Should / Could / Won't
> **Description** : —
> **Critères d'acceptation** : —

## Liste

### Module Auth

**FR-001** — Inscription utilisateur
- **Priorité** : Must
- **Description** : —
- **Critères** : —

### Module Catalog

**FR-010** — Créer un produit
- **Priorité** : Must
- **Description** : —
- **Critères** : —

### Module Order

**FR-020** — Passer commande
- **Priorité** : Must
- **Description** : —
- **Critères** : —

---

${docStatus}
`,

  /* ----- Exigences non-fonctionnelles ----- */
  nonFunctionalReq: `${header("Exigences non-fonctionnelles", "02-requirements")}
## Performance

| Exigence | Cible | Mesure |
|---|---|---|
| Temps de réponse API (p95) | < 300ms | — |
| Temps de chargement page | < 2s | — |

## Scalabilité

| Exigence | Cible |
|---|---|
| Utilisateurs simultanés | — |
| Requêtes/seconde | — |

## Disponibilité

| Exigence | Cible |
|---|---|
| Uptime | 99.9% |
| RTO | — |
| RPO | — |

## Sécurité

| Exigence | Description |
|---|---|
| — | — |

## Accessibilité

| Exigence | Cible |
|---|---|
| WCAG | AA |

---

${docStatus}
`,

  /* ----- Business rules ----- */
  businessRules: `${header("Règles métier", "02-requirements")}
## Format

Chaque règle est identifiée par \`BR-XXX\`.

## Règles par domaine

### Catalog

**BR-CAT-001** — Un produit avec variantes ne peut pas avoir de prix direct.
- **Contexte** : —
- **Règle** : \`hasVariants = true\` ⟹ \`price = null\`
- **Exception** : —

**BR-CAT-002** — Le SKU est unique globalement.
- **Contexte** : —
- **Règle** : Contrainte \`@unique\` sur \`ProductVariant.sku\`

**BR-CAT-003** — Une seule image primaire par produit.
- **Règle** : Au plus un \`ProductImage.isPrimary = true\` par \`productId\`

**BR-CAT-004** — Le stock réservé ne peut pas dépasser le stock total.
- **Règle** : \`reserved <= quantity\` (invariant)

### Order

**BR-ORD-001** — — 

---

${docStatus}
`,

  /* ----- Permissions matrix ----- */
  permissionsMatrix: `${header("Matrice de permissions", "02-requirements")}
## Rôles

| Rôle | Description |
|---|---|
| CLIENT | Utilisateur final |
| PROFESSIONAL | Commerçant |
| ADMIN | Administrateur |
| SUPER_ADMIN | Super administrateur |

## Matrice

| Permission | CLIENT | PROFESSIONAL | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| \`catalog.product.create\` | ❌ | ✅ | ✅ | ✅ |
| \`catalog.product.update\` | ❌ | ✅ | ✅ | ✅ |
| \`catalog.product.delete\` | ❌ | ✅ | ✅ | ✅ |
| \`catalog.product.read\` | ✅ | ✅ | ✅ | ✅ |
| \`order.create\` | ✅ | ❌ | ❌ | ✅ |
| — | — | — | — | — |

## Convention de nommage

\`\`\`
<module>.<entité>.<action>
\`\`\`

Exemples :
- \`catalog.product.create\`
- \`order.payment.confirm\`
- \`admin.user.suspend\`

---

${docStatus}
`,

  /* ----- Acceptance criteria ----- */
  acceptance: `${header("Critères d'acceptation", "02-requirements")}
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

## Scénarios critiques

### Création de produit

\`\`\`gherkin
Scenario: Créer un produit simple
  Given un professionnel authentifié
  And une boutique dont il est propriétaire
  When il crée un produit avec hasVariants=false et price=15000
  Then le produit est créé avec status=DRAFT
  And le prix est 15000
\`\`\`

### Commande

[À compléter]

---

${docStatus}
`,

  /* ----- Domain overview ----- */
  domainOverview: `${header("Vue d'ensemble du domaine", "03-domain")}
## Carte des domaines

\`\`\`
┌───────────────────────────────────────────────┐
│              DɛmɛPro Domain                   │
├───────────────────────────────────────────────┤
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Catalog  │  │  Order   │  │ Payment  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │           │
│       └─────────────┴─────────────┘           │
│                     │                         │
│              ┌──────┴──────┐                  │
│              │    Store    │                  │
│              └─────────────┘                  │
│                                               │
└───────────────────────────────────────────────┘
\`\`\`

## Domaines

| Domaine | Responsabilité | Statut |
|---|---|---|
| Catalog | Produits, variantes, images, stock | ✅ |
| Order | Commandes, cycle de vie | ❌ |
| Payment | Transactions, remboursements | ❌ |
| Store | Boutiques, professionnels | ⚠️ |

## Contextes bornés (Bounded Contexts)

- —

---

${docStatus}
`,

  /* ----- Actors ----- */
  actors: `${header("Acteurs", "03-domain")}
## Acteurs humains

| Acteur | Description | Permissions |
|---|---|---|
| Visiteur | Non authentifié | Lecture publique |
| Client | Acheteur authentifié | Achat, consultation |
| Professionnel | Vendeur | Gestion boutique |
| Admin | Administrateur | Modération |
| Super Admin | — | Tout |

## Acteurs système

| Acteur | Description |
|---|---|
| Payment Provider | Orange Money, Wave, etc. |
| Notification Service | Email, SMS |
| Storage | S3 / CDN |

## Interactions

\`\`\`
Client ──► [API] ──► Catalog
Professionnel ──► [API] ──► Catalog + Store
Payment Provider ──► [Webhook] ──► Payment
\`\`\`

---

${docStatus}
`,

  /* ----- Entities ----- */
  entities: `${header("Entités", "03-domain")}
## Entités principales

### Product

- **Identité** : \`id\` (UUID)
- **Propriétés** : storeId, categoryId, name, slug, sku, status, hasVariants, price, currency
- **Invariants** :
  - slug unique par store
  - price obligatoire si hasVariants=false
  - price null si hasVariants=true

### ProductVariant

- **Identité** : \`id\` (UUID)
- **Propriétés** : productId, name, sku, price, currency, isActive
- **Invariants** :
  - sku unique global
  - ne peut exister que si product.hasVariants=true

### ProductImage

- **Identité** : \`id\` (UUID)
- **Propriétés** : productId, objectKey, altText, sortOrder, isPrimary
- **Invariants** :
  - au plus un isPrimary=true par productId

### Inventory

- **Identité** : \`id\` (UUID)
- **Propriétés** : productId?, variantId?, quantity, reserved
- **Invariants** :
  - XOR(productId, variantId)
  - reserved <= quantity

---

${docStatus}
`,

  /* ----- Aggregates ----- */
  aggregates: `${header("Agrégats", "03-domain")}
## Product (Aggregate Root)

\`\`\`
Product (root)
  ├── ProductVariant[]
  ├── ProductImage[]
  └── Inventory
\`\`\`

**Frontière transactionnelle** : toutes les opérations sur Product et ses enfants sont transactionnelles.

## Order (Aggregate Root)

\`\`\`
Order (root)
  └── OrderItem[]
\`\`\`

## Règles d'agrégat

- On ne référence que l'ID d'un autre agrégat, jamais son objet complet
- Une transaction modifie un seul agrégat

---

${docStatus}
`,

  /* ----- Workflows ----- */
  workflows: `${header("Workflows", "03-domain")}
## Workflow — Création de produit

\`\`\`
Professionnel
    │
    ▼
[POST /catalog/products]
    │
    ├── Auth + RBAC
    ├── Vérif Store ownership
    ├── Vérif Category
    ├── Vérif slug unique
    ├── INSERT Product
    └── Retour DRAFT
\`\`\`

## Workflow — Commande (à venir)

\`\`\`
Client
    │
    ▼
[POST /orders]
    │
    ├── Auth
    ├── Vérif stock disponible
    ├── RESERVE stock
    ├── INSERT Order PENDING
    └── Redirection paiement
\`\`\`

---

${docStatus}
`,

  /* ----- State machines ----- */
  stateMachines: `${header("Machines à états", "03-domain")}
## Product Status

\`\`\`
        ┌─────────┐
        │  DRAFT  │
        └────┬────┘
             │ activate
             ▼
        ┌─────────┐
        │ ACTIVE  │◄─────┐
        └────┬────┘      │
             │           │
    out of stock         │ restock
             ▼           │
    ┌────────────────┐   │
    │ OUT_OF_STOCK   │───┘
    └────────────────┘
             │
             │ archive
             ▼
        ┌─────────┐
        │ARCHIVED │
        └─────────┘
\`\`\`

## Order Status (à venir)

\`\`\`
PENDING ──► PAID ──► SHIPPED ──► DELIVERED
   │         │
   │         └──► REFUNDED
   │
   └──► CANCELLED
\`\`\`

---

${docStatus}
`,

  /* ----- Domain rules ----- */
  domainRules: `${header("Règles de domaine", "03-domain")}
## Règles transverses

| Règle | Description |
|---|---|
| Ownership | Un professionnel ne peut agir que sur ses propres ressources |
| Idempotence | Toute création sensible supporte \`Idempotency-Key\` |
| Atomicité | Toute opération multi-tables est transactionnelle |
| Isolation | Les écritures critiques utilisent Serializable |

## Règles par domaine

### Catalog

- Un produit simple a un prix, un produit à variantes n'en a pas
- Une variante ne peut exister que sur un produit \`hasVariants=true\`
- Le SKU est unique globalement
- Une seule image primaire par produit
- \`reserved <= quantity\` toujours

### Order

- Une commande réserve le stock à la création
- Le commit se fait à la confirmation de paiement
- Le release se fait à l'annulation

---

${docStatus}
`,

  /* ----- Architecture overview ----- */
  archOverview: `${header("Vue d'ensemble de l'architecture", "04-architecture")}
## Style architectural

**Modular Monolith** — un seul déployable, plusieurs modules faiblement couplés.

## Principes

1. Séparation en couches (Route / Controller / Service / Repository)
2. Communication inter-modules via interfaces
3. Base de données partagée, schémas séparés par module
4. Évolution possible vers microservices

## Diagramme C4 — Contexte

\`\`\`
[Utilisateur] ──► [DɛmɛPro] ──► [Payment Provider]
                     │
                     ├──► [Storage]
                     └──► [Notification]
\`\`\`

## Voir aussi

- [Principes](./principles.md)
- [C4 Container](./container-view.md)
- [Déploiement](./deployment-view.md)

---

${docStatus}
`,

  /* ----- Principles ----- */
  principles: `${header("Principes architecturaux", "04-architecture")}
## 1. Simplicité avant tout

Préférer une solution simple et lisible à une solution "élégante" mais complexe.

## 2. Explicit over implicit

Les invariants sont vérifiés au niveau base de données, pas seulement en application.

## 3. Transactions atomiques

Toute opération qui touche plusieurs tables est transactionnelle.

## 4. Idempotence par défaut

Les créations sensibles supportent \`Idempotency-Key\`.

## 5. Ownership systématique

Chaque opération vérifie que l'utilisateur a le droit d'agir sur la ressource.

## 6. Erreurs explicites

Les erreurs ont un code métier clair, pas un message générique.

---

${docStatus}
`,

  /* ----- System context ----- */
  systemContext: `${header("C4 — System Context", "04-architecture")}
## Diagramme

\`\`\`
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                           │ HTTPS
                           ▼
    ┌──────────────────────────────────┐
    │          DɛmɛPro                 │
    │                                  │
    │  ┌────────┐  ┌────────┐         │
    │  │  Web   │  │  API   │         │
    │  └────────┘  └────┬───┘         │
    │                   │              │
    └───────────────────┼──────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌──────────┐    ┌─────────┐
   │   DB    │    │ Payment  │    │ Storage │
   └─────────┘    └──────────┘    └─────────┘
\`\`\`

## Acteurs externes

| Acteur | Type | Protocole |
|---|---|---|
| Client | Utilisateur | HTTPS |
| Payment Provider | Système | HTTPS / Webhook |
| Storage (S3) | Système | HTTPS |

---

${docStatus}
`,

  /* ----- Container view ----- */
  containerView: `${header("C4 — Container View", "04-architecture")}
## Conteneurs

| Conteneur | Technologie | Responsabilité |
|---|---|---|
| Web | Next.js | Interface client |
| Admin | Next.js | Backoffice |
| API | Express + TS | Backend |
| DB | PostgreSQL 16 | Persistance |
| Cache | Redis (à venir) | Sessions, cache |
| Storage | S3 / MinIO | Fichiers |

## Diagramme

\`\`\`
[Client] ──► [Web] ──► [API] ──► [DB]
                        │
                        ├──► [Storage]
                        └──► [Payment]
\`\`\`

## Communication

| Source | Cible | Protocole |
|---|---|---|
| Web | API | REST / JSON |
| API | DB | Prisma / TCP |
| API | Storage | S3 API |

---

${docStatus}
`,

  /* ----- Component view ----- */
  componentView: `${header("C4 — Component View (API)", "04-architecture")}
## Composants du module API

\`\`\`
apps/api/
├── modules/
│   ├── auth/         # Authentification
│   ├── rbac/         # Autorisation
│   ├── catalog/      # Produits, stock
│   ├── store/        # Boutiques
│   ├── category/     # Catégories
│   └── order/        # Commandes
├── shared/
│   ├── middleware/   # Auth, validate, errors
│   ├── errors/       # Base errors
│   └── utils/        # Helpers
└── infrastructure/
    ├── database/     # Prisma
    └── logger/       # Logs
\`\`\`

## Structure d'un module

\`\`\`
module/
├── controllers/
├── services/
├── repositories/
├── dtos/
├── errors/
└── routes/
\`\`\`

---

${docStatus}
`,

  /* ----- Runtime view ----- */
  runtimeView: `${header("C4 — Runtime View", "04-architecture")}
## Scénario 1 — Création de produit

\`\`\`
Client   API      Auth   Catalog   DB
  │       │        │       │       │
  ├──POST─►        │       │       │
  │       ├──verify─►      │       │
  │       │        │       │       │
  │       ├──create────────►       │
  │       │        │       ├──BEGIN─►
  │       │        │       ├──INSERT─►
  │       │        │       ├──COMMIT─►
  │       │        │       │       │
  │◄──201─┤        │       │       │
\`\`\`

## Scénario 2 — Commande (à venir)

[À compléter]

---

${docStatus}
`,

  /* ----- Deployment view ----- */
  deploymentView: `${header("C4 — Deployment View", "04-architecture")}
## Environnements

| Environnement | URL | Base |
|---|---|---|
| Local | localhost | Docker |
| Staging | staging.demepro.ml | Managed |
| Production | api.demepro.ml | Managed |

## Infrastructure

\`\`\`
                    ┌─────────────┐
                    │   CDN       │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Load       │
                    │  Balancer   │
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
            ┌───────┐  ┌───────┐  ┌───────┐
            │ API-1 │  │ API-2 │  │ API-3 │
            └───┬───┘  └───┬───┘  └───┬───┘
                └──────────┼──────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    └─────────────┘
\`\`\`

---

${docStatus}
`,

  /* ----- Integration ----- */
  integration: `${header("Architecture d'intégration", "04-architecture")}
## Intégrations externes

| Service | Usage | Protocole |
|---|---|---|
| Orange Money | Paiement | REST + Webhook |
| Wave | Paiement | REST + Webhook |
| SendGrid | Email | REST |
| Twilio | SMS | REST |
| S3 | Fichiers | S3 API |

## Stratégie

- **Adapters** : chaque intégration est encapsulée dans un adapter
- **Retry** : les appels sortants ont un retry exponentiel
- **Circuit breaker** : en cas de panne prolongée
- **Idempotence** : les webhooks sont idempotents

## Contrats

- Chaque intégration a un schéma Zod pour valider les payloads
- Les secrets sont dans des variables d'environnement

---

${docStatus}
`,

  /* ----- Evolution roadmap ----- */
  evolution: `${header("Roadmap d'évolution architecturale", "04-architecture")}
## Phase actuelle — Modular Monolith

Un seul déployable, plusieurs modules.

## Phase 2 — Extraction de services

Extraire les modules à forte charge :
- Catalog (lecture intensive)
- Order (écriture intensive)

## Phase 3 — Microservices

Si nécessaire :
- Découpage par bounded context
- Message bus (Kafka / RabbitMQ)
- Saga pattern pour les transactions distribuées

## Critères de déclenchement

Passer à la phase suivante **uniquement** si :
- La charge dépasse la capacité d'un seul serveur
- Les équipes deviennent trop nombreuses pour un monolithe
- Les cycles de déploiement deviennent bloquants

---

${docStatus}
`,

  /* ----- Data architecture ----- */
  dataArchitecture: `${header("Architecture des données", "05-data")}
## Principes

1. **PostgreSQL** comme source de vérité
2. **Prisma** comme ORM
3. **Migrations versionnées**
4. **Contraintes DB** pour les invariants critiques

## Modèle de données

\`\`\`
User ──► ProfessionalProfile ──► Store ──► Product
                                            │
                    ┌───────────────────────┼───────────────────┐
                    │                       │                   │
                    ▼                       ▼                   ▼
              ProductVariant          ProductImage        Inventory
                    │
                    ▼
                Inventory
\`\`\`

## Stratégie de migration

- Une migration par changement de schéma
- Migrations testées en staging avant prod
- Rollback préparé pour chaque migration destructive

---

${docStatus}
`,

  /* ----- Database schema ----- */
  dbSchema: `${header("Schéma de base de données", "05-data")}
## Tables principales

### users
\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
\`\`\`

### products
\`\`\`sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  category_id UUID REFERENCES categories(id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  sku VARCHAR(100),
  status VARCHAR(20) NOT NULL,
  has_variants BOOLEAN NOT NULL DEFAULT FALSE,
  price DECIMAL(12,2),
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, slug)
);
\`\`\`

### inventory
\`\`\`sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_owner_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  )
);
\`\`\`

---

${docStatus}
`,

  /* ----- ER diagram ----- */
  erDiagram: `${header("Diagramme entité-relation", "05-data")}
## Mermaid ER

\`\`\`mermaid
erDiagram
    User ||--o| ProfessionalProfile : has
    ProfessionalProfile ||--o{ Store : owns
    Store ||--o{ Product : contains
    Category ||--o{ Product : classifies
    Product ||--o{ ProductVariant : has
    Product ||--o{ ProductImage : has
    Product ||--o| Inventory : has
    ProductVariant ||--o| Inventory : has
    User ||--o{ Order : places
    Store ||--o{ Order : receives
    Order ||--o{ OrderItem : contains
    OrderItem }o--|| ProductVariant : references
\`\`\`

## Cardinalités

| Relation | Cardinalité |
|---|---|
| User → ProfessionalProfile | 1-1 |
| ProfessionalProfile → Store | 1-N |
| Store → Product | 1-N |
| Product → ProductVariant | 1-N |
| Product → ProductImage | 1-N |
| Product → Inventory | 1-0..1 |
| ProductVariant → Inventory | 1-0..1 |

---

${docStatus}
`,

  /* ----- Data dictionary ----- */
  dataDictionary: `${header("Dictionnaire de données", "05-data")}
## Format

| Table | Colonne | Type | Contrainte | Description |
|---|---|---|---|---|

## products

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| store_id | UUID | FK | Boutique propriétaire |
| category_id | UUID | FK | Catégorie |
| name | VARCHAR(200) | NOT NULL | Nom du produit |
| slug | VARCHAR(200) | UNIQUE(store_id) | Slug URL |
| sku | VARCHAR(100) | UNIQUE | SKU du produit simple |
| status | VARCHAR(20) | NOT NULL | DRAFT / ACTIVE / ... |
| has_variants | BOOLEAN | NOT NULL | Mode variantes |
| price | DECIMAL(12,2) | NULL | Prix (null si variantes) |
| currency | VARCHAR(3) | NOT NULL | XOF / EUR / USD |

## product_variants

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | — |
| product_id | UUID | FK | Produit parent |
| name | VARCHAR(180) | NOT NULL | Nom de la variante |
| sku | VARCHAR(100) | UNIQUE | SKU global |
| price | DECIMAL(12,2) | NOT NULL | Prix |
| is_active | BOOLEAN | NOT NULL | Actif |

---

${docStatus}
`,

  /* ----- Data lifecycle ----- */
  dataLifecycle: `${header("Cycle de vie des données", "05-data")}
## Étapes

\`\`\`
Create → Active → Archived → Deleted
\`\`\`

## Produit

| État | Description | Action |
|---|---|---|
| DRAFT | Créé, non publié | — |
| ACTIVE | Publié, achetable | — |
| ARCHIVED | Retiré, non achetable | Soft delete |

## Rétention

| Type de données | Rétention | Raison |
|---|---|---|
| Commandes | 10 ans | Légal |
| Produits | Illimité | — |
| Logs | 90 jours | RGPD |
| Sessions | 30 jours | Sécurité |

## Suppression

- **Soft delete** : archivage, conservation
- **Hard delete** : suppression définitive après période légale

---

${docStatus}
`,

  /* ----- Indexing strategy ----- */
  indexing: `${header("Stratégie d'indexation", "05-data")}
## Index critiques

| Table | Index | Type | Justification |
|---|---|---|---|
| products | (store_id, slug) | UNIQUE | Unicité slug par store |
| products | (status) | B-tree | Filtrage par statut |
| product_variants | (sku) | UNIQUE | Unicité globale |
| product_variants | (product_id) | B-tree | Lookup par produit |
| inventory | (product_id) | UNIQUE | Lookup direct |
| inventory | (variant_id) | UNIQUE | Lookup direct |
| idempotency_keys | (key, scope) | UNIQUE | Lookup |
| idempotency_keys | (expires_at) | B-tree | Purge |

## Requêtes lentes à surveiller

- Liste de produits par store + statut
- Lookup d'inventaire par produit/variante
- Purge des clés idempotence expirées

## Outils

- \`EXPLAIN ANALYZE\` pour analyser
- \`pg_stat_statements\` pour identifier les requêtes lentes

---

${docStatus}
`,

  /* ----- API overview ----- */
  apiOverview: `${header("Vue d'ensemble de l'API", "06-api")}
## Base URL

| Environnement | URL |
|---|---|
| Local | http://localhost:3000/api/v1 |
| Staging | https://staging.demepro.ml/api/v1 |
| Production | https://api.demepro.ml/api/v1 |

## Modules

| Module | Préfixe | Statut |
|---|---|---|
| Auth | /auth | ✅ |
| Catalog | /catalog | ✅ |
| Store | /store | ⚠️ |
| Order | /orders | ❌ |

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

---

${docStatus}
`,

  /* ----- API conventions ----- */
  apiConventions: `${header("Conventions API", "06-api")}
## Nommage des endpoints

\`\`\`
GET    /resources
GET    /resources/:id
POST   /resources
PATCH  /resources/:id
DELETE /resources/:id
\`\`\`

## Ressources imbriquées

\`\`\`
GET  /products/:id/variants
POST /products/:id/variants
GET  /products/:id/images
\`\`\`

## Actions spéciales

\`\`\`
POST /products/:id/activate
POST /products/:id/archive
POST /variants/:id/deactivate
\`\`\`

## Headers

| Header | Usage |
|---|---|
| Authorization | Bearer token |
| Idempotency-Key | Anti-double-soumission |
| Content-Type | application/json |

---

${docStatus}
`,

  /* ----- Auth API ----- */
  apiAuth: `${header("Authentification API", "06-api")}
## Flow JWT

1. \`POST /auth/login\` → retourne \`accessToken\` + \`refreshToken\`
2. Le client envoie \`Authorization: Bearer <accessToken>\`
3. Middleware \`authenticate\` valide et injecte \`req.user\`
4. \`POST /auth/refresh\` pour renouveler

## Tokens

| Token | Durée | Format |
|---|---|---|
| Access Token | 15 min | JWT |
| Refresh Token | 7 jours | JWT + DB |

## Payload JWT

\`\`\`json
{
  "sub": "user-uuid",
  "role": "PROFESSIONAL",
  "iat": 1234567890,
  "exp": 1234568790
}
\`\`\`

---

${docStatus}
`,

  /* ----- Authz API ----- */
  apiAuthz: `${header("Autorisation API", "06-api")}
## RBAC

Chaque endpoint déclare une permission requise.

\`\`\`typescript
router.post(
  "/products",
  authenticate,
  requirePermission("catalog.product.create"),
  validate(createProductSchema, "body"),
  controller.create,
);
\`\`\`

## Ownership

En complément du RBAC, chaque service vérifie la propriété :

\`\`\`typescript
if (product.store.professional.userId !== ctx.userId) {
  throw new CatalogError(
    CatalogErrorCode.UNAUTHORIZED_STORE,
    "Vous n'êtes pas autorisé à modifier ce produit.",
  );
}
\`\`\`

## Codes d'erreur

| Code | HTTP | Signification |
|---|---|---|
| UNAUTHENTICATED | 401 | Token manquant/invalide |
| UNAUTHORIZED | 403 | Permission manquante |
| UNAUTHORIZED_STORE | 403 | Non propriétaire |

---

${docStatus}
`,

  /* ----- API errors ----- */
  apiErrors: `${header("Erreurs API", "06-api")}
## Format standard

\`\`\`json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SKU",
    "message": "Le SKU \"CH-41\" est déjà utilisé.",
    "statusCode": 409,
    "details": { ... }
  }
}
\`\`\`

## Catalogue des codes

### 400 — Validation

| Code | Description |
|---|---|
| VALIDATION_ERROR | Erreur de validation Zod |

### 401 — Auth

| Code | Description |
|---|---|
| UNAUTHENTICATED | Token manquant |
| TOKEN_EXPIRED | Token expiré |

### 403 — Autorisation

| Code | Description |
|---|---|
| UNAUTHORIZED | Permission manquante |
| UNAUTHORIZED_STORE | Non propriétaire |

### 404 — Introuvable

| Code | Description |
|---|---|
| PRODUCT_NOT_FOUND | — |
| PRODUCT_VARIANT_NOT_FOUND | — |
| PRODUCT_IMAGE_NOT_FOUND | — |
| INVENTORY_NOT_FOUND | — |
| STORE_NOT_FOUND | — |
| CATEGORY_NOT_FOUND | — |

### 409 — Conflit

| Code | Description |
|---|---|
| DUPLICATE_SLUG | — |
| DUPLICATE_SKU | — |
| IDEMPOTENCY_CONFLICT | — |

### 422 — État invalide

| Code | Description |
|---|---|
| INVALID_PRODUCT_STATE | — |
| INVALID_INVENTORY_QUANTITY | — |
| PRODUCT_HAS_NO_VARIANTS | — |
| VARIANTS_EXIST | — |
| LAST_ACTIVE_VARIANT | — |

### 500 — Interne

| Code | Description |
|---|---|
| INTERNAL_ERROR | — |

---

${docStatus}
`,

  /* ----- API pagination ----- */
  apiPagination: `${header("Pagination API", "06-api")}
## Stratégie

Pagination par **curseur** pour les grandes collections.

## Format

\`\`\`
GET /resources?limit=20&cursor=<lastId>
\`\`\`

## Réponse

\`\`\`json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "nextCursor": "uuid-or-null",
    "hasMore": true
  }
}
\`\`\`

## Implémentation

\`\`\`typescript
const limit = Math.min(options.limit ?? 20, 100);
const results = await prisma.xxx.findMany({
  take: limit + 1,
  cursor: options.cursor ? { id: options.cursor } : undefined,
  skip: options.cursor ? 1 : 0,
});
const hasMore = results.length > limit;
const data = hasMore ? results.slice(0, limit) : results;
\`\`\`

---

${docStatus}
`,

  /* ----- API versioning ----- */
  apiVersioning: `${header("Versionnement API", "06-api")}
## Stratégie

Versionnement par **préfixe URL** : \`/api/v1/\`, \`/api/v2/\`.

## Politique

- Une version reste supportée **12 mois** après sa dépréciation
- Les breaking changes nécessitent une nouvelle version
- Les ajouts rétrocompatibles ne changent pas la version

## Dépréciation

Header \`Deprecation\` + \`Sunset\` :

\`\`\`
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
\`\`\`

---

${docStatus}
`,

  /* ----- OpenAPI placeholder ----- */
  openapi: `# OpenAPI 3.1

openapi: 3.1.0
info:
  title: DɛmɛPro API
  version: 0.1.0
  description: API e-commerce B2B/B2C

servers:
  - url: http://localhost:3000/api/v1
    description: Local

paths:
  /catalog/products:
    post:
      summary: Créer un produit
      tags: [Catalog]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateProductDto"
      responses:
        "201":
          description: Produit créé
        "409":
          description: Slug dupliqué

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateProductDto:
      type: object
      required: [storeId, categoryId, name, slug, hasVariants]
      properties:
        storeId:
          type: string
          format: uuid
        categoryId:
          type: string
          format: uuid
        name:
          type: string
        slug:
          type: string
        hasVariants:
          type: boolean
        price:
          type: number
        currency:
          type: string
          default: XOF
`,

  /* ----- Security overview ----- */
  securityOverview: `${header("Vue d'ensemble sécurité", "07-security")}
## Principes

1. **Défense en profondeur** — plusieurs couches de sécurité
2. **Moindre privilège** — permissions minimales
3. **Fail-safe** — refuser par défaut
4. **Zero trust** — vérifier à chaque requête

## Couches

| Couche | Mesures |
|---|---|
| Réseau | HTTPS, WAF, DDoS protection |
| Application | Auth JWT, RBAC, validation Zod |
| Base de données | Contraintes, chiffrement at-rest |
| Fichiers | Signed URLs, virus scan |
| Monitoring | Logs, alertes, audit |

## Conformité

- RGPD : droit à l'oubli, portabilité
- PCI-DSS : pas de stockage de cartes (délégué au provider)

---

${docStatus}
`,

  /* ----- Threat model ----- */
  threatModel: `${header("Modèle de menaces", "07-security")}
## Méthodologie STRIDE

| Menace | Description | Mitigation |
|---|---|---|
| **S**poofing | Usurpation d'identité | JWT signé, HTTPS |
| **T**ampering | Modification de données | Contraintes DB, validation |
| **R**epudiation | Nier une action | Logs d'audit |
| **I**nformation disclosure | Fuite de données | Chiffrement, RBAC |
| **D**enial of service | Saturation | Rate limiting, quotas |
| **E**levation of privilege | Escalade | RBAC strict, ownership |

## Scénarios critiques

### 1. Accès à un produit d'un autre store

**Attaque** : Un professionnel tente de modifier un produit qui ne lui appartient pas.
**Mitigation** : Vérification \`product.store.professional.userId === ctx.userId\`.

### 2. Survente

**Attaque** : Deux clients achètent le dernier article en même temps.
**Mitigation** : Réservation atomique SQL.

### 3. Double soumission

**Attaque** : Un client clique deux fois sur "Commander".
**Mitigation** : Idempotency-Key.

---

${docStatus}
`,

  /* ----- Auth security ----- */
  authSecurity: `${header("Sécurité authentification", "07-security")}
## Mot de passe

- Hash **bcrypt** (coût 12) ou **argon2id**
- Longueur min 12 caractères
- Vérification contre les listes de mots de passe compromis

## JWT

- Algorithme **RS256** (asymétrique)
- Secret dans variable d'environnement
- Rotation des clés tous les 90 jours

## Sessions

- Access token : 15 min
- Refresh token : 7 jours, stocké en DB
- Révocation possible (logout, changement de mdp)

## 2FA (à venir)

- TOTP (Google Authenticator)
- SMS fallback

---

${docStatus}
`,

  /* ----- Authz security ----- */
  authzSecurity: `${header("Sécurité autorisation", "07-security")}
## RBAC

Chaque rôle a un ensemble de permissions :

\`\`\`typescript
const ROLE_PERMISSIONS = {
  CLIENT: ["catalog.product.read", "order.create"],
  PROFESSIONAL: ["catalog.product.*", "store.*"],
  ADMIN: ["*"],
};
\`\`\`

## Ownership

Vérification systématique :

\`\`\`typescript
if (resource.ownerId !== ctx.userId) {
  throw new CatalogError(
    CatalogErrorCode.UNAUTHORIZED_STORE,
    "Non autorisé.",
  );
}
\`\`\`

## IDOR (Insecure Direct Object Reference)

Toujours utiliser des UUID, jamais d'IDs auto-incrémentés exposés.

---

${docStatus}
`,

  /* ----- Data protection ----- */
  dataProtection: `${header("Protection des données", "07-security")}
## Chiffrement

| Couche | Méthode |
|---|---|
| En transit | TLS 1.3 |
| Au repos | AES-256 (DB) |
| Secrets | Variables d'environnement chiffrées |

## Données personnelles

| Donnée | Sensibilité | Rétention |
|---|---|---|
| Email | Moyenne | Jusqu'à suppression compte |
| Téléphone | Moyenne | — |
| Adresse | Haute | 10 ans (légal) |
| Mot de passe | Critique | Hash uniquement |

## RGPD

- Droit d'accès : endpoint \`GET /me/data\`
- Droit à l'oubli : \`DELETE /me\`
- Portabilité : export JSON

---

${docStatus}
`,

  /* ----- File security ----- */
  fileSecurity: `${header("Sécurité des fichiers", "07-security")}
## Upload

- Validation MIME + extension
- Taille max 10 Mo
- Scan antivirus (ClamAV)
- Stockage dans un bucket privé

## Accès

- **Signed URLs** avec expiration 15 min
- Pas d'accès direct public
- CDN avec token

## Nommage

- UUID comme nom de fichier (pas de nom original)
- Préfixe par type : \`products/\`, \`avatars/\`

---

${docStatus}
`,

  /* ----- API security ----- */
  apiSecurity: `${header("Sécurité API", "07-security")}
## Rate limiting

| Endpoint | Limite |
|---|---|
| \`POST /auth/login\` | 5 / 15 min / IP |
| \`POST /catalog/products\` | 60 / min / user |
| Global | 1000 / min / IP |

## Headers de sécurité

\`\`\`
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
\`\`\`

## CORS

Origines autorisées explicites :
\`\`\`typescript
cors({
  origin: ["https://demepro.ml", "https://admin.demepro.ml"],
  credentials: true,
})
\`\`\`

## Injection SQL

- Prisma paramètre toutes les requêtes
- \`$queryRaw\` avec template literals \`\${}\` (jamais de concaténation)

---

${docStatus}
`,

  /* ----- Incident response ----- */
  incidentResponse: `${header("Réponse aux incidents", "07-security")}
## Niveaux de sévérité

| Niveau | Description | Délai de réponse |
|---|---|---|
| P0 (Critical) | Fuite de données, downtime total | Immédiat |
| P1 (High) | Fonctionnalité critique cassée | 1h |
| P2 (Medium) | Fonctionnalité dégradée | 4h |
| P3 (Low) | Bug mineur | 24h |

## Processus

1. **Détection** — alerte monitoring ou signalement
2. **Qualification** — évaluer la sévérité
3. **Confinement** — limiter l'impact
4. **Éradication** — corriger la cause
5. **Récupération** — restaurer le service
6. **Post-mortem** — documenter et prévenir

## Contacts

| Rôle | Contact |
|---|---|
| On-call | — |
| DPO | — |
| RSSI | — |

---

${docStatus}
`,

  /* ----- Coding standards ----- */
  codingStandards: `${header("Standards de code", "08-engineering")}
## Voir

- [CONVENTIONS.md](../CONVENTIONS.md) — conventions détaillées

## Résumé

### Nommage
- **Fichiers** : kebab-case
- **Classes** : PascalCase
- **Méthodes** : camelCase
- **Constantes** : SCREAMING_SNAKE_CASE

### Structure
- Une classe par fichier
- Séparation des couches (Route/Controller/Service/Repository)

### TypeScript
- \`strict: true\`
- Pas de \`any\`
- Types explicites pour les APIs publiques

### Linting
- ESLint + Prettier
- Pre-commit hook
- CI bloque sur lint errors

---

${docStatus}
`,

  /* ----- Git workflow ----- */
  gitWorkflow: `${header("Workflow Git", "08-engineering")}
## Branches

| Branche | Usage |
|---|---|
| \`main\` | Production |
| \`develop\` | Intégration |
| \`feature/*\` | Nouvelles fonctionnalités |
| \`fix/*\` | Corrections |
| \`hotfix/*\` | Correctifs urgents |

## Convention de commit

\`\`\`
<type>(<scope>): <description>

[body]

[footer]
\`\`\`

**Types** : feat, fix, docs, style, refactor, test, chore

**Exemples** :
\`\`\`
feat(catalog): ajouter la création atomique de produit
fix(inventory): corriger la survente sous concurrence
docs(blueprint): ajouter le fichier de vision
\`\`\`

## Pull Requests

- Titre clair
- Description avec contexte
- Tests passent
- Au moins 1 reviewer
- Squash merge

---

${docStatus}
`,

  /* ----- Testing strategy ----- */
  testingStrategy: `${header("Stratégie de tests", "08-engineering")}
## Pyramide

\`\`\`
        ▲
       ╱ ╲         E2E (peu)
      ╱───╲
     ╱     ╲       Integration (moyen)
    ╱───────╲
   ╱         ╲     Unit (beaucoup)
  ╱───────────╲
\`\`\`

## Types

| Type | Outil | Cible |
|---|---|---|
| Unit | Vitest | Fonctions pures |
| Integration | Vitest + Testcontainers | Services + DB |
| E2E | Vitest + Supertest | HTTP complet |

## Couverture cible

| Couche | Cible |
|---|---|
| Services | 90% |
| Repositories | 80% |
| Controllers | 70% |
| Global | 80% |

## Conventions

- Un fichier de test par fichier source
- \`*.integration.test.ts\` pour les tests DB
- Nommer les tests avec un verbe d'action

---

${docStatus}
`,

  /* ----- Quality gates ----- */
  qualityGates: `${header("Quality Gates", "08-engineering")}
## CI Pipeline

\`\`\`
Push → Lint → Typecheck → Unit → Integration → Build → Deploy
\`\`\`

## Bloquants

| Étape | Bloquant |
|---|---|
| ESLint | ✅ |
| TypeScript | ✅ |
| Tests unit | ✅ |
| Tests integration | ✅ |
| Build | ✅ |
| Coverage < 80% | ⚠️ Warning |

## Pre-commit hooks

- Prettier
- ESLint
- Type check

## Pre-push hooks

- Tests unit

---

${docStatus}
`,

  /* ----- Error handling ----- */
  errorHandling: `${header("Gestion des erreurs", "08-engineering")}
## Hiérarchie

\`\`\`
Error (native)
  ├── AppError (base)
  │     ├── CatalogError
  │     ├── OrderError
  │     └── AuthError
  └── PrismaError (wrapped)
\`\`\`

## Format

\`\`\`typescript
class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
\`\`\`

## Middleware global

\`\`\`typescript
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  logger.error(err);
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Erreur interne." },
  });
});
\`\`\`

---

${docStatus}
`,

  /* ----- Logging ----- */
  logging: `${header("Logging", "08-engineering")}
## Niveaux

| Niveau | Usage |
|---|---|
| error | Erreur critique |
| warn | Anomalie non bloquante |
| info | Événement métier |
| debug | Détail technique |
| trace | Très verbeux |

## Format

JSON structuré :

\`\`\`json
{
  "level": "info",
  "timestamp": "2026-10-10T20:00:00Z",
  "message": "Product created",
  "context": {
    "userId": "uuid",
    "productId": "uuid",
    "duration": 45
  }
}
\`\`\`

## Corrélation

Chaque requête a un \`requestId\` unique propagé dans tous les logs.

## PII

Jamais de données personnelles dans les logs.

---

${docStatus}
`,

  /* ----- Observability ----- */
  observability: `${header("Observabilité", "08-engineering")}
## Trois piliers

1. **Logs** — événements discrets
2. **Métriques** — agrégats numériques
3. **Traces** — parcours de requêtes

## Métriques clés

| Métrique | Type |
|---|---|
| http_requests_total | Counter |
| http_request_duration_seconds | Histogram |
| db_query_duration_seconds | Histogram |
| catalog_products_created_total | Counter |

## Health checks

\`\`\`
GET /health       → statut global
GET /health/db    → statut base
GET /metrics      → Prometheus
\`\`\`

## Alertes

| Alerte | Seuil |
|---|---|
| Error rate | > 1% sur 5 min |
| Latence p95 | > 1s sur 5 min |
| DB connections | > 80% |

---

${docStatus}
`,

  /* ----- Configuration ----- */
  configuration: `${header("Configuration", "08-engineering")}
## Variables d'environnement

| Variable | Description | Requis |
|---|---|---|
| NODE_ENV | development / production | ✅ |
| DATABASE_URL | URL PostgreSQL | ✅ |
| JWT_SECRET | Clé de signature JWT | ✅ |
| JWT_EXPIRES_IN | Durée access token | ✅ |
| LOG_LEVEL | Niveau de log | ❌ |
| S3_BUCKET | Bucket de stockage | ✅ |
| S3_REGION | Région S3 | ✅ |

## Validation

Au démarrage, toutes les variables sont validées :

\`\`\`typescript
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});
\`\`\`

## Secrets

- Jamais commités
- Utiliser un vault (AWS Secrets Manager, Doppler)
- Rotation régulière

---

${docStatus}
`,

  /* ----- Dependency policy ----- */
  dependencyPolicy: `${header("Politique de dépendances", "08-engineering")}
## Critères d'ajout

1. **Maintenue** — commits récents, issues traitées
2. **Populaire** — > 1M téléchargements/mois
3. **Auditée** — pas de vulnérabilités connues
4. **Licence compatible** — MIT, Apache 2.0

## Mises à jour

| Type | Fréquence |
|---|---|
| Patch (security) | Immédiat |
| Minor | Mensuel |
| Major | Trimestriel + tests |

## Outils

- \`pnpm audit\` en CI
- Dependabot pour les PR automatiques
- Snyk pour le scan continu

## Politique de lock

\`pnpm-lock.yaml\` **toujours commité**.

---

${docStatus}
`,

  /* ----- Environments ----- */
  environments: `${header("Environnements", "09-infrastructure")}
## Liste

| Env | Usage | URL |
|---|---|---|
| Local | Développement | localhost |
| Test | CI | Docker éphémère |
| Staging | Pré-prod | staging.demepro.ml |
| Production | Prod | api.demepro.ml |

## Isolation

Chaque environnement a :
- Sa propre base de données
- Ses propres secrets
- Son propre bucket S3

## Promotion

\`\`\`
Local → PR → Staging (auto) → Production (manuel)
\`\`\`

---

${docStatus}
`,

  /* ----- Docker ----- */
  docker: `${header("Docker", "09-infrastructure")}
## Dockerfile API

\`\`\`dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
\`\`\`

## docker-compose.yml (dev)

\`\`\`yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: demepro
      POSTGRES_PASSWORD: demepro
      POSTGRES_DB: demepro_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
\`\`\`

---

${docStatus}
`,

  /* ----- Local dev ----- */
  localDev: `${header("Développement local", "09-infrastructure")}
## Prérequis

- Node.js 20+
- pnpm 10+
- Docker Desktop
- PostgreSQL 16 (via Docker)

## Setup

\`\`\`bash
# 1. Installer
pnpm install

# 2. Configurer
cp .env.example .env

# 3. Démarrer les services
pnpm docker:up

# 4. Migrer
pnpm db:migrate

# 5. Lancer
pnpm dev
\`\`\`

## Services locaux

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Web | http://localhost:3001 |
| Admin | http://localhost:3002 |
| Prisma Studio | http://localhost:5555 |

## Commandes utiles

\`\`\`bash
pnpm db:studio       # Explorer la DB
pnpm db:seed         # Seed
pnpm test:integration # Tests
\`\`\`

---

${docStatus}
`,

  /* ----- CI/CD ----- */
  cicd: `${header("CI / CD", "09-infrastructure")}
## Pipeline GitHub Actions

\`\`\`yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build
\`\`\`

## Déploiement

| Environnement | Déclencheur |
|---|---|
| Staging | Push sur \`develop\` |
| Production | Tag \`v*\` |

---

${docStatus}
`,

  /* ----- Deployment ----- */
  deployment: `${header("Déploiement", "09-infrastructure")}
## Stratégie

**Blue/Green** pour les déploiements sans downtime.

## Étapes

1. Build l'image
2. Push au registry
3. Déployer sur l'environnement "green"
4. Vérifier health checks
5. Basculer le trafic
6. Garder "blue" pendant 24h
7. Éteindre "blue"

## Rollback

\`\`\`bash
# Retour à la version précédente
git revert <commit>
git push origin main
\`\`\`

## Migrations DB

- Migrations appliquées **avant** le déploiement du code
- Migrations **rétrocompatibles** (pas de DROP COLUMN direct)

---

${docStatus}
`,

  /* ----- Backup/recovery ----- */
  backup: `${header("Backup & Recovery", "09-infrastructure")}
## Backups

| Type | Fréquence | Rétention |
|---|---|---|
| Full DB | Journalier | 30 jours |
| WAL archiving | Continu | 7 jours |
| Fichiers S3 | Versioning | 90 jours |

## RTO / RPO

| Métrique | Cible |
|---|---|
| RTO (Recovery Time Objective) | 1h |
| RPO (Recovery Point Objective) | 5 min |

## Procédure de restauration

1. Identifier le point de restauration
2. Provisionner une DB de restauration
3. Appliquer les WAL jusqu'au point voulu
4. Vérifier l'intégrité
5. Basculer le trafic

## Tests

Un drill de restauration est effectué **trimestriellement**.

---

${docStatus}
`,

  /* ----- Monitoring ----- */
  monitoring: `${header("Monitoring", "09-infrastructure")}
## Stack

| Composant | Outil |
|---|---|
| Métriques | Prometheus |
| Visualisation | Grafana |
| Logs | Loki |
| Traces | Tempo |
| Alertes | Alertmanager |

## Dashboards

### API

- Requêtes/seconde
- Latence p50/p95/p99
- Taux d'erreur
- Connexions DB actives

### Business

- Produits créés/jour
- Commandes/jour
- CA/jour

## Alertes critiques

| Alerte | Condition | Sévérité |
|---|---|---|
| API down | Health check fail | P0 |
| DB down | Connexion impossible | P0 |
| Error rate | > 5% sur 5 min | P1 |
| Latence p95 | > 2s sur 5 min | P1 |

---

${docStatus}
`,

  /* ----- ADR template ----- */
  adr: (num, title, status = "Accepté") => `# ADR-${num} — ${title}

- **Date** : ${TODAY}
- **Statut** : ${status}
- **Décideurs** : —
- **Consultés** : —

## Contexte

[Quel est le contexte de la décision ?]

## Décision

[Décision prise]

## Conséquences

### Positives
- —

### Négatives
- —

### Neutres
- —

## Alternatives considérées

### Alternative 1 — [Nom]
- **Avantages** : —
- **Inconvénients** : —
- **Raison du rejet** : —

## Références

- —
`,

  /* ----- ADR README ----- */
  adrReadme: `${header("Architecture Decision Records (ADR)", "10-decisions")}
## Qu'est-ce qu'un ADR ?

Un ADR documente une **décision architecturale importante** :
- Le contexte
- La décision
- Les conséquences
- Les alternatives

## Index

| ID | Titre | Statut | Date |
|---|---|---|---|
| [001](./ADR-001-monorepo.md) | Choix du monorepo | Accepté | ${TODAY} |
| [002](./ADR-002-modular-monolith.md) | Modular Monolith | Accepté | ${TODAY} |
| [003](./ADR-003-typescript.md) | TypeScript | Accepté | ${TODAY} |
| [004](./ADR-004-express-react.md) | Express + React | Accepté | ${TODAY} |
| [005](./ADR-005-postgresql.md) | PostgreSQL | Accepté | ${TODAY} |
| [006](./ADR-006-prisma.md) | Prisma ORM | Accepté | ${TODAY} |
| [007](./ADR-007-rest-api.md) | REST API | Accepté | ${TODAY} |

## Convention

- Un fichier par ADR
- Nommage : \`ADR-XXX-kebab-title.md\`
- Numérotation séquentielle
- Jamais supprimer un ADR (marquer comme "Remplacé par ADR-XXX")

## Statuts

- **Proposé** — en discussion
- **Accepté** — décision actée
- **Déprécié** — plus applicable
- **Remplacé** — remplacé par un autre ADR

---

${docStatus}
`,

  /* ----- AI engineering ----- */
  agents: `${header("Agents IA", "11-ai-engineering")}
## Agents

| Agent | Rôle | Modèle |
|---|---|---|
| Architect | Conception | Claude |
| Backend | API + DB | Claude |
| Frontend | UI | Claude |
| Reviewer | Revue | Claude |
| Tester | Tests | Claude |

## Workflow

\`\`\`
Spec → Architect → Backend/Frontend → Reviewer → Tests
\`\`\`

## Règles

- Chaque agent a un scope défini
- Les décisions majeures passent par l'Architect
- Le Reviewer valide avant merge

---

${docStatus}
`,

  skills: `${header("Skills IA", "11-ai-engineering")}
## Skills disponibles

| Skill | Description |
|---|---|
| \`create-module\` | Créer un nouveau module |
| \`add-endpoint\` | Ajouter un endpoint |
| \`write-test\` | Écrire un test d'intégration |
| \`debug-error\` | Diagnostiquer une erreur |
| \`migrate-schema\` | Créer une migration Prisma |

## Format

Chaque skill a :
- Un trigger (mot-clé)
- Une procédure
- Des exemples

---

${docStatus}
`,

  aiRules: `${header("Règles IA", "11-ai-engineering")}
## Règles générales

1. **Toujours lire l'existant** avant de modifier
2. **Un changement à la fois** — pas de mega-commit
3. **Tests d'abord** — TDD quand possible
4. **Documenter** — ADR pour les décisions
5. **Demander** avant d'introduire une nouvelle dépendance

## Règles de code

- Respecter CONVENTIONS.md
- Pas de \`any\`
- Types explicites
- Erreurs typées

## Règles de communication

- Expliquer le **pourquoi** avant le **comment**
- Signaler les trade-offs
- Proposer des alternatives

---

${docStatus}
`,

  hooks: `${header("Hooks IA", "11-ai-engineering")}
## Hooks

| Hook | Trigger | Action |
|---|---|---|
| pre-commit | Avant commit | Lint + tests |
| pre-push | Avant push | Tests intégration |
| post-merge | Après merge | Migrations |

## Hooks Git

\`\`\`bash
# .husky/pre-commit
pnpm lint-staged
pnpm test:unit
\`\`\`

---

${docStatus}
`,

  agentWorkflow: `${header("Workflow des agents", "11-ai-engineering")}
## Cycle

\`\`\`
1. Analyse
   ↓
2. Plan
   ↓
3. Implémentation
   ↓
4. Tests
   ↓
5. Revue
   ↓
6. Merge
\`\`\`

## Étapes

### 1. Analyse
- Lire le code existant
- Comprendre le contexte
- Identifier les dépendances

### 2. Plan
- Découper en tâches
- Estimer la complexité
- Identifier les risques

### 3. Implémentation
- Suivre les conventions
- Commits atomiques
- Documentation inline

### 4. Tests
- Tests unitaires
- Tests d'intégration
- Cas limites

### 5. Revue
- Auto-revue
- Reviewer externe
- Correction

### 6. Merge
- Squash
- Message clair
- Fermer la tâche

---

${docStatus}
`,

  definitionOfDone: `${header("Definition of Done", "11-ai-engineering")}
## Une tâche est "Done" quand :

### Code
- [ ] Fonctionnalité implémentée
- [ ] Conventions respectées
- [ ] Pas de TODO laissé
- [ ] Pas de code commenté

### Tests
- [ ] Tests unitaires écrits
- [ ] Tests d'intégration écrits
- [ ] Couverture respectée
- [ ] Tous les tests passent

### Documentation
- [ ] JSDoc sur les fonctions publiques
- [ ] README mis à jour si nécessaire
- [ ] ADR créé si décision majeure
- [ ] CHANGELOG mis à jour

### Qualité
- [ ] Lint passe
- [ ] Typecheck passe
- [ ] Pas de régression
- [ ] Revue validée

### Déploiement
- [ ] CI passe
- [ ] Staging testé
- [ ] Pas de migration destructive

---

${docStatus}
`,

  roadmap: `${header("Roadmap", "12-roadmap")}
## Vue d'ensemble

| Phase | Nom | Statut |
|---|---|---|
| 1 | Foundation | ✅ |
| 2 | Catalog | 🚧 |
| 3 | Order & Payment | ❌ |
| 4 | Store & Category | ⚠️ |
| 5 | Notifications | ❌ |
| 6 | Analytics | ❌ |

## Détail

Voir [milestones.md](./milestones.md) et [backlog.md](./backlog.md).

---

${docStatus}
`,

  milestones: `${header("Milestones", "12-roadmap")}
## M1 — Foundation ✅

**Date cible** : —
**Livrables** :
- [x] Monorepo
- [x] Auth + RBAC
- [x] Prisma + PostgreSQL

## M2 — Catalog 🚧

**Date cible** : —
**Livrables** :
- [x] Services Catalog
- [x] Tests d'intégration
- [ ] Contrôleurs HTTP
- [ ] Tests E2E

## M3 — Order & Payment ❌

**Date cible** : —
**Livrables** :
- [ ] Module Order
- [ ] Module Payment
- [ ] Cycle de commande

---

${docStatus}
`,

  backlog: `${header("Backlog", "12-roadmap")}
## Priorité P0 (critique)

- [ ] Finaliser les contrôleurs Catalog
- [ ] Tests E2E HTTP

## Priorité P1 (important)

- [ ] Module Order
- [ ] Module Payment
- [ ] Module Store complet

## Priorité P2 (nice to have)

- [ ] Analytics
- [ ] Notifications
- [ ] Backoffice admin

## Idées futures

- Application mobile
- Multi-devises
- Multi-langues
- Programme de fidélité

---

${docStatus}
`,

  releaseStrategy: `${header("Stratégie de release", "12-roadmap")}
## Versioning

**Semantic Versioning** : MAJOR.MINOR.PATCH

- **MAJOR** : breaking changes
- **MINOR** : nouvelles fonctionnalités
- **PATCH** : bug fixes

## Cadence

| Type | Fréquence |
|---|---|
| Patch | À la demande |
| Minor | Toutes les 2 semaines |
| Major | Trimestriel |

## Canaux

| Canal | Usage |
|---|---|
| alpha | Interne |
| beta | Early adopters |
| stable | Production |

## Rollback

En cas de problème critique, rollback immédiat vers la version précédente.

---

${docStatus}
`,

  futureVerticals: `${header("Futurs verticaux", "12-roadmap")}
## Verticaux candidats

| Vertical | Description | Priorité |
|---|---|---|
| ARTISANS | Artisans | ✅ Actif |
| MODE | Mode & textile | P1 |
| ELECTRONIQUE | Électronique | P2 |
| ALIMENTAIRE | Alimentation | P2 |
| SERVICES | Services | P3 |

## Critères d'ajout

1. Demande marché prouvée
2. Partenaires identifiés
3. Catégories définies
4. Règles métier spécifiques documentées

## Processus

1. Étude de marché
2. Définition des catégories
3. Adaptation du modèle si nécessaire
4. Lancement pilote
5. Généralisation

---

${docStatus}
`,

  glossary: `${header("Glossaire", "00-index")}
## Termes métier

| Terme | Définition |
|---|---|
| **Vertical** | Secteur d'activité (ex: Artisans, Mode) |
| **Store** | Boutique d'un professionnel |
| **Product** | Produit vendu |
| **Variant** | Déclinaison d'un produit (taille, couleur) |
| **SKU** | Stock Keeping Unit — identifiant unique |
| **Inventory** | Stock disponible |
| **Reserved** | Stock réservé (panier, commande en cours) |
| **Available** | Stock disponible = quantity - reserved |

## Termes techniques

| Terme | Définition |
|---|---|
| **ADR** | Architecture Decision Record |
| **RBAC** | Role-Based Access Control |
| **Idempotence** | Propriété d'une opération qui peut être répétée sans effet supplémentaire |
| **Serializable** | Niveau d'isolation maximal en DB |
| **Ownership** | Vérification de propriété d'une ressource |
| **Aggregate** | Groupe d'entités traitées comme une unité |

## Acronymes

| Acronyme | Signification |
|---|---|
| API | Application Programming Interface |
| DTO | Data Transfer Object |
| ORM | Object-Relational Mapping |
| JWT | JSON Web Token |
| PII | Personally Identifiable Information |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |
| TTL | Time To Live |

---

${docStatus}
`,

  documentStatus: `${header("Statut des documents", "00-index")}
## Vue d'ensemble

| Section | Complétion | Dernière mise à jour |
|---|---|---|
| 00-index | 50% | ${TODAY} |
| 01-product | 5% | ${TODAY} |
| 02-requirements | 5% | ${TODAY} |
| 03-domain | 10% | ${TODAY} |
| 04-architecture | 20% | ${TODAY} |
| 05-data | 15% | ${TODAY} |
| 06-api | 10% | ${TODAY} |
| 07-security | 10% | ${TODAY} |
| 08-engineering | 30% | ${TODAY} |
| 09-infrastructure | 20% | ${TODAY} |
| 10-decisions | 40% | ${TODAY} |
| 11-ai-engineering | 30% | ${TODAY} |
| 12-roadmap | 20% | ${TODAY} |

## Légende

- 🚧 **Draft** — en cours d'écriture
- 👀 **Review** — en revue
- ✅ **Validé** — approuvé
- 📦 **Archivé** — obsolète

## Prochaines priorités

1. Compléter 01-product (vision, personas)
2. Compléter 02-requirements (FR, NFR)
3. Compléter 03-domain (workflows détaillés)

---

${docStatus}
`,
};

/* ================================================================
 * ARBORESCENCE
 * ================================================================ */

const BLUEPRINT = {
  "00-index": {
    "README.md": `${header("Blueprint DɛmɛPro", "00-index")}
## À propos

Ce dossier contient la **documentation de conception complète** de DɛmɛPro.

## Structure

| Section | Contenu |
|---|---|
| [01-product](../01-product/) | Vision, personas, MVP |
| [02-requirements](../02-requirements/) | Exigences fonctionnelles et non-fonctionnelles |
| [03-domain](../03-domain/) | Modèle de domaine, workflows |
| [04-architecture](../04-architecture/) | Architecture technique |
| [05-data](../05-data/) | Schéma de données |
| [06-api](../06-api/) | Contrats API |
| [07-security](../07-security/) | Sécurité |
| [08-engineering](../08-engineering/) | Standards d'ingénierie |
| [09-infrastructure](../09-infrastructure/) | Infrastructure, CI/CD |
| [10-decisions](../10-decisions/) | ADRs |
| [11-ai-engineering](../11-ai-engineering/) | Règles pour les agents IA |
| [12-roadmap](../12-roadmap/) | Roadmap, milestones |

## Comment lire ce blueprint

### Pour comprendre le produit
1. Lire [01-product/vision.md](../01-product/vision.md)
2. Lire [01-product/users.md](../01-product/users.md)
3. Lire [02-requirements/functional-requirements.md](../02-requirements/functional-requirements.md)

### Pour développer
1. Lire [04-architecture/architecture-overview.md](../04-architecture/architecture-overview.md)
2. Lire [08-engineering/coding-standards.md](../08-engineering/coding-standards.md)
3. Lire [10-decisions/README.md](../10-decisions/README.md)

### Pour contribuer
1. Lire [11-ai-engineering/rules.md](../11-ai-engineering/rules.md)
2. Lire [11-ai-engineering/definition-of-done.md](../11-ai-engineering/definition-of-done.md)

## Statut

Voir [document-status.md](./document-status.md).

---

${docStatus}
`,
    "glossary.md": template.glossary,
    "document-status.md": template.documentStatus,
  },

  "01-product": {
    "vision.md": template.vision,
    "problem.md": template.problem,
    "users.md": template.users,
    "value-proposition.md": template.valueProp,
    "business-model.md": template.businessModel,
    "verticals.md": template.verticals,
    "mvp.md": template.mvp,
    "success-metrics.md": template.successMetrics,
  },

  "02-requirements": {
    "functional-requirements.md": template.functionalReq,
    "non-functional-requirements.md": template.nonFunctionalReq,
    "business-rules.md": template.businessRules,
    "permissions-matrix.md": template.permissionsMatrix,
    "acceptance-criteria.md": template.acceptance,
  },

  "03-domain": {
    "domain-overview.md": template.domainOverview,
    "actors.md": template.actors,
    "entities.md": template.entities,
    "aggregates.md": template.aggregates,
    "workflows.md": template.workflows,
    "state-machines.md": template.stateMachines,
    "domain-rules.md": template.domainRules,
  },

  "04-architecture": {
    "architecture-overview.md": template.archOverview,
    "principles.md": template.principles,
    "system-context.md": template.systemContext,
    "container-view.md": template.containerView,
    "component-view.md": template.componentView,
    "runtime-view.md": template.runtimeView,
    "deployment-view.md": template.deploymentView,
    "integration-architecture.md": template.integration,
    "evolution-roadmap.md": template.evolution,
  },

  "05-data": {
    "data-architecture.md": template.dataArchitecture,
    "database-schema.md": template.dbSchema,
    "entity-relationship.md": template.erDiagram,
    "data-dictionary.md": template.dataDictionary,
    "data-lifecycle.md": template.dataLifecycle,
    "indexing-strategy.md": template.indexing,
  },

  "06-api": {
    "api-overview.md": template.apiOverview,
    "conventions.md": template.apiConventions,
    "authentication.md": template.apiAuth,
    "authorization.md": template.apiAuthz,
    "errors.md": template.apiErrors,
    "pagination.md": template.apiPagination,
    "versioning.md": template.apiVersioning,
    "openapi.yaml": template.openapi,
  },

  "07-security": {
    "security-overview.md": template.securityOverview,
    "threat-model.md": template.threatModel,
    "authentication-security.md": template.authSecurity,
    "authorization-security.md": template.authzSecurity,
    "data-protection.md": template.dataProtection,
    "file-security.md": template.fileSecurity,
    "api-security.md": template.apiSecurity,
    "incident-response.md": template.incidentResponse,
  },

  "08-engineering": {
    "coding-standards.md": template.codingStandards,
    "git-workflow.md": template.gitWorkflow,
    "testing-strategy.md": template.testingStrategy,
    "quality-gates.md": template.qualityGates,
    "error-handling.md": template.errorHandling,
    "logging.md": template.logging,
    "observability.md": template.observability,
    "configuration.md": template.configuration,
    "dependency-policy.md": template.dependencyPolicy,
  },

  "09-infrastructure": {
    "environments.md": template.environments,
    "docker.md": template.docker,
    "local-development.md": template.localDev,
    "ci-cd.md": template.cicd,
    "deployment.md": template.deployment,
    "backup-recovery.md": template.backup,
    "monitoring.md": template.monitoring,
  },

  "10-decisions": {
    "README.md": template.adrReadme,
    "ADR-001-monorepo.md": template.adr("001", "Choix du monorepo"),
    "ADR-002-modular-monolith.md": template.adr("002", "Modular Monolith"),
    "ADR-003-typescript.md": template.adr("003", "TypeScript"),
    "ADR-004-express-react.md": template.adr("004", "Express + React"),
    "ADR-005-postgresql.md": template.adr("005", "PostgreSQL"),
    "ADR-006-prisma.md": template.adr("006", "Prisma ORM"),
    "ADR-007-rest-api.md": template.adr("007", "REST API"),
  },

  "11-ai-engineering": {
    "agents.md": template.agents,
    "skills.md": template.skills,
    "rules.md": template.aiRules,
    "hooks.md": template.hooks,
    "agent-workflow.md": template.agentWorkflow,
    "definition-of-done.md": template.definitionOfDone,
  },

  "12-roadmap": {
    "roadmap.md": template.roadmap,
    "milestones.md": template.milestones,
    "backlog.md": template.backlog,
    "release-strategy.md": template.releaseStrategy,
    "future-verticals.md": template.futureVerticals,
  },
};

/* ================================================================
 * GÉNÉRATION D'UN README PAR SECTION
 * ================================================================ */

const SECTION_META = {
  "01-product": {
    title: "Produit",
    description: "Vision, problème, utilisateurs, modèle économique.",
  },
  "02-requirements": {
    title: "Exigences",
    description: "Exigences fonctionnelles et non-fonctionnelles, règles métier.",
  },
  "03-domain": {
    title: "Domaine",
    description: "Modèle de domaine, entités, workflows, machines à états.",
  },
  "04-architecture": {
    title: "Architecture",
    description: "Architecture technique, vues C4, principes.",
  },
  "05-data": {
    title: "Données",
    description: "Schéma de base de données, ER, dictionnaire de données.",
  },
  "06-api": {
    title: "API",
    description: "Contrats API, conventions, authentification, erreurs.",
  },
  "07-security": {
    title: "Sécurité",
    description: "Modèle de menaces, protection des données, réponse aux incidents.",
  },
  "08-engineering": {
    title: "Ingénierie",
    description: "Standards de code, Git, tests, qualité.",
  },
  "09-infrastructure": {
    title: "Infrastructure",
    description: "Docker, CI/CD, déploiement, monitoring.",
  },
  "10-decisions": {
    title: "Décisions",
    description: "Architecture Decision Records.",
  },
  "11-ai-engineering": {
    title: "IA Engineering",
    description: "Agents, skills, règles pour les agents IA.",
  },
  "12-roadmap": {
    title: "Roadmap",
    description: "Roadmap produit, milestones, backlog.",
  },
};

/* ================================================================
 * MAIN
 * ================================================================ */

async function main() {
  console.log(`\n${c.bold}📚 Génération du blueprint DɛmɛPro${c.reset}`);
  console.log(`${c.gray}Racine : ${DOCS}${c.reset}`);

  if (DRY_RUN) log.warn("Mode DRY-RUN — aucun fichier ne sera écrit");
  if (FORCE) log.warn("Mode FORCE — les fichiers existants seront écrasés");

  await ensureDir(DOCS);

  const stats = { write: 0, skip: 0, dry: 0, err: 0 };

  /* Génère chaque section */
  for (const [section, files] of Object.entries(BLUEPRINT)) {
    log.header(`📁 ${section}`);

    const sectionDir = join(DOCS, section);
    await ensureDir(sectionDir);

    // Ajouter un README de section si non déjà défini
    const meta = SECTION_META[section];
    const filesWithReadme = { ...files };

    if (meta && !filesWithReadme["README.md"]) {
      const mdFiles = Object.keys(files).filter((f) => f.endsWith(".md"));
      filesWithReadme["README.md"] = template.sectionReadme(
        meta.title,
        meta.description,
        mdFiles,
      );
    }

    for (const [filename, content] of Object.entries(filesWithReadme)) {
      const filePath = join(sectionDir, filename);
      const label = `${section}/${filename}`;

      try {
        const result = await writeFileSafe(filePath, content, label);
        if (result === "write") stats.write++;
        else if (result === "skip") stats.skip++;
        else if (result === "dry") stats.dry++;
      } catch (error) {
        log.err(`${label} : ${error.message}`);
        stats.err++;
      }
    }
  }

  /* Résumé */
  log.header("📊 Résumé");
  console.log(`  ${c.green}Écrits   :${c.reset} ${stats.write}`);
  console.log(`  ${c.gray}Ignorés  :${c.reset} ${stats.skip}`);
  if (DRY_RUN) console.log(`  ${c.cyan}Dry-run  :${c.reset} ${stats.dry}`);
  if (stats.err) console.log(`  ${c.red}Erreurs  :${c.reset} ${stats.err}`);

  if (stats.skip > 0 && !FORCE) {
    log.warn(
      `Utilise ${c.bold}--force${c.reset} pour écraser les fichiers existants`,
    );
  }

  log.ok("\n✨ Blueprint prêt !\n");
}

main().catch((error) => {
  log.err(`Échec : ${error.message}`);
  if (VERBOSE) console.error(error);
  process.exit(1);
});