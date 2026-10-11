
# Entités

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Introduction

Ce document recense **toutes les entités du domaine DɛmɛPro**,
organisées par contexte borné. Pour chaque entité :

- **Identité** : comment elle est identifiée de façon unique
- **Propriétés** : ses attributs
- **Invariants** : les règles qui doivent toujours être vraies
- **Relations** : ses liens avec d'autres entités

## Contexte Identity

### User

- **Identité** : `id` (UUID)
- **Propriétés** : email, passwordHash, firstName, lastName, phone,
  status, createdAt, updatedAt
- **Invariants** :
  - email unique global
  - passwordHash non vide
  - status ∈ {ACTIVE, SUSPENDED, DELETED}
- **Relations** : 1-1 ProfessionalProfile, 1-N Order, Quote, Booking,
  Review, Address, Notification

### Role

- **Identité** : `id` (UUID)
- **Propriétés** : code, name, isSystem
- **Invariants** : code unique global, ∈ {CLIENT, PROFESSIONAL,
  ADMIN, SUPER_ADMIN}

### Permission

- **Identité** : `id` (UUID)
- **Propriétés** : code, description, resource, action
- **Invariants** : code unique global, format `<module>.<entity>.<action>`

### ProfessionalProfile

- **Identité** : `id` (UUID)
- **Propriétés** : userId, businessName, slug, description,
  verificationStatus, verifiedAt, phone, email
- **Invariants** : userId unique, slug unique, verificationStatus ∈
  {PENDING, VERIFIED, REJECTED}

### VerificationRequest

- **Identité** : `id` (UUID)
- **Propriétés** : professionalId, status, submittedAt, reviewedAt,
  reviewedBy, documents, notes
- **Invariants** : status ∈ {PENDING, APPROVED, REJECTED}

## Contexte ACHETER — Catalog

### Category

- **Identité** : `id` (UUID)
- **Propriétés** : verticalId, parentId?, name, slug, type, status,
  sortOrder
- **Invariants** : slug unique par vertical, type ∈ {PRODUCT, SERVICE},
  pas de cycle parent

### Product

- **Identité** : `id` (UUID)
- **Propriétés** : storeId, categoryId, name, slug, sku, description,
  status, hasVariants, price, currency
- **Invariants** :
  - slug unique par store
  - price obligatoire si hasVariants=false
  - price null si hasVariants=true
  - status ∈ {DRAFT, ACTIVE, OUT_OF_STOCK, INACTIVE, ARCHIVED}

### ProductVariant

- **Identité** : `id` (UUID)
- **Propriétés** : productId, name, sku, price, currency, attributes,
  isActive
- **Invariants** :
  - sku unique global
  - ne peut exister que si product.hasVariants=true
  - impossible de désactiver la dernière variante active

### ProductImage

- **Identité** : `id` (UUID)
- **Propriétés** : productId, objectKey, altText, sortOrder, isPrimary
- **Invariants** : au plus un isPrimary=true par productId,
  première image = primaire auto

### Inventory

- **Identité** : `id` (UUID)
- **Propriétés** : productId?, variantId?, quantity, reserved
- **Invariants** :
  - XOR(productId, variantId)
  - reserved ≤ quantity
  - quantity ≥ 0, reserved ≥ 0

## Contexte ACHETER — Store

### Store

- **Identité** : `id` (UUID)
- **Propriétés** : professionalId, name, slug, description, logoKey,
  bannerKey, status
- **Invariants** : slug unique, status ∈ {PENDING, ACTIVE, SUSPENDED,
  CLOSED}

### StoreHour

- **Identité** : `id` (UUID)
- **Propriétés** : storeId, dayOfWeek, openTime, closeTime, isClosed
- **Invariants** : dayOfWeek ∈ [0,6], si isClosed=false, openTime <
  closeTime

## Contexte ACHETER — Order

### Order

- **Identité** : `id` (UUID)
- **Propriétés** : userId, storeId, status, totalAmount, currency,
  deliveryAddress, deliveryFee
- **Invariants** :
  - status ∈ {PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED}
  - totalAmount ≥ 0
  - transitions valides uniquement

### OrderItem

- **Identité** : `id` (UUID)
- **Propriétés** : orderId, productId?, variantId?, productName,
  variantName, quantity, unitPrice, subtotal
- **Invariants** :
  - quantity > 0
  - XOR(productId, variantId)
  - snapshots immuables (productName, unitPrice)

### OrderStatusHistory

- **Identité** : `id` (UUID)
- **Propriétés** : orderId, fromStatus, toStatus, changedBy, changedAt,
  reason
- **Invariants** : fromStatus ≠ toStatus

## Contexte ACHETER — Delivery

### Delivery

- **Identité** : `id` (UUID)
- **Propriétés** : orderId, status, trackingNumber, carrier, shippedAt,
  deliveredAt
- **Invariants** : status ∈ {PREPARING, SHIPPED, IN_TRANSIT, DELIVERED,
  FAILED}

## Contexte TROUVER — Service

### Service

- **Identité** : `id` (UUID)
- **Propriétés** : professionalId, categoryId?, name, slug,
  description, pricingModel, basePrice, currency, durationMinutes,
  isActive
- **Invariants** :
  - slug unique global
  - pricingModel ∈ {QUOTE, FIXED, HOURLY}
  - si FIXED ou HOURLY → basePrice non null

