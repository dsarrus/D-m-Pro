
# Entités

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-17

## Vue d'ensemble

Le domaine DɛmɛPro est composé de **29+ entités** organisées en 9 contextes bornés.

## Contexte Identity

### User
- **Identité** : id (UUID)
- **Invariants** : email unique, passwordHash non vide, status ∈ {ACTIVE, SUSPENDED, DELETED}

### Role
- **Identité** : id (UUID)
- **Invariants** : code unique ∈ {CLIENT, PROFESSIONAL, ADMIN, SUPER_ADMIN}

### Permission
- **Identité** : id (UUID)
- **Invariants** : code unique

### ProfessionalProfile
- **Identité** : id (UUID)
- **Invariants** : userId unique, slug unique, verificationStatus ∈ {UNVERIFIED, PENDING, VERIFIED, REJECTED, EXPIRED}, verificationLevel ∈ {BASIC, TRUSTED, CERTIFIED}

### Verification
- **Identité** : id (UUID)
- **Invariants** : type ∈ {IDENTITY, BUSINESS, PROFESSIONAL, PHONE}

### RefreshToken
- **Identité** : id (UUID)
- **Invariants** : tokenHash unique

### AuditLog
- **Identité** : id (UUID)

### CustomerProfile
- **Identité** : id (UUID)

## Contexte ACHETER — Catalog

### Category
- **Invariants** : slug unique par vertical, type ∈ {PRODUCT, SERVICE, BOTH}

### Product
- **Invariants** : slug unique par store, price obligatoire si hasVariants=false, price null si hasVariants=true

### ProductVariant
- **Invariants** : sku unique global, ne peut exister que si product.hasVariants=true

### ProductImage
- **Invariants** : au plus 1 isPrimary=true par produit

### Inventory
- **Invariants** : XOR(productId, variantId), reserved ≤ quantity

### Vertical
- **Invariants** : code unique ∈ {ARTISANS, MAISON, AUTO, SERVICES, EMPLOI}

## Contexte ACHETER — Store

### Store
- **Invariants** : slug unique, professionalId unique (mono-boutique), status ∈ {DRAFT, ACTIVE, SUSPENDED, CLOSED}

## Contexte ACHETER — Order

### Order
- **Invariants** : status ∈ {PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED}, totalAmount ≥ 0

### OrderItem
- **Invariants** : quantity > 0, XOR(productId, variantId), snapshots figés

### OrderStatusHistory
- **Invariants** : fromStatus ≠ toStatus

## Contexte TROUVER — Service

### Service
- **Invariants** : slug unique par professionnel, pricingModel ∈ {QUOTE, FIXED, HOURLY}, basePrice cohérent avec pricingModel

### ServiceImage
- **Invariants** : au plus 1 isPrimary=true

### ServiceZone
- **Invariants** : au moins city OU region OU radiusKm

### Availability
- **Invariants** : récurrente → dayOfWeek + startTime < endTime, ponctuelle → specificDate

### Quote (stub)
- **Invariants** : status ∈ {PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED, CONVERTED}

### QuoteResponse (stub)
- **Invariants** : quoteId unique

### Booking (stub)
- **Invariants** : status ∈ {CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW}, un créneau ne peut être réservé qu'une fois

## Contexte Transverse

### Address
- **Invariants** : au plus 1 isDefault=true par user

### Payment
- **Invariants** : XOR(orderId, bookingId), status ∈ {PENDING, PROCESSING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED}, providerRef unique si non null

### Review
- **Invariants** : rating ∈ [1, 5], au moins 1 cible (productId, variantId, storeId, professionalId, serviceId), XOR(orderId, bookingId), au plus 1 avis par order/booking

### ReviewReport
- **Invariants** : status ∈ {PENDING, RESOLVED, DISMISSED}

### Notification
- **Invariants** : type, title non vides

### IdempotencyKey
- **Invariants** : (key, scope) unique, requestHash non vide

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| 2026-10-17 | 0.4.0 | Ajout Service, ServiceImage, ServiceZone, Availability, Quote, Booking, Notification, ReviewReport | — |
