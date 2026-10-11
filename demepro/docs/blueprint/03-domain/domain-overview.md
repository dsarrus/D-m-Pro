
# Vue d'ensemble du domaine

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Introduction

Le domaine DɛmɛPro se structure autour de **deux flux métier
parallèles** qui partagent une **infrastructure de confiance commune** :

1. **Flux ACHETER** — Vente de produits physiques (e-commerce)
2. **Flux TROUVER** — Prestation de services (marketplace de
   compétences)

Ces deux flux convergent sur quatre **points de jonction** :
le besoin du client, les professionnels vérifiés, la transaction
sécurisée, et l'avis post-transaction.

## Carte des domaines

```
                    ┌─────────────────────┐
                    │     IDENTITY        │
                    │  (User, Role, KYC)  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                                 │
              ▼                                 ▼
   ┌──────────────────────┐       ┌──────────────────────┐
   │   FLUX ACHETER       │       │   FLUX TROUVER       │
   │   (produits)         │       │   (services)         │
   ├──────────────────────┤       ├──────────────────────┤
   │  Catalog             │       │  Service             │
   │  Store               │       │  Professional        │
   │  Order               │       │  Quote               │
   │  Delivery            │       │  Booking             │
   └──────────┬───────────┘       └──────────┬───────────┘
              │                              │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     TRANSVERSE                │
              │  Payment • Review             │
              │  Address • Notification       │
              │  Analytics                    │
              └──────────────────────────────┘
```

## Bounded Contexts

### 1. Identity Context

**Responsabilité** : Authentification, autorisation, profils, KYC.

**Entités** : User, Role, Permission, UserRoleAssignment,
ProfessionalProfile, VerificationRequest

**Statut** : 🟡 60%

### 2. ACHETER Context

**Responsabilité** : Vente de produits physiques.

**Sous-contextes** :

| Sous-contexte | Entités | Statut |
|---|---|---|
| Catalog | Product, Variant, Image, Inventory, Category | ✅ 100% |
| Store | Store, StoreHour | 🟡 15% |
| Order | Order, OrderItem, OrderStatusHistory | ❌ 0% |
| Delivery | Delivery | ❌ 0% |

### 3. TROUVER Context

**Responsabilité** : Prestation de services.

**Sous-contextes** :

| Sous-contexte | Entités | Statut |
|---|---|---|
| Service | Service, ServiceImage, ServiceZone, Availability | ❌ 0% |
| Quote | Quote, QuoteItem, QuoteResponse | ❌ 0% |
| Booking | Booking, BookingSlot | ❌ 0% |

### 4. Transverse Context

| Sous-contexte | Entités | Statut |
|---|---|---|
| Payment | Payment, Transaction, Refund | ❌ 0% |
| Review | Review, Rating, Report | ❌ 0% |
| Address | Address | ❌ 0% |
| Notification | Notification, Template | ❌ 0% |
| Analytics | Event, Metric | ❌ 0% |

## Relations entre contextes

```
Identity ─────► Tous les autres (identité + permissions)
Catalog ──────► Order
Store ────────► Catalog, Order
Order ────────► Payment, Review
Service ──────► Quote
Quote ────────► Booking
Booking ──────► Payment, Review
Payment ──────► Notification
```

## État d'avancement

| Contexte | Statut | Tests | Priorité |
|---|---|---|---|
| Identity | 🟡 60% | — | P0 |
| Catalog | ✅ 100% | 142 | ✅ |
| Store | 🟡 15% | — | P0 |
| Category | 🟡 15% | — | P0 |
| Order | ❌ 0% | — | P0 |
| Payment | ❌ 0% | — | P0 |
| Service | ❌ 0% | — | P1 (Phase 2) |
| Quote | ❌ 0% | — | P1 (Phase 2) |
| Booking | ❌ 0% | — | P1 (Phase 2) |
| Review | ❌ 0% | — | P1 |
| Address | ❌ 0% | — | P1 |
| Notification | ❌ 0% | — | P1 |
| Analytics | ❌ 0% | — | P2 |

## Frontières du domaine

### Dans le domaine

- Gestion utilisateurs et rôles
- Catalogue produits
- Gestion boutiques
- Commandes et cycle de vie
- Prestations de service
- Devis et réservation
- Paiements (via providers)
- Avis et réputation
- Notifications transactionnelles

### Hors du domaine (intégrations)

- Systèmes de paiement (Orange Money, Wave)
- Fournisseurs SMS/Email (Twilio, SendGrid)
- CDN / Stockage (S3, SeaweedFS)
- Auth OAuth (Google, Facebook)
- Logistique externe
- Comptabilité

## Évolution du domaine

### Phase 1 — MVP (ACHETER uniquement)
Identity ✅, Catalog ✅, Store 🟡, Category 🟡, Order ❌,
Payment ❌, Review ❌, Address ❌, Notification ❌

### Phase 2 — Extension (TROUVER)
Service ❌, Quote ❌, Booking ❌

### Phase 3 — Écosystème
Analytics ❌, Programme de fidélité ❌, API publique ❌

### Phase 4 — Expansion
Multi-pays, multi-devises, multi-langues, B2B

## Décisions structurantes

1. **Modular Monolith** — Un seul déployable
2. **Catalog comme socle** — Réutilisable par les deux flux
3. **Deux flux, une confiance** — Mécanismes mutualisés
4. **DDD léger** — Principes sans dogmatisme
5. **API-first** — API claire par contexte


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
