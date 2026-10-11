# Schéma de base de données

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Convention

- **UUID** pour toutes les clés primaires (`gen_random_uuid()`)
- **`TIMESTAMPTZ`** pour les dates (timezone-safe)
- **`snake_case`** pour les tables et colonnes
- **Préfixe `_prisma_migrations`** pour la table de suivi Prisma

## Tables principales

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  category_id UUID REFERENCES categories(id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  sku VARCHAR(100),
  status VARCHAR(20) NOT NULL,
  has_variants BOOLEAN NOT NULL DEFAULT FALSE,
  price DECIMAL(12,2),
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, slug)
);
```

### product_variants
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  attributes JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### product_images
```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  object_key VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### inventory
```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_xor_owner_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  )
);
```

### idempotency_keys
```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  scope VARCHAR(100) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (key, scope)
);
```

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
