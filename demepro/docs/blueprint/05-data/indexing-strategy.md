
# Stratégie d'indexation

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Principes

1. **Index sur les colonnes de filtre fréquent** — status, dates
2. **Index sur les FK** — pour les joins
3. **Index composites** — quand plusieurs colonnes sont filtrées ensemble
4. **Index partiels** — pour les unicités conditionnelles
5. **Index GIN** — pour les recherches JSONB et full-text
6. **Ne pas sur-indexer** — chaque index a un coût en écriture

## Index critiques

### users

```sql
CREATE UNIQUE INDEX users_email_idx ON users (email);
CREATE INDEX users_status_idx ON users (status);
CREATE INDEX users_created_at_idx ON users (created_at DESC);
```

**Justification** :
- `email` : lookup à chaque login
- `status` : filtrage admin
- `created_at` : tri récent

### professional_profiles

```sql
CREATE UNIQUE INDEX professional_profiles_user_id_idx
  ON professional_profiles (user_id);
CREATE UNIQUE INDEX professional_profiles_slug_idx
  ON professional_profiles (slug);
CREATE INDEX professional_profiles_status_idx
  ON professional_profiles (verification_status);
```

### stores

```sql
CREATE UNIQUE INDEX stores_slug_idx ON stores (slug);
CREATE INDEX stores_professional_id_idx ON stores (professional_id);
CREATE INDEX stores_status_idx ON stores (status);
```

### products

```sql
-- Unicité slug par store
CREATE UNIQUE INDEX products_store_slug_idx
  ON products (store_id, slug);

-- Lookup par store
CREATE INDEX products_store_id_idx ON products (store_id);

-- Filtrage par catégorie
CREATE INDEX products_category_id_idx ON products (category_id);

-- Filtrage par statut (critique pour la visibilité)
CREATE INDEX products_status_idx ON products (status);

-- Tri par date
CREATE INDEX products_created_at_idx ON products (created_at DESC);

-- Recherche full-text
CREATE INDEX products_search_idx ON products
  USING GIN (to_tsvector('french',
    coalesce(name, '') || ' ' || coalesce(description, '')));

-- Recherche par SKU
CREATE INDEX products_sku_idx ON products (sku) WHERE sku IS NOT NULL;
```

### product_variants

```sql
CREATE UNIQUE INDEX product_variants_sku_idx
  ON product_variants (sku) WHERE sku IS NOT NULL;
CREATE INDEX product_variants_product_id_idx
  ON product_variants (product_id);
CREATE INDEX product_variants_is_active_idx
  ON product_variants (product_id, is_active);
```

### product_images

```sql
CREATE INDEX product_images_product_id_idx
  ON product_images (product_id);

-- Un seul primaire par produit (partial unique)
CREATE UNIQUE INDEX product_images_primary_unique
  ON product_images (product_id)
  WHERE is_primary = TRUE;

-- Tri par ordre
CREATE INDEX product_images_sort_idx
  ON product_images (product_id, sort_order);
```

### inventory

```sql
CREATE UNIQUE INDEX inventory_product_id_idx
  ON inventory (product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX inventory_variant_id_idx
  ON inventory (variant_id) WHERE variant_id IS NOT NULL;

-- Pour les recherches de stock bas
CREATE INDEX inventory_quantity_idx ON inventory (quantity);
```

### orders

```sql
-- Lookup par user
CREATE INDEX orders_user_id_idx ON orders (user_id);

-- Lookup par store
CREATE INDEX orders_store_id_idx ON orders (store_id);

-- Filtrage par statut (dashboard)
CREATE INDEX orders_status_idx ON orders (status);

-- Tri récent
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);

-- Requêtes composites fréquentes
CREATE INDEX orders_user_status_idx ON orders (user_id, status);
CREATE INDEX orders_store_status_idx ON orders (store_id, status);
```

### order_items

```sql
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE INDEX order_items_product_id_idx ON order_items (product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX order_items_variant_id_idx ON order_items (variant_id)
  WHERE variant_id IS NOT NULL;
```

### order_status_history

```sql
CREATE INDEX order_status_history_order_id_idx
  ON order_status_history (order_id);
CREATE INDEX order_status_history_changed_at_idx
  ON order_status_history (order_id, changed_at DESC);
```

### payments

```sql
CREATE INDEX payments_order_id_idx ON payments (order_id)
  WHERE order_id IS NOT NULL;
CREATE INDEX payments_booking_id_idx ON payments (booking_id)
  WHERE booking_id IS NOT NULL;
CREATE INDEX payments_status_idx ON payments (status);
CREATE UNIQUE INDEX payments_provider_ref_idx
  ON payments (provider_ref) WHERE provider_ref IS NOT NULL;
```

