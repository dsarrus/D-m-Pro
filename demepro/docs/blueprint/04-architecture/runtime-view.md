
# C4 — Runtime View

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Introduction

Ce document décrit les **scénarios d'exécution** (runtime) des
opérations critiques du système, avec les transactions, les
interactions inter-modules, et les événements.

## Scénario 1 — Création de produit simple

```
Client    API      Auth    Catalog   DB
  │        │        │        │      │
  ├──POST─►│        │        │      │
  │        │        │        │      │
  │        ├──verify─►       │      │
  │        │        │        │      │
  │        ├──create────────►│      │
  │        │        │        ├──BEGIN►
  │        │        │        ├──SELECT store
  │        │        │        ├──SELECT category
  │        │        │        ├──SELECT product (slug)
  │        │        │        ├──SELECT variant (sku)
  │        │        │        ├──INSERT product
  │        │        │        ├──COMMIT
  │        │        │        │      │
  │◄──201──┤        │        │      │
```

**Temps** : ~200ms (p95)
**Transaction** : Serializable
**Retry** : 3 tentatives sur P2034

## Scénario 2 — Création de produit complet (atomique)

```
Client    API      Catalog   DB
  │        │        │        │
  ├──POST─►│        │        │
  │        │        │        │
  │        ├──BEGIN TRANSACTION (Serializable)──►
  │        │        │        │
  │        │        ├──SELECT store (ownership)
  │        │        │        │
  │        │        ├──SELECT category
  │        │        │        │
  │        │        ├──SELECT product (slug unique)
  │        │        │        │
  │        │        ├──SELECT variants (SKU unique × N)
  │        │        │        │
  │        │        ├──INSERT product
  │        │        │        │
  │        │        ├──INSERT variants (× N)
  │        │        │        │
  │        │        ├──INSERT inventories (× N)
  │        │        │        │
  │        │        ├──INSERT images (× M)
  │        │        │        │
  │        ├──COMMIT─────────────────────────────►
  │        │        │        │
  │◄──201──┤        │        │
```

**Temps** : ~400ms (p95) pour 5 variants + 3 images
**Transaction** : Serializable
**Timeout** : 15s
**Atomicité** : tout ou rien

## Scénario 3 — Création de commande (réservation stock)

```
Client    Order    Catalog   DB
  │        │        │      │
  ├──POST─►│        │      │
  │        │        │      │
  │        ├──BEGIN TRANSACTION (Serializable)──►
  │        │        │      │
  │        │        │      │
  │        ├──for each item:───────────────────┐
  │        │        │      │                   │
  │        │        ├──reserveStock(id, qty)───┤
  │        │        │      │                   │
  │        │        │      ├──UPDATE inventory │
  │        │        │      │  SET reserved+=qty│
  │        │        │      │  WHERE qty-res>=qty
  │        │        │      │  RETURNING id     │
  │        │        │      │                   │
  │        │        │      ├──if 0 rows → ─────┐
  │        │        │      │  ROLLBACK         │
  │        │        │      │  throw INSUFFICIENT_STOCK
  │        │        │      │                   │
  │        ├──◄───────────────────────────────┘
  │        │        │      │
  │        ├──INSERT Order (PENDING)
  │        │        │      │
  │        ├──INSERT OrderItems (snapshot prix/nom)
  │        │        │      │
  │        ├──INSERT OrderStatusHistory
  │        │        │      │
  │        ├──COMMIT──────────────────────────►
  │        │        │      │
  ├──POST-COMMIT async──────────────────────────┐
  │        │        │      │                   │
  │        │        ├──sendNotification────────┤
  │        │        │      │                   │
  │◄──201──┤        │      │◄──────────────────┘
```

**Temps** : ~500ms (p95) pour 3 articles
**Transaction** : Serializable
**Concurrence** : jusqu'à 10 réservations simultanées testées

## Scénario 4 — Paiement via Orange Money

```
Client    Order    Payment   Provider   DB
  │        │        │        │         │
  ├──POST─►│        │        │         │
  │/pay    │        │        │         │
  │        │        │        │         │
  │        ├──createPayment─►│         │
  │        │        │        │         │
  │        │        ├──SELECT order    │
  │        │        │        │         │
  │        │        ├──INSERT Payment (PENDING)
  │        │        │        │         │
  │        │        ├──initiate────────►│
  │        │        │        │         │
  │◄──302──┤        │        │         │
  │Redirect  │        │        │         │
  │        │        │        │         │
  ├──Pay──►Orange Money      │         │
  │        │        │        │         │
  │        │        │        │         │
  │        │        │◄──webhook────────┤
  │        │        │        │         │
  │        │        ├──verify signature │
  │        │        │        │         │
  │        │        ├──BEGIN TRANSACTION──►
  │        │        │        │         │
  │        │        ├──for each item:─────┐
  │        │        │        │         │  │
  │        │        │        │         │  │
  │        │        ├──commitStock──────┤  │
  │        │        │        │         │  │
  │        │        │        │         │  │
  │        │        ├──UPDATE Order PAID│  │
  │        │        │        │         │  │
  │        │        ├──UPDATE Payment PAID
  │        │        │        │         │  │
  │        │        ├──COMMIT─────────────►
  │        │        │        │         │
  │        ├──POST-COMMIT (async)          │
  │        │        ├──sendEmail───────────┤
  │        │        ├──sendSms─────────────┤
  │        │        ├──notifyPro───────────┤
  │        │        │        │         │
  │        │        │◄──200──┤         │
  │        │        │        │         │
  │◄──200──┤        │        │         │
```

**Idempotence** : webhook peut être appelé plusieurs fois sans effet
**Sécurité** : signature vérifiée
**Commit** : décrémente quantity ET reserved

