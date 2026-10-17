
# Roadmap

> **Section** : 12-roadmap
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-17

## Vue d'ensemble

```
Phase 1 — Foundation          ████████████████████  100%  ✅
Phase 2 — Catalog             ████████████████████  100%  ✅
Phase 3 — Store + Category    ████████████████████  100%  ✅
Phase 4 — Order + Payment     ████████████████████  100%  ✅
Phase 5 — Service (TROUVER)   ████████████████░░░░   80%  🚧
Phase 6 — Transverse          ████████████████████  100%  ✅
Phase 7 — Analytics           ░░░░░░░░░░░░░░░░░░░░    0%  ⏭️
Phase 8 — Frontends           ░░░░░░░░░░░░░░░░░░░░    0%  ⏭️
```

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

**Statut** : 80% 🚧

### 5.1 Service ✅
- [x] Modèle Service enrichi (pricingModel, basePrice, ratingAverage, ratingCount)
- [x] ServiceImage, ServiceZone, Availability
- [x] ServiceService (CRUD + images + zones + availabilities)
- [x] ServiceController + 15 routes
- [x] **46 tests** (28 intégration + 18 E2E)

### 5.2 Quote ✅ (livré 2026-10-17)
- [x] Modèle Quote enrichi (QuoteStatus 6 états, budget, expiresAt)
- [x] Modèle QuoteResponse (proposedPrice, currency, proposedDate, expiresAt, professionalId)
- [x] QuoteRepository (cursor pagination, findExpired)
- [x] QuoteService (create, respond, accept→Booking, reject, expire)
- [x] Transactions Serializable + retry P2034
- [x] QuoteController + 8 routes REST
- [x] Notifications Quote (received / responded / accepted)
- [x] **32 tests** (21 intégration + 11 E2E)

### 5.3 Booking ⏭️
- [ ] BookingService (create, confirm, complete, cancel, noShow)
- [ ] BookingController + routes
- [ ] Gestion des conflits de créneaux
- [ ] Intégration Availability
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
- [x] Intégration OrderService + ReviewService + QuoteService
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
| 2026-10-17 | 0.5.0 | Phase 5.2 Quote livrée (32 tests), 422 tests verts | — |
