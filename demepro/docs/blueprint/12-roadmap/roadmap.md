
# Roadmap

> **Section** : 12-roadmap
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Vue d'ensemble

```
Phase 1 — FOUNDATION        ████████████████████  100%  ✅
Phase 2 — CATALOG           ████████████████████  100%  ✅
Phase 3 — STORE + CATEGORY  ███░░░░░░░░░░░░░░░░░   15%  ⏭️
Phase 4 — ORDER + PAYMENT   ░░░░░░░░░░░░░░░░░░░░    0%  ⏭️
Phase 5 — SERVICE (TROUVER) ░░░░░░░░░░░░░░░░░░░░    0%  🆕
Phase 6 — TRANSVERSE        ░░░░░░░░░░░░░░░░░░░░    0%  🆕
Phase 7 — ANALYTICS         ░░░░░░░░░░░░░░░░░░░░    0%
Phase 8 — FRONTENDS         ░░░░░░░░░░░░░░░░░░░░    0%
```

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

```
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
```

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


---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 0.2.0 |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | 2026-10-11 |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| 2026-10-11 | 0.2.0 | Intégration vision place de marché hybride | — |
