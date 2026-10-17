
# DɛmɛPro

Plateforme e-commerce B2B/B2C pour artisans et professionnels du Mali.

## État du projet

\`\`\`
Tests verts     : 456 ✅
Modules livrés  : 12
Migrations      : 16
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
| Quote (devis) | ✅ | 32 |
| **Booking (réservation)** | **✅** | **33** |

**Phase en cours** : 5.4 — Intégration Payment + Review

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
| 2026-10-17 | 0.6.0 | Booking livré, 456 tests, 12 modules | — |
