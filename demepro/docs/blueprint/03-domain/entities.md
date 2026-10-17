
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

## Contexte TROUVER — Quote ✅ (Phase 5.2)

### Quote
- **Identité** : id (UUID)
- **Relations** : user (client), service (obligatoire), response (1-1), booking (0-1 inverse)
- **Invariants** :
  - status ∈ {PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED, CONVERTED}
  - budget ≥ 0 si renseigné
  - expiresAt > createdAt (défaut : +7j à la création)
- **Cycle de vie** :

\`\`\`
PENDING ──respond──► RESPONDED ──accept──► ACCEPTED ──convert──► CONVERTED
   │                    │
   │                    └──reject──► REJECTED
   │
   └──reject──► REJECTED
(tout état non-terminal peut basculer vers EXPIRED)
\`\`\`

- **Prolongation** : lors de respondToQuote, Quote.expiresAt est aligné sur QuoteResponse.expiresAt (validityDays, défaut 7j)
- **Unicité** : QuoteResponse.quoteId unique, Booking.quoteId unique

### QuoteResponse
- **Identité** : id (UUID)
- **Relations** : quote (1-1), professional (propriétaire du service au moment de la réponse)
- **Invariants** :
  - quoteId unique (1 réponse max par devis)
  - proposedPrice > 0
  - expiresAt > createdAt
  - professionalId tracé (audit + notifications)

## Contexte TROUVER — Booking ✅ (Phase 5.3)

### Booking
- **Identité** : id (UUID)
- **Relations** : service (obligatoire), user (client, obligatoire), quote (0-1, unique si renseigné), reviews[]
- **Invariants** :
  - status ∈ {CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW}
  - scheduledAt dans le futur lors de la création
  - (serviceId, scheduledAt) unique (pas de double réservation)
  - un Booking ne peut être lié qu'à un seul Quote via quoteId unique
- **Cycle de vie** :

\`\`\`
CONFIRMED ──start──► IN_PROGRESS ──complete──► COMPLETED
    │                     │
    │                     └──cancel──► CANCELLED
    │
    ├──cancel──► CANCELLED
    └──noShow──► NO_SHOW (uniquement si scheduledAt passé)
\`\`\`

- **Règles** :
  - Un Booking direct (POST /bookings) est créé uniquement si Service.pricingModel ∈ {FIXED, HOURLY}. Les services QUOTE doivent passer par le cycle Quote → Booking.
  - Un conflit de créneau est détecté via (serviceId, scheduledAt, status IN [CONFIRMED, IN_PROGRESS]).
  - Le pro ne peut pas réserver son propre service.
  - Le pro peut marquer NO_SHOW uniquement après scheduledAt.

## Contexte Transverse

### Address
- **Invariants** : au plus 1 isDefault=true par user

### Payment
- **Invariants** (actuels) : orderId unique, status ∈ {PENDING, PROCESSING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED}, providerRef unique si non null
- **À venir Phase 5.4** : XOR(orderId, bookingId), bookingId unique

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
| 2026-10-17 | 0.6.0 | Booking finalisé (cycle + règles métier), Payment prêt pour 5.4 | — |
