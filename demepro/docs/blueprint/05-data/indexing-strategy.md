
---

## 📄 Fichier 2 — `docs/blueprint/05-data/indexing-strategy.md`

**Statut** : ✅ **Déjà bon.** Juste des précisions sur les index et leur origine.

**Patch — remplace le contenu par :**

```markdown
# Stratégie d'indexation

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Index critiques

| Table | Index | Type | Justification |
|---|---|---|---|
| products | (store_id, slug) | UNIQUE | Unicité slug par store + lookup |
| products | (status) | B-tree | Filtrage par statut |
| products | (store_id, status) | B-tree composite | Liste filtrée par store + statut |
| product_variants | (sku) | UNIQUE | Unicité globale |
| product_variants | (product_id) | B-tree | Lookup par produit |
| product_images | (product_id, sort_order) | B-tree composite | Tri par produit |
| inventory | (product_id) | UNIQUE | Lookup direct + XOR |
| inventory | (variant_id) | UNIQUE | Lookup direct + XOR |
| idempotency_keys | (key, scope) | UNIQUE | Lookup |
| idempotency_keys | (expires_at) | B-tree | Purge |

## Index UNIQUE = invariant DB

Les index UNIQUE ne sont pas que des optimisations : ils **garantissent** des
invariants métier au niveau le plus bas. Ces invariants sont testés par les
tests d'intégration (voir `08-engineering/testing-strategy.md`).

| Index UNIQUE | Invariant garanti |
|---|---|
| `products(store_id, slug)` | Pas deux produits avec le même slug dans un store |
| `product_variants(sku)` | SKU unique globalement |
| `inventory(product_id)` | Un seul inventaire par produit |
| `inventory(variant_id)` | Un seul inventaire par variante |
| `idempotency_keys(key, scope)` | Une clé d'idempotence par scope |

## Requêtes lentes à surveiller

- Liste de produits par store + statut (utiliser `(store_id, status)`)
- Lookup d'inventaire par produit/variante (couvert par UNIQUE)
- Purge des clés idempotence expirées (utiliser `(expires_at)`)

## Requêtes NON indexées (à surveiller)

- Recherche textuelle sur `products.name` — envisager `pg_trgm` si nécessaire
- Filtrage par `currency` — peu sélectif, pas d'index prévu
- Filtrage par `product_images.is_primary` — index partiel `WHERE is_primary = true`
  envisageable si le volume devient important

## Outils

- `EXPLAIN ANALYZE` pour analyser une requête spécifique
- `pg_stat_statements` pour identifier les requêtes lentes en production
- `pg_stat_user_indexes` pour vérifier quels index sont réellement utilisés

## Vérifier les index existants

```bash
docker exec -it demepro-postgres psql -U demepro -d demepro_test -c "\di+"