# Entités

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Entités principales

### Product

- **Identité** : `id` (UUID)
- **Propriétés** : storeId, categoryId, name, slug, sku, status, hasVariants, price, currency
- **Invariants** :
  - slug unique par store
  - price obligatoire si hasVariants=false
  - price null si hasVariants=true

### ProductVariant

- **Identité** : `id` (UUID)
- **Propriétés** : productId, name, sku, price, currency, isActive
- **Invariants** :
  - sku unique global
  - ne peut exister que si product.hasVariants=true

### ProductImage

- **Identité** : `id` (UUID)
- **Propriétés** : productId, objectKey, altText, sortOrder, isPrimary
- **Invariants** :
  - au plus un isPrimary=true par productId

### Inventory

- **Identité** : `id` (UUID)
- **Propriétés** : productId?, variantId?, quantity, reserved
- **Invariants** :
  - XOR(productId, variantId)
  - reserved <= quantity

---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 0.1.0 |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | 2026-10-10 |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