### reviews

```sql
CREATE INDEX reviews_user_id_idx ON reviews (user_id);
CREATE INDEX reviews_product_id_idx ON reviews (product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX reviews_service_id_idx ON reviews (service_id)
  WHERE service_id IS NOT NULL;
CREATE INDEX reviews_store_id_idx ON reviews (store_id)
  WHERE store_id IS NOT NULL;
CREATE INDEX reviews_professional_id_idx ON reviews (professional_id)
  WHERE professional_id IS NOT NULL;
CREATE INDEX reviews_created_at_idx ON reviews (created_at DESC);
```

### addresses

```sql
CREATE INDEX addresses_user_id_idx ON addresses (user_id);

-- Un seul défaut par user (partial unique)
CREATE UNIQUE INDEX addresses_default_unique
  ON addresses (user_id)
  WHERE is_default = TRUE;
```

### notifications

```sql
CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_user_read_idx
  ON notifications (user_id, read_at);
CREATE INDEX notifications_created_at_idx
  ON notifications (created_at DESC);
```

### idempotency_keys

```sql
CREATE UNIQUE INDEX idempotency_keys_key_scope_idx
  ON idempotency_keys (key, scope);
CREATE INDEX idempotency_keys_expires_at_idx
  ON idempotency_keys (expires_at);

-- Pour la purge opportuniste
CREATE INDEX idempotency_keys_status_idx
  ON idempotency_keys (status, expires_at);
```

### audit_logs

```sql
CREATE INDEX audit_logs_actor_id_idx ON audit_logs (actor_id);
CREATE INDEX audit_logs_entity_idx
  ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_action_idx ON audit_logs (action);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
```

## Index Phase 2

### services

```sql
CREATE UNIQUE INDEX services_slug_idx ON services (slug);
CREATE INDEX services_professional_id_idx
  ON services (professional_id);
CREATE INDEX services_category_id_idx
  ON services (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX services_is_active_idx ON services (is_active);
```

### bookings

```sql
CREATE INDEX bookings_user_id_idx ON bookings (user_id);
CREATE INDEX bookings_service_id_idx ON bookings (service_id);
CREATE INDEX bookings_scheduled_at_idx
  ON bookings (scheduled_at);
CREATE UNIQUE INDEX bookings_unique_slot
  ON bookings (service_id, scheduled_at);
```

## Requêtes lentes à surveiller

### 1. Liste paginée produits par store + status

```sql
SELECT * FROM products
WHERE store_id = $1 AND status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;
```

**Index** : `products_store_id_idx` + `products_status_idx`

### 2. Réservation de stock (critique)

```sql
UPDATE inventory
SET reserved = reserved + $1
WHERE id = $2
  AND quantity - reserved >= $1
RETURNING id;
```

**Index** : `inventory_product_id_idx` ou `inventory_variant_id_idx`

### 3. Liste des commandes d'un client

```sql
SELECT * FROM orders
WHERE user_id = $1 AND status != 'CANCELLED'
ORDER BY created_at DESC;
```

**Index** : `orders_user_status_idx`

### 4. Dashboard boutique

```sql
SELECT status, count(*) FROM orders
WHERE store_id = $1
GROUP BY status;
```

**Index** : `orders_store_status_idx`

### 5. Détection des doublons SKU

```sql
SELECT id FROM product_variants WHERE sku = $1;
```

**Index** : `product_variants_sku_idx`

## Index manquants à surveiller

Pour identifier les index manquants :

```sql
SELECT
  schemaname, tablename, attname, n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;
```

## Analyse de performance

### Activer pg_stat_statements

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Top 10 requêtes lentes

```sql
SELECT
  substring(query, 1, 60) AS query_preview,
  calls,
  mean_exec_time::numeric(10, 2) AS avg_ms,
  total_exec_time::numeric(10, 2) AS total_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Index inutilisés

```sql
SELECT
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename;
```

## Impact des index sur les écritures

| Table | Nb index | Impact |
|---|---|---|
| users | 3 | Faible |
| products | 6 | Moyen (beaucoup d'écritures) |
| product_variants | 3 | Moyen |
| inventory | 3 | Élevé (UPDATE fréquent) |
| orders | 6 | Moyen |
| order_items | 3 | Faible |
| payments | 4 | Faible |
| reviews | 6 | Faible |
| notifications | 3 | Faible |

## Stratégie de maintenance

### VACUUM / ANALYZE

Automatique via PostgreSQL autovacuum.

### REINDEX périodique

Pour les tables à fort UPDATE (inventory, orders) :
```sql
REINDEX TABLE CONCURRENTLY inventory;
```

**Fréquence** : trimestrielle.

### Détection de bloat

```sql
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```


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
