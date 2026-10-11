
# Machines à états

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Introduction

Ce document décrit les **machines à états** des entités du domaine.
Chaque machine définit : états, transitions autorisées, événements,
invariants.

## Flux ACHETER

### 📦 ProductStatus

**États** : DRAFT, ACTIVE, OUT_OF_STOCK, INACTIVE, ARCHIVED

```
        ┌─────────┐
        │  DRAFT  │
        └────┬────┘
             │ activate
             ▼
        ┌─────────┐
        │ ACTIVE  │◄─────┐
        └────┬────┘      │
             │           │
    stock=0  │           │ restock
             ▼           │
    ┌────────────────┐   │
    │ OUT_OF_STOCK   │───┘
    └────────────────┘
             │ archive
             ▼
        ┌─────────┐
        │ARCHIVED │
        └─────────┘
```

**Transitions autorisées** :

| De | Vers | Événement | Condition |
|---|---|---|---|
| DRAFT | ACTIVE | activate | stock > 0 |
| DRAFT | INACTIVE | deactivate | — |
| DRAFT | ARCHIVED | archive | — |
| ACTIVE | OUT_OF_STOCK | stock depleted | auto |
| ACTIVE | INACTIVE | deactivate | — |
| ACTIVE | ARCHIVED | archive | — |
| OUT_OF_STOCK | ACTIVE | restock | stock > 0 |
| OUT_OF_STOCK | ARCHIVED | archive | — |
| INACTIVE | ACTIVE | activate | stock > 0 |
| INACTIVE | ARCHIVED | archive | — |
| ARCHIVED | (terminal) | — | — |

```typescript
const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ["ACTIVE", "INACTIVE", "ARCHIVED"],
  ACTIVE: ["OUT_OF_STOCK", "INACTIVE", "ARCHIVED"],
  OUT_OF_STOCK: ["ACTIVE", "ARCHIVED"],
  INACTIVE: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [], // terminal
};
```

**Statut** : ✅ **Implémenté**

### 📋 OrderStatus

**États** : PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED

```
PENDING ──► PAID ──► SHIPPED ──► DELIVERED ──► REFUNDED
   │         │
   │         └──► CANCELLED
   │              (release + refund)
   └──► CANCELLED
        (release stock)
```

**Transitions autorisées** :

| De | Vers | Événement | Condition |
|---|---|---|---|
| PENDING | PAID | confirmPayment | paiement réussi |
| PENDING | CANCELLED | cancel | — |
| PAID | SHIPPED | ship | — |
| PAID | CANCELLED | cancel | release + refund |
| PAID | REFUNDED | refund | — |
| SHIPPED | DELIVERED | deliver | — |
| DELIVERED | REFUNDED | refund | dans les 30 jours |
| CANCELLED | (terminal) | — | — |
| REFUNDED | (terminal) | — | — |

```typescript
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

const REFUND_WINDOW_DAYS = 30;
```

**Statut** : ❌ **À implémenter**

### 🏪 StoreStatus

**États** : PENDING, ACTIVE, SUSPENDED, CLOSED

| De | Vers | Par qui |
|---|---|---|
| PENDING | ACTIVE | Admin |
| PENDING | REJECTED | Admin |
| ACTIVE | SUSPENDED | Admin |
| ACTIVE | CLOSED | Propriétaire/Admin |
| SUSPENDED | ACTIVE | Admin |
| SUSPENDED | CLOSED | Admin |
| REJECTED | (terminal) | — |
| CLOSED | (terminal) | — |

**Statut** : 🟡 **Modèle DB existe**

## Flux TROUVER

### 📋 QuoteStatus

**États** : PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED, CONVERTED

| De | Vers | Par qui |
|---|---|---|
| PENDING | RESPONDED | Professionnel |
| PENDING | EXPIRED | Système |
| RESPONDED | ACCEPTED | Client |
| RESPONDED | REJECTED | Client |
| RESPONDED | EXPIRED | Système |
| ACCEPTED | CONVERTED | Système |
| REJECTED | (terminal) | — |
| EXPIRED | (terminal) | — |
| CONVERTED | (terminal) | — |

```typescript
const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  PENDING: ["RESPONDED", "EXPIRED"],
  RESPONDED: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["CONVERTED"],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

const QUOTE_EXPIRY_DAYS = 7;
```

**Statut** : ❌ **Phase 2**

### 📅 BookingStatus

**États** : CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW

| De | Vers | Par qui |
|---|---|---|
| CONFIRMED | IN_PROGRESS | Professionnel |
| CONFIRMED | CANCELLED | Client/Pro (> 24h avant) |
| CONFIRMED | NO_SHOW | Professionnel |
| IN_PROGRESS | COMPLETED | Professionnel |
| IN_PROGRESS | CANCELLED | Exceptionnel |
| COMPLETED | (terminal) | — |
| CANCELLED | (terminal) | — |
| NO_SHOW | (terminal) | — |

**Statut** : ❌ **Phase 2**

### 🎨 ServiceStatus

**États** : DRAFT, ACTIVE, INACTIVE, ARCHIVED

**Statut** : ❌ **Phase 2**

## Flux Transverse

### 💳 PaymentStatus

**États** : PENDING, PROCESSING, PAID, FAILED, REFUNDED,
PARTIALLY_REFUNDED

| De | Vers | Événement |
|---|---|---|
| PENDING | PROCESSING | process |
| PENDING | FAILED | fail |
| PROCESSING | PAID | confirm |
| PROCESSING | FAILED | fail |
| PAID | REFUNDED | refund (total) |
| PAID | PARTIALLY_REFUNDED | partialRefund |
| PARTIALLY_REFUNDED | REFUNDED | refund (solde) |

**Statut** : ❌ **À implémenter**

### 🚚 DeliveryStatus

**États** : PREPARING, SHIPPED, IN_TRANSIT, DELIVERED, FAILED

**Statut** : ❌ **À implémenter**

## Tableau récapitulatif

| Machine | États | Statut |
|---|---|---|
| ProductStatus | 5 | ✅ |
| OrderStatus | 6 | ❌ |
| StoreStatus | 4 | 🟡 |
| QuoteStatus | 6 | ❌ Phase 2 |
| BookingStatus | 5 | ❌ Phase 2 |
| ServiceStatus | 4 | ❌ Phase 2 |
| PaymentStatus | 6 | ❌ |
| DeliveryStatus | 5 | ❌ |

## Bonnes pratiques

### 1. Centralisation

Chaque machine doit être définie en un seul endroit :
`apps/api/src/modules/<module>/domain/state-machines.ts`

### 2. Validation centralisée

```typescript
export function assertTransition<S extends string>(
  transitions: Record<S, S[]>,
  from: S,
  to: S,
  errorCode: CatalogErrorCode,
): void {
  if (!transitions[from].includes(to)) {
    throw new CatalogError(errorCode,
      `Transition interdite : ${from} → ${to}`);
  }
}
```

### 3. Historique des transitions

Pour Order et Payment : tracer dans une table d'historique.

### 4. Guards sur les transitions

Vérifier conditions supplémentaires (délai remboursement,
permissions, etc.).

### 5. Tests exhaustifs

Chaque transition doit être testée (autorisée + interdite).


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
