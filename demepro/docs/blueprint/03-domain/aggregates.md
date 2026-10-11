
# Agrégats

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Introduction

Un **agrégat** est un groupe d'entités et de value objects traités
comme une **unité transactionnelle cohérente**. Chaque agrégat a une
**racine (Aggregate Root)** qui est le seul point d'entrée pour
modifier l'agrégat.

**Règles fondamentales** :

1. **Une transaction = un agrégat** (dans la mesure du possible)
2. **On ne référence que l'ID** d'un autre agrégat, jamais son objet
3. **L'accès aux entités internes passe par la racine**
4. **Les invariants sont garantis par la racine**

## Carte des agrégats

```
FLUX ACHETER
─────────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Product      │    │      Store      │    │      Order      │
│   (agrégat)     │    │    (agrégat)    │    │   (agrégat)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Product       │    │ • Store         │    │ • Order         │
│ • Variant[]     │    │ • StoreHour[]   │    │ • OrderItem[]   │
│ • Image[]       │    │                 │    │ • StatusHistory │
│ • Inventory     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

FLUX TROUVER
────────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Service      │    │      Quote      │    │     Booking     │
│   (agrégat)     │    │   (agrégat)     │    │   (agrégat)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Service       │    │ • Quote         │    │ • Booking       │
│ • Image[]       │    │ • QuoteResponse │    │                 │
│ • Zone[]        │    │                 │    │                 │
│ • Availability[]│    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

TRANSVERSE
──────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Payment      │    │     Review      │    │      User       │
│   (agrégat)     │    │   (agrégat)     │    │   (agrégat)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Payment       │    │ • Review        │    │ • User          │
│ • Transaction[] │    │ • Report[]      │    │ • Address[]     │
│                 │    │                 │    │ • Notif[]       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🏗️ Agrégat Product

```
Product (ROOT)
  ├── ProductVariant[]
  ├── ProductImage[]
  └── Inventory (1-0..1)
```

**Invariants garantis par la racine** :
- slug unique par store
- price cohérent avec hasVariants
- Au plus une ProductImage.isPrimary = true
- Inventory.reserved ≤ Inventory.quantity
- Une variante ne peut exister que si hasVariants = true

**Opérations sur la racine** :
- createProduct, updateProduct, enableVariants, disableVariants,
  activateProduct, archiveProduct, deleteProduct

**Opérations sur les enfants** :
- addVariant, updateVariant, removeVariant
- addImage, removeImage, reorderImages
- reserveStock, releaseStock, commitStock

**Ce qui N'EST PAS dans l'agrégat** :
- Store, Category, Order (référencés par ID)

## 🏗️ Agrégat Order

```
Order (ROOT)
  ├── OrderItem[]
  └── OrderStatusHistory[]
```

**Invariants** :
- status valide et transitions autorisées
- totalAmount = Σ OrderItem.subtotal
- Un OrderItem référence soit un produit, soit une variante
- productName, variantName, unitPrice sont **snapshotés**

**Opérations** :
- createOrder (Serializable, réserve stock)
- confirmPayment (Serializable, commit stock)
- ship, deliver, cancel, refund

## 🏗️ Agrégat Service

```
Service (ROOT)
  ├── ServiceImage[]
  ├── ServiceZone[]
  └── Availability[]
```

**Invariants** :
- slug unique global
- pricingModel cohérent avec basePrice
- Au plus une ServiceImage.isPrimary = true

## 🏗️ Agrégat Quote

```
Quote (ROOT)
  └── QuoteResponse (1-0..1)
```

**Invariants** :
- status valide
- Si ACCEPTED → Booking existe
- Au plus une QuoteResponse par Quote

## 🏗️ Agrégat Booking

```
Booking (ROOT)
```

**Invariants** :
- status valide
- scheduledAt non null
- Un créneau ne peut être réservé qu'une fois

## 🏗️ Agrégat User

```
User (ROOT)
  ├── Address[]
  └── Notification[]
```

**Invariants** :
- email unique global
- passwordHash non vide
- Au plus une Address.isDefault = true

## 🏗️ Agrégat Payment

```
Payment (ROOT)
  └── Transaction[]
```

**Invariants** :
- XOR(orderId, bookingId)
- status valide
- providerRef unique si non null

## 🏗️ Agrégat Review

```
Review (ROOT)
  └── ReviewReport[]
```

**Invariants** :
- rating ∈ [1, 5]
- Au moins un lien non null
- Un seul avis par order/booking

## Règles d'agrégat

### 1. Une transaction = un agrégat (principe)

Dans la mesure du possible, une transaction ne modifie qu'un seul
agrégat.

### 2. Transactions inter-agrégats (exceptions)

Certaines opérations touchent plusieurs agrégats. On utilise alors :
- **Isolation Serializable**
- **Retry automatique** sur P2034
- **Compensation** en cas d'échec partiel

| Opération | Agrégats | Stratégie |
|---|---|---|
| Créer commande | Product + Order | Serializable |
| Confirmer paiement | Product + Order + Payment | Serializable |
| Annuler commande | Product + Order | Serializable |
| Créer réservation | Service + Booking | Serializable |

### 3. Référencement par ID uniquement

On ne stocke jamais une référence directe à un objet d'un autre
agrégat. On stocke l'ID et on recharge si nécessaire.

**Exception — snapshot** : pour préserver l'historique, on copie
certains champs immuables.

### 4. Cohérence eventual entre agrégats

Entre deux agrégats, la cohérence est eventual (pas immédiate).

### 5. Événements de domaine

Chaque agrégat peut émettre des Domain Events :
- OrderCreated → Notification, Analytics
- OrderPaid → Product (commit), Notification
- BookingConfirmed → Notification, Analytics

## Transactions inter-agrégats critiques

### Scénario 1 — Créer une commande

```
BEGIN TRANSACTION (Serializable)
  Pour chaque item :
    UPDATE inventory SET reserved = reserved + qty
    WHERE quantity - reserved >= qty
    Si 0 ligne affectée → ROLLBACK
  INSERT Order (PENDING)
  INSERT OrderItems
COMMIT
```

### Scénario 2 — Confirmer un paiement

```
BEGIN TRANSACTION (Serializable)
  Pour chaque item :
    UPDATE inventory
    SET quantity = quantity - qty, reserved = reserved - qty
    WHERE reserved >= qty
  UPDATE Order SET status = PAID
  UPDATE Payment SET status = PAID
COMMIT
POST-COMMIT (async)
  Email + SMS + Analytics
```

### Scénario 3 — Annuler une commande

```
BEGIN TRANSACTION (Serializable)
  Vérifier Order.status = PENDING
  Pour chaque item :
    UPDATE inventory SET reserved = reserved - qty
  UPDATE Order SET status = CANCELLED
COMMIT
```

## Résumé — Agrégats et transactions

| Agrégat | Complexité | Isolation |
|---|---|---|
| Product | Élevée | Serializable |
| Store | Faible | Read Committed |
| Order | Élevée | Serializable |
| Service | Faible | Read Committed |
| Quote | Moyenne | Read Committed |
| Booking | Moyenne | Serializable |
| User | Faible | Read Committed |
| Payment | Élevée | Serializable |
| Review | Faible | Read Committed |

## Décisions structurantes

1. Product + Inventory = un seul agrégat
2. Order référence Product par ID + snapshot
3. Service + Availability = un seul agrégat
4. Quote + QuoteResponse = un seul agrégat
5. Payment séparé de Order
6. Review séparé (peut concerner plusieurs entités)


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