## Scénario 5 — Annulation de commande

```
Client    Order    Catalog   DB
  │        │        │      │
  ├──POST─►│        │      │
  │/cancel │        │      │
  │        │        │      │
  │        ├──BEGIN TRANSACTION (Serializable)──►
  │        │        │      │
  │        │        ├──SELECT Order
  │        │        │      │
  │        │        ├──verify status PENDING|PAID
  │        │        │      │
  │        │        ├──for each item:──────────┐
  │        │        │      │                   │
  │        │        ├──releaseStock(id, qty)───┤
  │        │        │      │                   │
  │        │        │      ├──UPDATE inventory │
  │        │        │      │  SET reserved-=qty│
  │        │        │      │  WHERE reserved>=qty
  │        │        │      │                   │
  │        ├──◄───────────────────────────────┘
  │        │        │      │
  │        ├──UPDATE Order CANCELLED
  │        │        │      │
  │        ├──if PAID: triggerRefund
  │        │        │      │
  │        ├──COMMIT──────────────────────────►
  │        │        │      │
  │        ├──POST-COMMIT async
  │        │        ├──sendEmail───────────────┐
  │        │        │      │                   │
  │◄──200──┤        │      │◄──────────────────┘
```

## Scénario 6 — Concurrence sur réservation

**Situation** : 10 clients tentent simultanément de réserver
le dernier article (stock=1).

```
Time  Client1   Client2   Client3   DB
  │     │         │         │       │
  T0    ├─reserve─┤         │       │
  │     │         ├─reserve─┤       │
  │     │         │         ├─reserve─┤
  │     │         │         │       │
  T1    │         │         │  ┌────┴────┐
  │     │         │         │  │Serilize │
  │     │         │         │  │ updates │
  │     │         │         │  └────┬────┘
  │     │         │         │       │
  T2    │◄──OK────┤         │       │
  │     │         │         │       │
  │     │         │◄──ERR───┤       │
  │     │         │ (stock=0)│      │
  │     │         │         │◄──ERR─┤
  │     │         │         │ (stock=0)
  │     │         │         │       │
```

**Résultat** : exactement 1 réussite, 9 échecs INSUFFICIENT_STOCK
**Garantie** : SQL atomique + Serializable
**Test** : couvert (10 réservations simultanées)

## Scénario 7 — Idempotence (double clic)

```
Client    API      Idempotency   DB
  │        │        │            │
  ├─POST──►│        │            │
  │key=K1  │        │            │
  │        ├──acquire(K1)───────►│
  │        │        │            │
  │        │        ├──INSERT (PROCESSING)
  │        │        │            │
  │        ├──process──────────► │
  │        │        │            │
  │        │        ├──INSERT product
  │        │        │            │
  │        │        ├──UPDATE (COMPLETED)
  │        │        │            │
  │◄──201──┤        │            │
  │        │        │            │
  ├─POST──►│        │            │
  │key=K1  │        │            │
  │        ├──acquire(K1)───────►│
  │        │        │            │
  │        │        │◄──COMPLETED─┤
  │        │        │            │
  │◄──201──┤  (réponse en cache) │
```

**Résultat** : 1 seul produit créé, mêmes réponses
**TTL** : 24h

## Scénario 8 — Retry Serializable (P2034)

```
Time  Service   DB
  │     │       │
  T0    ├─BEGIN─►│
  │     │       │
  │     ├─SELECT│
  │     │       │
  │     ├─UPDATE│
  │     │       │
  │     │◄─ERR──┤ P2034 (serialization conflict)
  │     │       │
  │     │ wait 200ms
  │     │       │
  T1    ├─BEGIN─►│
  │     │       │
  │     ├─SELECT│
  │     │       │
  │     ├─UPDATE│
  │     │       │
  │     ├─COMMIT│
  │     │       │
  │◄─OK─┤       │
```

**Stratégie** : 3 tentatives, backoff exponentiel + jitter
**Timeout total** : ~10s max

## Transactions et isolation

| Scénario | Isolation | Timeout | Retry |
|---|---|---|---|
| Créer produit | Serializable | 15s | 3 |
| Créer commande | Serializable | 15s | 3 |
| Payer commande | Serializable | 15s | 3 |
| Annuler commande | Serializable | 15s | 3 |
| Réservation stock | — (SQL atomique) | — | — |
| Commit stock | — (SQL atomique) | — | — |
| Lecture | Read Committed | — | — |

## Événements post-commit

| Événement | Déclencheur | Consommateurs |
|---|---|---|
| OrderCreated | POST /orders | Notification, Analytics |
| OrderPaid | Webhook paiement | Notification, Analytics |
| OrderShipped | POST /ship | Notification |
| OrderDelivered | POST /deliver | Notification, Review (ouverture) |
| PaymentConfirmed | Webhook | Order, Notification |
| BookingConfirmed | POST /quotes/accept | Notification |

**Implémentation MVP** : enqueue asynchrone post-commit
**Implémentation Phase 3** : bus d'événements (Redis Streams)

## Performance observée

| Scénario | p50 | p95 | p99 |
|---|---|---|---|
| Créer produit simple | 100ms | 200ms | 400ms |
| Créer produit complet | 250ms | 400ms | 800ms |
| Créer commande | 300ms | 500ms | 1s |
| Payer commande | 400ms | 700ms | 1.5s |
| Lecture produit | 30ms | 80ms | 150ms |

## Optimisations prévues

1. **Cache Redis** pour les lectures fréquentes (produits publics)
2. **CDN** pour les images
3. **Index full-text** pour la recherche
4. **Vues matérialisées** pour les dashboards
5. **Read replicas** pour les lectures (Phase 3)


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