### ServiceImage

- **Identité** : `id` (UUID)
- **Propriétés** : serviceId, objectKey, altText, sortOrder, isPrimary
- **Invariants** : au plus un isPrimary=true par serviceId

### ServiceZone

- **Identité** : `id` (UUID)
- **Propriétés** : serviceId, city, region, radiusKm
- **Invariants** : au moins un des 3 champs non null

### Availability

- **Identité** : `id` (UUID)
- **Propriétés** : serviceId, dayOfWeek?, startTime?, endTime?,
  specificDate?, isRecurring
- **Invariants** :
  - si isRecurring=true → dayOfWeek + startTime < endTime
  - si isRecurring=false → specificDate non null

## Contexte TROUVER — Quote

### Quote

- **Identité** : `id` (UUID)
- **Propriétés** : userId, serviceId, status, description, address,
  preferredDate, budget, expiresAt
- **Invariants** :
  - status ∈ {PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED,
    CONVERTED}
  - si ACCEPTED → Booking existe

### QuoteResponse

- **Identité** : `id` (UUID)
- **Propriétés** : quoteId, professionalId, proposedPrice, currency,
  message, proposedDate, expiresAt
- **Invariants** : quoteId unique, expiresAt > createdAt

## Contexte TROUVER — Booking

### Booking

- **Identité** : `id` (UUID)
- **Propriétés** : userId, serviceId, quoteId?, status, scheduledAt,
  duration, address, totalAmount, currency
- **Invariants** :
  - status ∈ {CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW}
  - un créneau ne peut être réservé qu'une fois

## Contexte Transverse

### Address

- **Identité** : `id` (UUID)
- **Propriétés** : userId, label, line1, line2, city, region, country,
  postalCode, phone, isDefault
- **Invariants** : au plus un isDefault=true par userId

### Payment

- **Identité** : `id` (UUID)
- **Propriétés** : orderId?, bookingId?, amount, currency, status,
  provider, providerRef, paidAt, refundedAt
- **Invariants** :
  - XOR(orderId, bookingId)
  - status ∈ {PENDING, PROCESSING, PAID, FAILED, REFUNDED,
    PARTIALLY_REFUNDED}

### Transaction

- **Identité** : `id` (UUID)
- **Propriétés** : paymentId, type, amount, providerRef, status
- **Invariants** : type ∈ {CHARGE, REFUND, REVERSAL}

### Review

- **Identité** : `id` (UUID)
- **Propriétés** : userId, rating, comment, productId?, variantId?,
  serviceId?, storeId?, professionalId?, orderId?, bookingId?,
  isVerifiedPurchase
- **Invariants** :
  - rating ∈ [1, 5]
  - au moins un lien non null
  - un seul avis par order/booking

### ReviewReport

- **Identité** : `id` (UUID)
- **Propriétés** : reviewId, reportedBy, reason, status
- **Invariants** : status ∈ {PENDING, RESOLVED, DISMISSED}

### Notification

- **Identité** : `id` (UUID)
- **Propriétés** : userId, type, channel, title, body, readAt, sentAt
- **Invariants** : type et channel valides, title non vide

### NotificationTemplate

- **Identité** : `id` (UUID)
- **Propriétés** : type, channel, subjectTemplate, bodyTemplate,
  variables, isActive
- **Invariants** : type+channel unique

### AnalyticsEvent

- **Identité** : `id` (UUID)
- **Propriétés** : type, userId?, entityType, entityId, metadata,
  occurredAt
- **Invariants** : type non vide

## Diagramme de relations global

```
User ─┬─► ProfessionalProfile ─┬─► Store ─┬─► Product ─┬─► Variant ──► Inventory
      │                        │          │            └─► Image
      │                        │          └─► Order ─┬─► OrderItem
      │                        │                     ├─► Payment ──► Transaction
      │                        │                     ├─► Delivery
      │                        │                     └─► Review
      │                        │
      │                        └─► Service ─┬─► ServiceImage
      │                                     ├─► ServiceZone
      │                                     ├─► Availability
      │                                     ├─► Quote ─┬─► QuoteResponse
      │                                     │          └─► Booking ─┬─► Payment
      │                                     │                       └─► Review
      │                                     └─► Review
      ├─► Order, Quote, Booking, Review
      ├─► Address
      └─► Notification
```

## Value Objects

| VO | Contexte | Description |
|---|---|---|
| Money | Transverse | Montant + devise |
| Slug | Catalog, Store | Identifiant URL-friendly |
| SKU | Catalog | Stock Keeping Unit |
| Phone | Identity | Téléphone normalisé |
| Email | Identity | Email validé |
| Address | Transverse | Adresse structurée |
| TimeRange | Service | Créneau horaire |
| Rating | Review | Note 1-5 |

## Compteurs

| Contexte | Entités | Statut |
|---|---|---|
| Identity | 5 | 🟡 60% |
| Catalog | 5 | ✅ 100% |
| Store | 2 | 🟡 15% |
| Order | 3 | ❌ 0% |
| Delivery | 1 | ❌ 0% |
| Service | 4 | ❌ 0% |
| Quote | 2 | ❌ 0% |
| Booking | 1 | ❌ 0% |
| Transverse | 6 | ❌ 0% |
| **Total** | **29** | **~30%** |


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
