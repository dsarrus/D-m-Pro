
# Matrice de permissions

> **Section** : 02-requirements
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Convention de nommage

```
<module>.<entity>.<action>
```

**Exemples** :
- `catalog.product.create`
- `order.payment.confirm`
- `admin.user.suspend`

## Rôles

| Rôle | Description | Attribution |
|---|---|---|
| **CLIENT** | Acheteur | Inscription |
| **PROFESSIONAL** | Vendeur / prestataire | Inscription + vérif KYC |
| **ADMIN** | Modérateur plateforme | Manuel |
| **SUPER_ADMIN** | Super administrateur | Manuel |

## Matrice complète

### Catalog

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `catalog.product.read` | ✅ | ✅ | ✅ | ✅ |
| `catalog.product.read.own` | — | ✅ | — | ✅ |
| `catalog.product.create` | ❌ | ✅ | ❌ | ✅ |
| `catalog.product.update` | ❌ | ✅ | ❌ | ✅ |
| `catalog.product.delete` | ❌ | ✅ | ✅ | ✅ |
| `catalog.product.activate` | ❌ | ✅ | ❌ | ✅ |
| `catalog.product.archive` | ❌ | ✅ | ❌ | ✅ |
| `catalog.variant.create` | ❌ | ✅ | ❌ | ✅ |
| `catalog.variant.update` | ❌ | ✅ | ❌ | ✅ |
| `catalog.variant.delete` | ❌ | ✅ | ❌ | ✅ |
| `catalog.variant.activate` | ❌ | ✅ | ❌ | ✅ |
| `catalog.variant.deactivate` | ❌ | ✅ | ❌ | ✅ |
| `catalog.image.create` | ❌ | ✅ | ❌ | ✅ |
| `catalog.image.update` | ❌ | ✅ | ❌ | ✅ |
| `catalog.image.delete` | ❌ | ✅ | ❌ | ✅ |
| `catalog.image.reorder` | ❌ | ✅ | ❌ | ✅ |
| `catalog.inventory.read` | ❌ | ✅ | ✅ | ✅ |
| `catalog.inventory.update` | ❌ | ✅ | ❌ | ✅ |
| `catalog.inventory.adjust` | ❌ | ✅ | ❌ | ✅ |

### Store

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `store.read` | ✅ | ✅ | ✅ | ✅ |
| `store.read.own` | — | ✅ | — | ✅ |
| `store.create` | ❌ | ✅ | ❌ | ✅ |
| `store.update.own` | ❌ | ✅ | ❌ | ✅ |
| `store.activate` | ❌ | ❌ | ✅ | ✅ |
| `store.suspend` | ❌ | ❌ | ✅ | ✅ |
| `store.close` | ❌ | ✅ | ✅ | ✅ |

### Order

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `order.create` | ✅ | ❌ | ❌ | ✅ |
| `order.read.own` | ✅ | ❌ | ❌ | ✅ |
| `order.read.store` | ❌ | ✅ | ✅ | ✅ |
| `order.read.all` | ❌ | ❌ | ✅ | ✅ |
| `order.update.store` | ❌ | ✅ | ❌ | ✅ |
| `order.ship.store` | ❌ | ✅ | ❌ | ✅ |
| `order.deliver.store` | ❌ | ✅ | ❌ | ✅ |
| `order.cancel.own` | ✅ | ❌ | ❌ | ✅ |
| `order.cancel.store` | ❌ | ✅ | ✅ | ✅ |

### Payment

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `payment.create` | ✅ | ❌ | ❌ | ✅ |
| `payment.read.own` | ✅ | ❌ | ❌ | ✅ |
| `payment.read.store` | ❌ | ✅ | ✅ | ✅ |
| `payment.refund` | ❌ | ❌ | ✅ | ✅ |

### Service (Phase 2)

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `service.read` | ✅ | ✅ | ✅ | ✅ |
| `service.create` | ❌ | ✅ | ❌ | ✅ |
| `service.update.own` | ❌ | ✅ | ❌ | ✅ |
| `service.delete.own` | ❌ | ✅ | ✅ | ✅ |

### Quote (Phase 2)

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `quote.create` | ✅ | ❌ | ❌ | ✅ |
| `quote.read.own` | ✅ | ❌ | ❌ | ✅ |
| `quote.read.service` | ❌ | ✅ | ✅ | ✅ |
| `quote.respond` | ❌ | ✅ | ❌ | ✅ |
| `quote.accept` | ✅ | ❌ | ❌ | ✅ |
| `quote.reject` | ✅ | ❌ | ❌ | ✅ |

