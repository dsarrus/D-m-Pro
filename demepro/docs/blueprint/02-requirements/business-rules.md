# Règles métier

> **Section** : 02-requirements
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Format

Chaque règle est identifiée par `BR-XXX`.

## Règles par domaine

### Catalog

**BR-CAT-001** — Un produit avec variantes ne peut pas avoir de prix direct.
- **Contexte** : —
- **Règle** : `hasVariants = true` ⟹ `price = null`
- **Exception** : —

**BR-CAT-002** — Le SKU est unique globalement.
- **Contexte** : —
- **Règle** : Contrainte `@unique` sur `ProductVariant.sku`

**BR-CAT-003** — Une seule image primaire par produit.
- **Règle** : Au plus un `ProductImage.isPrimary = true` par `productId`

**BR-CAT-004** — Le stock réservé ne peut pas dépasser le stock total.
- **Règle** : `reserved <= quantity` (invariant)

### Order

**BR-ORD-001** — — 

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
