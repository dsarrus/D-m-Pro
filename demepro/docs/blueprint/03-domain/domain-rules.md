
---

## 📄 Fichier 3 — `docs/blueprint/03-domain/domain-rules.md`

**Statut** : ✅ **Déjà bon.** Les règles sont là. Ajoutons juste le mapping vers les tests.

**Patch — remplace le contenu par :**

```markdown
# Règles de domaine

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Règles transverses

| Règle | Description | Testée par |
|---|---|---|
| Ownership | Un professionnel ne peut agir que sur ses propres ressources | `*.e2e.test.ts` (403), `*.service.test.ts` (UNAUTHORIZED_STORE) |
| Idempotence | Toute création sensible supporte `Idempotency-Key` | `product.service`, `product-variant.service` |
| Atomicité | Toute opération multi-tables est transactionnelle | `product.service` (createFull rollback) |
| Isolation | Les écritures critiques utilisent Serializable | `inventory.service` (concurrence) |

## Règles par domaine

### Catalog

| Règle | Testée par | Force |
|---|---|---|
| Un produit simple a un prix, un produit à variantes n'en a pas | `product.service` (`updateProduct`) | Bloquant |
| Une variante ne peut exister que sur un produit `hasVariants=true` | `product-variant.service` (`PRODUCT_HAS_NO_VARIANTS`) | Bloquant |
| Le SKU est unique globalement | `product-variant.service` (concurrence), contrainte DB | Bloquant |
| Le slug est unique par store | `product.service` (concurrence), contrainte DB | Bloquant |
| Une seule image primaire par produit | `product-image.service` (concurrence) | Bloquant |
| `reserved <= quantity` toujours | `inventory.service` (concurrence) | Bloquant |
| `product_id` XOR `variant_id` sur l'inventaire | `inventory.invariant` (contrainte DB) | Bloquant |
| Un produit archivé ne peut plus être modifié | `product.service`, `product-image.service`, `product-variant.service` | Bloquant |
| Au moins une variante active par produit à variantes | `product-variant.service` (`LAST_ACTIVE_VARIANT`) | Bloquant |
| Un produit ne peut être activé sans stock | `product.service` (`INVALID_PRODUCT_STATE`) | Bloquant |
| Impossible de supprimer un produit/variante avec `reserved > 0` | `product.service`, `product-variant.service` | Bloquant |
| Impossible de retirer la dernière image primaire | `product-image.service` (`INVALID_PRODUCT_STATE`) | Bloquant |

### Order

| Règle | Description |
|---|---|
| Une commande réserve le stock à la création | — (à implémenter) |
| Le commit se fait à la confirmation de paiement | — (à implémenter) |
| Le release se fait à l'annulation | — (à implémenter) |

## Règles de concurrence

Ces règles garantissent qu'aucun accès concurrent ne peut violer les invariants :

| Règle | Mécanisme | Testée par |
|---|---|---|
| Pas de survente | Transactions Serializable + vérification `reserved + n <= quantity` | `inventory.service` |
| Pas de double promotion primaire | Transactions Serializable + `updateMany isPrimary=false` | `product-image.service` |
| Pas de double SKU | Contrainte DB UNIQUE + catch P2002 | `product-variant.service` |
| Pas de double commit | Transactions Serializable + vérification `reserved >= n` | `inventory.service` |

## Mapping règle → test

Ce tableau aide à vérifier qu'aucune règle n'est orpheline (règle sans test)
ou qu'aucun test ne teste rien (test sans règle).

| Règle | Fichier de test | Statut |
|---|---|---|
| XOR inventaire | `inventory.invariant.integration.test.ts` | ✅ |
| `reserved <= quantity` | `inventory.service.integration.test.ts` | ✅ |
| Primaire unique | `product-image.service.integration.test.ts` | ✅ |
| SKU unique | `product.service.integration.test.ts` | ✅ |
| Slug unique par store | `product.service.integration.test.ts` | ✅ |
| Dernière variante active | `product-variant.service.integration.test.ts` | ✅ |
| Suppression bloquée si réservé | `product.service.integration.test.ts` | ✅ |
| Idempotence | `product.service`, `product-variant.service` | ✅ |
| `hasVariants` ↔ `price` | `product.service.integration.test.ts` | ✅ |

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
| 2026-10-11 | 0.2.0 | Ajout mapping règle → test, règles de concurrence, tableau détaillé Catalog | — |