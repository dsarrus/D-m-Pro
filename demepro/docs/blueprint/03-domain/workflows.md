
# Workflows

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Introduction

Ce document décrit les **workflows métier** du domaine DɛmɛPro,
organisés par flux. Chaque workflow spécifie : déclencheur, étapes,
règles, sortie.

## Flux ACHETER

### 🏪 WF-001 — Création de produit simple

**Acteur** : Professionnel
**Déclencheur** : `POST /catalog/products`
**Agrégats** : Product

```
POST /catalog/products
  ├── 1. authenticate (JWT)
  ├── 2. requirePermission("catalog.product.create")
  ├── 3. validate(createProductSchema)
  ├── 4. BEGIN TRANSACTION (Serializable)
  │       ├── Vérif Store + ownership
  │       ├── Vérif Category
  │       ├── Vérif slug unique
  │       ├── Vérif SKU unique
  │       └── INSERT Product (DRAFT)
  └── 5. COMMIT
```

**Statut** : ✅ **Implémenté** (25 tests)

### 🏪 WF-002 — Création de produit à variantes (atomique)

**Déclencheur** : `POST /catalog/products/full`

Règles :
- Atomicité complète
- Idempotence supportée

**Statut** : ✅ **Implémenté** (E2E testé)

### 🏪 WF-003 — Activation de produit

**Déclencheur** : `POST /catalog/products/:id/activate`

Règles :
- Refus si aucun stock
- Refus si produit archivé

**Statut** : ✅ **Implémenté**

### 🏪 WF-004 — Archivage de produit

**Déclencheur** : `DELETE /catalog/products/:id`

Effets :
- status = ARCHIVED
- toutes les variantes isActive = false
- stock conservé

**Statut** : ✅ **Implémenté**

### 🛒 WF-005 — Création de commande

**Déclencheur** : `POST /orders`
**Isolation** : Serializable

```
BEGIN TRANSACTION (Serializable)
  Pour chaque item :
    Vérif produit ACTIVE
    Vérif variante isActive
    Vérif stock disponible
    RESERVE stock (UPDATE atomique)
  INSERT Order (PENDING)
  INSERT OrderItems (snapshot prix/nom)
COMMIT
POST-COMMIT (async)
  Notification "Commande créée"
```

**Statut** : ❌ **À implémenter**

### 💳 WF-006 — Paiement de commande

**Déclencheur** : `POST /orders/:id/pay` + webhook

```
POST /orders/:id/pay
  Créer Payment PENDING
  Rediriger vers provider
  Provider → webhook
POST /webhooks/payment
  Vérif signature
  BEGIN TRANSACTION
    Pour chaque item :
      UPDATE inventory SET quantity -= qty, reserved -= qty
    UPDATE Order SET status = PAID
    UPDATE Payment SET status = PAID
  COMMIT
  POST-COMMIT
    Email + SMS + Notif pro
```

**Statut** : ❌ **À implémenter**

### 🚚 WF-007 — Expédition de commande

**Déclencheur** : `POST /store/orders/:id/ship`

**Statut** : ❌ **À implémenter**

### 📦 WF-008 — Livraison de commande

**Déclencheur** : `POST /store/orders/:id/deliver`

**Statut** : ❌ **À implémenter**

### ❌ WF-009 — Annulation de commande

**Déclencheur** : `POST /orders/:id/cancel`
**Isolation** : Serializable

Règles :
- Annulation si PENDING ou PAID
- Si PAID → déclencher refund
- Refus si SHIPPED ou DELIVERED

**Statut** : ❌ **À implémenter**

## Flux TROUVER

### 🎨 WF-010 — Création de service
**Statut** : ❌ **Phase 2**

### 📋 WF-011 — Demande de devis
**Statut** : ❌ **Phase 2**

### 💬 WF-012 — Réponse à un devis
**Statut** : ❌ **Phase 2**

### ✅ WF-013 — Acceptation de devis
**Statut** : ❌ **Phase 2**

### 📅 WF-014 — Réalisation de prestation
**Statut** : ❌ **Phase 2**

## Workflows transverses

### 💳 WF-015 — Remboursement
**Statut** : ❌ **À implémenter**

### ⭐ WF-016 — Création d'avis
**Statut** : ❌ **À implémenter**

### 🔔 WF-017 — Envoi de notification
**Statut** : ❌ **À implémenter**

## Matrice des workflows

| ID | Nom | Acteur | Agrégats | Statut |
|---|---|---|---|---|
| WF-001 | Créer produit simple | Pro | Product | ✅ |
| WF-002 | Créer produit complet | Pro | Product | ✅ |
| WF-003 | Activer produit | Pro | Product | ✅ |
| WF-004 | Archiver produit | Pro | Product | ✅ |
| WF-005 | Créer commande | Client | Product + Order | ❌ |
| WF-006 | Payer commande | Client | Product + Order + Payment | ❌ |
| WF-007 | Expédier commande | Pro | Order + Delivery | ❌ |
| WF-008 | Livrer commande | Pro | Order + Delivery | ❌ |
| WF-009 | Annuler commande | Client/Pro | Product + Order | ❌ |
| WF-010 | Créer service | Pro | Service | ❌ P2 |
| WF-011 | Demander devis | Client | Quote | ❌ P2 |
| WF-012 | Répondre devis | Pro | Quote | ❌ P2 |
| WF-013 | Accepter devis | Client | Quote + Booking | ❌ P2 |
| WF-014 | Réaliser prestation | Pro | Booking | ❌ P2 |
| WF-015 | Rembourser | Admin | Payment + Order | ❌ |
| WF-016 | Créer avis | Client | Review + Order | ❌ |
| WF-017 | Envoyer notification | Système | Notification | ❌ |


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
