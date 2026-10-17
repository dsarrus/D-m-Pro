
# Milestones

> **Section** : 12-roadmap
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-17

## Vue d'ensemble

```
M1 ── Catalog validé              ✅ ATTEINT
M2 ── Store + Category + KYC      ✅ ATTEINT
M3 ── Order + Payment             ✅ ATTEINT
M4 ── Transverse (6.1 + 6.2 + 6.3) ✅ ATTEINT
M5 ── Service 5.1                 ✅ ATTEINT
M6 ── Service 5.2 (Quote)         ✅ ATTEINT (2026-10-17)
M7 ── Service 5.3 + 5.4           ⏭️ EN COURS
M8 ── MVP ACHETER (beta)          ⏭️ PRÉVU
M9 ── GA (production)             ⏭️ PRÉVU
```

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

## M6 — Service 5.2 (Quote) ✅

**Date d'atteinte** : 2026-10-17

- [x] Schéma Prisma (Quote + QuoteResponse + BookingStatus + professionalId)
- [x] QuoteRepository (cursor pagination, findExpired response-aware)
- [x] QuoteService (create, respond, accept→Booking, reject, expire)
- [x] Transactions Serializable + retry P2034
- [x] QuoteController + 8 routes REST
- [x] Notifications Quote (received / responded / accepted)
- [x] **32 tests supplémentaires**
- [x] **Total : 422 tests verts**

## M7 — Service 5.3 + 5.4 ⏭️

**Date cible** : À définir (estimé 2 semaines)

- [ ] BookingService (create, confirm, complete, cancel, noShow)
- [ ] BookingController + routes
- [ ] Gestion des conflits de créneaux
- [ ] Intégration Availability
- [ ] Payment XOR Order/Booking
- [ ] Review étendu (serviceId + bookingId)

## M8 — MVP ACHETER (beta) ⏭️

**Date cible** : après M7

- [ ] Frontend web client
- [ ] Backoffice admin
- [ ] Monitoring

## M9 — GA (production) ⏭️

**Date cible** : après M8

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
| J8 | **Service 5.2 (Quote) livré — 422 tests** | ✅ |
| J9 | Service 5.3 (Booking) | ⏭️ |
| J10 | Service 5.4 (Payment + Review) | ⏭️ |
| J11 | Frontend MVP | ⏭️ |
| J12 | 1 000 utilisateurs | ⏭️ |

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| 2026-10-17 | 0.5.0 | M6 Quote atteint, 422 tests | — |
