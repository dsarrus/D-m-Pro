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
- `ProductService` — CRUD complet, création atomique, idempotence
- `ProductVariantService` — CRUD, SKU unique, gestion `hasVariants`
- `ProductImageService` — cohérence primaire, réordonnancement
- `InventoryService` — réservation atomique, commit, release
- `IdempotencyService` — anti-double-soumission avec scope composite

#### Repositories
- `ProductRepository`
- `ProductVariantRepository`
- `ProductImageRepository`
- `InventoryRepository` — méthodes SQL atomiques

#### Contraintes base de données
- SKU unique global sur `ProductVariant`
- Slug unique par store sur `Product`
- Contrainte XOR sur `Inventory`
- Champ `requestHash` sur `IdempotencyKey`
- Clé composite `(key, scope)` sur `IdempotencyKey`

#### Tests d'intégration (97 tests sur PostgreSQL réel)

Voir [docs/modules/catalog.md](./docs/modules/catalog.md) pour le détail.

### Modifié
- `CatalogError` : passage de `type union` à `objet const as const`
- `IdempotencyService` : alignement sur clé composite `(key, scope)`

### Corrigé
- `InventoryService.reserve()` : condition `reserved <= 0` supprimée
- `ProductImageService.createImage()` : première image primaire auto
- `ProductImageService.updateImage()` : refus retrait primaire sans successeur

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