### Booking (Phase 2)

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `booking.create` | ✅ | ❌ | ❌ | ✅ |
| `booking.read.own` | ✅ | ❌ | ❌ | ✅ |
| `booking.read.service` | ❌ | ✅ | ✅ | ✅ |
| `booking.start` | ❌ | ✅ | ❌ | ✅ |
| `booking.complete` | ❌ | ✅ | ❌ | ✅ |
| `booking.cancel.own` | ✅ | ❌ | ❌ | ✅ |
| `booking.cancel.service` | ❌ | ✅ | ✅ | ✅ |

### Review

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `review.create` | ✅ | ❌ | ❌ | ✅ |
| `review.read` | ✅ | ✅ | ✅ | ✅ |
| `review.update.own` | ✅ | ❌ | ❌ | ✅ |
| `review.delete.own` | ✅ | ❌ | ❌ | ✅ |
| `review.moderate` | ❌ | ❌ | ✅ | ✅ |
| `review.report` | ✅ | ✅ | ✅ | ✅ |

### Address

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `address.create` | ✅ | ✅ | ❌ | ✅ |
| `address.read.own` | ✅ | ✅ | ❌ | ✅ |
| `address.update.own` | ✅ | ✅ | ❌ | ✅ |
| `address.delete.own` | ✅ | ✅ | ❌ | ✅ |

### Notification

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `notification.read.own` | ✅ | ✅ | ✅ | ✅ |
| `notification.mark-read` | ✅ | ✅ | ✅ | ✅ |
| `notification.send` | ❌ | ❌ | ✅ | ✅ |

### Admin

| Permission | CLIENT | PRO | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `admin.verification.read` | ❌ | ❌ | ✅ | ✅ |
| `admin.verification.approve` | ❌ | ❌ | ✅ | ✅ |
| `admin.verification.reject` | ❌ | ❌ | ✅ | ✅ |
| `admin.moderation.read` | ❌ | ❌ | ✅ | ✅ |
| `admin.moderation.resolve` | ❌ | ❌ | ✅ | ✅ |
| `admin.user.suspend` | ❌ | ❌ | ✅ | ✅ |
| `admin.user.delete` | ❌ | ❌ | ❌ | ✅ |
| `admin.audit.read` | ❌ | ❌ | ✅ | ✅ |

## Wildcards

Un rôle peut avoir accès à un module entier :

```
catalog.product.*  ⟹ couvre create, update, delete, activate, archive
```

**Résolution** :
1. Exact match prioritaire
2. Wildcard de module (`catalog.product.*`)
3. Wildcard global (`*`)

## Implémentation

### Mapping en base

```typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
  CLIENT: [
    "catalog.product.read",
    "order.create",
    "order.read.own",
    "order.cancel.own",
    "payment.create",
    "payment.read.own",
    "review.create",
    "review.read",
    "address.*",
    "notification.read.own",
  ],
  PROFESSIONAL: [
    "catalog.product.*",
    "catalog.variant.*",
    "catalog.image.*",
    "catalog.inventory.*",
    "store.read.own",
    "store.update.own",
    "store.close",
    "order.read.store",
    "order.update.store",
    "order.ship.store",
    "order.deliver.store",
    "order.cancel.store",
    "payment.read.store",
    "service.*",
    "quote.read.service",
    "quote.respond",
    "booking.read.service",
    "booking.start",
    "booking.complete",
    "booking.cancel.service",
    "review.read",
    "review.report",
    "address.*",
    "notification.read.own",
  ],
  ADMIN: [
    "catalog.product.read",
    "catalog.product.delete",
    "catalog.inventory.read",
    "store.read",
    "store.activate",
    "store.suspend",
    "store.close",
    "order.read.all",
    "order.cancel.store",
    "payment.read.store",
    "payment.refund",
    "service.read",
    "quote.read.service",
    "booking.read.service",
    "review.read",
    "review.moderate",
    "notification.read.own",
    "notification.send",
    "admin.*",
  ],
  SUPER_ADMIN: ["*"],
};
```

### Middleware

```typescript
router.post(
  "/products",
  authenticate,
  requirePermission("catalog.product.create"),
  validate(createProductSchema, "body"),
  controller.create,
);
```

## Règles transverses

1. **Ownership toujours vérifié** — la permission donne l'accès au
   module, pas à la ressource spécifique.
2. **Un user peut avoir plusieurs rôles** — union des permissions.
3. **Permissions immuables en prod** — toute modification tracée.
4. **Cache 5 min** — éviter les lookups DB à chaque requête.


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
