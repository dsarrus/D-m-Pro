# Changelog

Toutes les modifications notables du projet sont documentées ici.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnement selon [Semantic Versioning](https://semver.org/lang/fr/).

---

## [Unreleased]

### En cours
- Phase 5.2 — Quote (devis) : demande, réponse, acceptation, conversion en Booking

### Prévu
- Phase 5.3 — Booking (réservation de créneaux)
- Phase 5.4 — Intégration Payment (XOR Order/Booking) + Review étendu
- Phase 7 — Analytics
- Phase 8 — Frontends (web + admin)

---

## [0.7.0] — 2026-10-12

### Ajouté — Phase 5.1 : Module Service (TROUVER)

#### Modèles Prisma
- **`Service`** enrichi : `pricingModel`, `basePrice`, `ratingAverage`, `ratingCount`
- **`ServiceImage`** : images portfolio (1 seule primaire)
- **`ServiceZone`** : zones d'intervention (city / region / radius)
- **`Availability`** : créneaux récurrents et ponctuels
- Stubs : **`Quote`**, **`QuoteResponse`**, **`Booking`** (pour 5.2 et 5.3)
- **`Review`** étendu : `serviceId`, `bookingId`, `orderId` nullable
- Contraintes DB : `reviews_source_check` (XOR order/booking)

#### Repositories
- `ServiceRepository`
- `ServiceImageRepository`
- `ServiceZoneRepository`
- `AvailabilityRepository`

#### Service
- **`ServiceService`** — CRUD complet, création atomique `createServiceFull`
- **`ServiceController`** — 15 endpoints REST
- **`ServiceError`** — 17 codes métier

#### Règles métier
- `QUOTE` ⟹ pas de `basePrice` ; `FIXED` / `HOURLY` ⟹ `basePrice` requis
- Slug unique par professionnel
- Images : première = primaire auto, promotion à la suppression
- Zones : au moins 1 info (city / region / radius)
- Availabilities : chevauchement interdit (intra-DTO ET vs DB)
- Rollback atomique complet en cas d'échec

#### Tests (46)
- 28 tests d'intégration
- 18 tests E2E

---

## [0.6.0] — 2026-10-12

### Ajouté — Phase 6 : Modules transverses

#### Phase 6.1 — Address
- **`AddressService`** : CRUD + adresse par défaut
- Contrainte DB : index partiel `(user_id) WHERE is_default = TRUE`
- Promotion automatique à la suppression de la défaut
- Limite 20 adresses / user
- 13 tests intégration + 8 tests E2E

#### Phase 6.2 — Review
- **`Review`** enrichi : cible polymorphe + `isVerifiedPurchase` + modération
- **`ReviewReport`** : signalements
- **`ReviewService`** : création vérifiée, fenêtre modification 7 jours, modération admin
- Recalcul synchrone de `Store.ratingAverage` / `ratingCount`
- Contrainte SQL `reviews_target_check` (au moins 1 cible)
- 14 tests intégration + 11 tests E2E

#### Phase 6.3 — Notification
- **`NotificationProviderInterface`** (email + SMS)
- **`MockEmailProvider`** + **`MockSmsProvider`**
- **`NotificationTemplateService`** : order_created, paid, shipped, delivered, review_received
- **`NotificationService`** : fire-and-forget (ne bloque pas la transaction métier)
- Intégration dans `OrderService` et `ReviewService`
- Endpoints REST : `/notifications/mine`, `/notifications/unread-count`, `/notifications/:id/read`, `/notifications/read-all`
- 7 tests intégration + 5 tests E2E

### Corrigé
- **`errorHandler`** : détection générique par forme (`code` + `statusCode`) au lieu de `instanceof CatalogError`
- **`validate`** : compatibilité Express 5 (`Object.defineProperty` pour `req.query` / `req.params`)
- **Webhook Payment** : conversion `Buffer → string` pour le raw body (signature HMAC)
- **Zod** : `createSchema.partial()` conserve les `.default()` → DTOs update corrigés
- Suppression du doublon `shared/errors/error-handler.ts`

---

## [0.5.0] — 2026-10-12

### Ajouté — Phase 4 : Order + Payment

#### Order
- Modèles **`Order`**, **`OrderItem`**, **`OrderStatusHistory`**
- **`OrderService`** : cycle de vie complet
  - `PENDING → PAID → SHIPPED → DELIVERED`
  - Annulation + refund
- Réservation de stock atomique dans la transaction (via `InventoryService` avec `tx?`)
- Snapshots immuables `productName` / `variantName` / `unitPrice` dans `OrderItem`
- **`OrderController`** — 7 endpoints REST
- 14 tests intégration + 21 tests E2E

#### Payment
- Modèle **`Payment`** (XOR `orderId` / `bookingId` préparé)
- **`PaymentProviderInterface`** : `initiate`, `verifyWebhook`, `refund`
- **`MockProvider`** avec signature HMAC-SHA256
- **`OrangeMoneyProvider`** + **`WaveProvider`** (squelettes)
- **`PaymentService`** : `initiatePayment`, `handleWebhook` (idempotent), `refundPayment`
- **`PaymentController`** + **`PaymentWebhookController`**
- Endpoints : `/orders/:id/payment`, `/webhooks/payment/:provider`
- 14 tests intégration + 8 tests E2E

#### Corrections critiques
- **`InventoryService.reserve` / `release` / `commitReservation`** acceptent un `tx?` optionnel
  → permet l'atomicité complète depuis une transaction parente
- Isolation `Serializable` + retry `P2034` sur les transitions critiques

---

## [0.4.0] — 2026-10-12

### Ajouté — Phase 3 : Store + Category + KYC progressif

#### Store
- **`StoreService`** : CRUD + statuts (DRAFT → ACTIVE → SUSPENDED → CLOSED)
- Contrainte DB : `professionalId @unique` (mono-boutique stricte)
- **`StoreController`** + routes REST (public + pro + admin)
- 20 tests

#### Category
- **`CategoryService`** : CRUD + hiérarchie (3 niveaux max)
- Détection de cycles, compatibilité de type parent/enfant
- Admin-only pour les écritures
- 15 tests

#### Verification (KYC progressif)
- **`VerificationService`** : système progressif `BASIC → TRUSTED → CERTIFIED`
  - BASIC : inscription + téléphone confirmé
  - TRUSTED : selfie + 3 transactions réussies (auto-validé)
  - CERTIFIED : KYC optionnel + validation admin
- Nouveaux champs : `verificationLevel`, `successfulTransactions`, `verifiedAt`, `certifiedAt`
- 13 tests

#### Décisions structurantes
- **Mono-boutique** : 1 professionnel = 1 boutique
- **KYC assoupli** : Phase 1 = téléphone confirmé uniquement (adapté au contexte malien)
- **Hiérarchie Category** : 3 niveaux max
- **Admin-only** pour Category

---

## [0.3.0] — 2026-10-10

### Ajouté — Phase 2 : Module Catalog

#### Services
- **`ProductService`** — CRUD complet, création atomique, idempotence
- **`ProductVariantService`** — CRUD, SKU unique, gestion `hasVariants`
- **`ProductImageService`** — cohérence primaire, réordonnancement
- **`InventoryService`** — réservation atomique, commit, release
- **`IdempotencyService`** — anti-double-soumission avec scope composite

#### Repositories
- `ProductRepository`
- `ProductVariantRepository`
- `ProductImageRepository`
- `InventoryRepository` — méthodes SQL atomiques (`tryReserve`, `tryRelease`, `tryCommitReservation`)

#### Contraintes base de données
- SKU unique global sur `ProductVariant`
- Slug unique par store sur `Product`
- Contrainte XOR sur `Inventory` (`productId` XOR `variantId`)
- Champ `requestHash` sur `IdempotencyKey`
- Clé composite `(key, scope)` sur `IdempotencyKey`

#### Tests (142)
- 97 tests d'intégration
- 45 tests E2E

### Modifié
- `CatalogError` : passage de `type union` à `objet const as const`

### Corrigé
- `InventoryService.reserve()` : condition `reserved <= 0` supprimée (bloquait les réservations cumulatives)
- `ProductImageService.createImage()` : première image primaire auto
- `ProductImageService.updateImage()` : refus retrait primaire sans successeur

---

## [0.2.0] — 2026-09-XX

### Ajouté
- Module Auth (JWT + RBAC)
- Module Store (modèle DB)
- Module Category (modèle DB)
- Schéma Prisma initial
- Configuration Testcontainers

---

## [0.1.0] — 2026-09-XX

### Ajouté
- Initialisation du monorepo pnpm
- Configuration TypeScript, ESLint, Prettier
- Setup Vitest
- Structure `apps/api`, `apps/web`, `apps/admin`

---

## Statistiques cumulées

| Version | Tests ajoutés | Cumul |
|---|---|---|
| 0.1.0 | — | — |
| 0.2.0 | — | — |
| 0.3.0 | 142 | 142 |
| 0.4.0 | 48 | 190 |
| 0.5.0 | 57 | 247 |
| 0.6.0 | 58 | 305 |
| 0.7.0 | 46 | **351** * |
| En cours | 39 | **390** |

\* Note : entre 0.6.0 et 0.7.0, des tests supplémentaires (Address + Review + Notification) portent le total à 344 avant Service.