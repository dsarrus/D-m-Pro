
# Schéma de base de données

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Vue d'ensemble

Le schéma PostgreSQL complet, avec les contraintes critiques,
les index et les règles métier garanties au niveau DB.

## Tables principales

### users

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  phone           VARCHAR(20),
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_status_check
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED'))
);

CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_status_idx ON users (status);
```

### professional_profiles

```sql
CREATE TABLE professional_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES users(id),
  business_name        VARCHAR(200) NOT NULL,
  slug                 VARCHAR(200) NOT NULL UNIQUE,
  description          TEXT,
  verification_status  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  verified_at          TIMESTAMPTZ,
  phone                VARCHAR(20),
  email                VARCHAR(255),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT professional_profiles_status_check
    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  CONSTRAINT professional_profiles_verified_at_check
    CHECK (
      (verification_status = 'VERIFIED' AND verified_at IS NOT NULL)
      OR verification_status != 'VERIFIED'
    )
);
```

### stores

```sql
CREATE TABLE stores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES professional_profiles(id),
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(200) NOT NULL UNIQUE,
  description       TEXT,
  logo_key          VARCHAR(500),
  banner_key        VARCHAR(500),
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT stores_status_check
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'))
);

CREATE INDEX stores_professional_id_idx ON stores (professional_id);
CREATE INDEX stores_status_idx ON stores (status);
```

### categories

```sql
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id  UUID NOT NULL REFERENCES verticals(id),
  parent_id    UUID REFERENCES categories(id),
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(200) NOT NULL,
  type         VARCHAR(20) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_type_check
    CHECK (type IN ('PRODUCT', 'SERVICE')),
  CONSTRAINT categories_no_self_parent
    CHECK (parent_id IS NULL OR parent_id != id),
  CONSTRAINT categories_vertical_slug_unique
    UNIQUE (vertical_id, slug)
);

CREATE INDEX categories_parent_id_idx ON categories (parent_id);
```

### products

```sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id),
  category_id     UUID REFERENCES categories(id),
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(200) NOT NULL,
  sku             VARCHAR(100),
  description     TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  has_variants    BOOLEAN NOT NULL DEFAULT FALSE,
  price           DECIMAL(12, 2),
  currency        VARCHAR(3) NOT NULL DEFAULT 'XOF',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_store_slug_unique
    UNIQUE (store_id, slug),
  CONSTRAINT products_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'INACTIVE', 'ARCHIVED')),
  CONSTRAINT products_price_check
    CHECK (
      (has_variants = TRUE AND price IS NULL)
      OR
      (has_variants = FALSE AND price IS NOT NULL AND price > 0)
    )
);

CREATE INDEX products_store_id_idx ON products (store_id);
CREATE INDEX products_category_id_idx ON products (category_id);
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX products_created_at_idx ON products (created_at DESC);
```

### product_variants

```sql
CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        VARCHAR(180) NOT NULL,
  sku         VARCHAR(100) UNIQUE,
  price       DECIMAL(12, 2) NOT NULL,
  currency    VARCHAR(3) NOT NULL DEFAULT 'XOF',
  attributes  JSONB,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_variants_price_check
    CHECK (price > 0)
);

CREATE INDEX product_variants_product_id_idx ON product_variants (product_id);
CREATE INDEX product_variants_sku_idx ON product_variants (sku);
```

### product_images

```sql
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  object_key  VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX product_images_product_id_idx ON product_images (product_id);

-- Un seul primaire par produit
CREATE UNIQUE INDEX product_images_primary_unique
  ON product_images (product_id)
  WHERE is_primary = TRUE;
```

### inventory

```sql
CREATE TABLE inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity    INT NOT NULL DEFAULT 0,
  reserved    INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inventory_owner_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  ),
  CONSTRAINT inventory_quantity_check
    CHECK (quantity >= 0 AND reserved >= 0 AND reserved <= quantity)
);

CREATE INDEX inventory_quantity_idx ON inventory (quantity);
```

### orders

```sql
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  store_id          UUID NOT NULL REFERENCES stores(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  total_amount      DECIMAL(12, 2) NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'XOF',
  delivery_address  TEXT NOT NULL,
  delivery_fee      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes             TEXT,
  canceled_at       TIMESTAMPTZ,
  refunded_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_status_check
    CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
  CONSTRAINT orders_total_amount_check
    CHECK (total_amount >= 0),
  CONSTRAINT orders_canceled_at_check
    CHECK (
      (status = 'CANCELLED' AND canceled_at IS NOT NULL)
      OR status != 'CANCELLED'
    )
);

CREATE INDEX orders_user_id_idx ON orders (user_id);
CREATE INDEX orders_store_id_idx ON orders (store_id);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);
```

### order_items

```sql
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  variant_id    UUID REFERENCES product_variants(id),
  product_name  VARCHAR(200) NOT NULL,
  variant_name  VARCHAR(180),
  quantity      INT NOT NULL,
  unit_price    DECIMAL(12, 2) NOT NULL,
  subtotal      DECIMAL(12, 2) NOT NULL,

  CONSTRAINT order_items_xor_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  ),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_prices_check
    CHECK (unit_price >= 0 AND subtotal >= 0)
);

CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);
CREATE INDEX order_items_variant_id_idx ON order_items (variant_id);
```

### order_status_history

```sql
CREATE TABLE order_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status  VARCHAR(20) NOT NULL,
  to_status    VARCHAR(20) NOT NULL,
  changed_by   UUID REFERENCES users(id),
  reason       TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT order_status_history_transition_check
    CHECK (from_status != to_status)
);

CREATE INDEX order_status_history_order_id_idx ON order_status_history (order_id);
```

### payments

```sql
CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID UNIQUE REFERENCES orders(id),
  booking_id    UUID UNIQUE REFERENCES bookings(id),
  amount        DECIMAL(12, 2) NOT NULL,
  currency      VARCHAR(3) NOT NULL DEFAULT 'XOF',
  status        VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  provider      VARCHAR(50),
  provider_ref  VARCHAR(255) UNIQUE,
  paid_at       TIMESTAMPTZ,
  refunded_at   TIMESTAMPTZ,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payments_xor_check CHECK (
    (order_id IS NOT NULL AND booking_id IS NULL)
    OR
    (order_id IS NULL AND booking_id IS NOT NULL)
  ),
  CONSTRAINT payments_status_check
    CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
  CONSTRAINT payments_amount_check CHECK (amount >= 0)
);

CREATE INDEX payments_order_id_idx ON payments (order_id);
CREATE INDEX payments_status_idx ON payments (status);
CREATE INDEX payments_provider_ref_idx ON payments (provider_ref);
```

### transactions

```sql
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID NOT NULL REFERENCES payments(id),
  type          VARCHAR(20) NOT NULL,
  amount        DECIMAL(12, 2) NOT NULL,
  provider_ref  VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT transactions_type_check
    CHECK (type IN ('CHARGE', 'REFUND', 'REVERSAL')),
  CONSTRAINT transactions_amount_check CHECK (amount >= 0)
);

CREATE INDEX transactions_payment_id_idx ON transactions (payment_id);
```

### reviews

```sql
CREATE TABLE reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  rating                INT NOT NULL,
  comment               TEXT,
  product_id            UUID REFERENCES products(id),
  service_id            UUID REFERENCES services(id),
  store_id              UUID REFERENCES stores(id),
  professional_id       UUID REFERENCES professional_profiles(id),
  order_id              UUID UNIQUE REFERENCES orders(id),
  booking_id            UUID UNIQUE REFERENCES bookings(id),
  is_verified_purchase  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reviews_rating_check
    CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT reviews_target_check CHECK (
    product_id IS NOT NULL
    OR service_id IS NOT NULL
    OR store_id IS NOT NULL
    OR professional_id IS NOT NULL
  )
);

CREATE INDEX reviews_product_id_idx ON reviews (product_id);
CREATE INDEX reviews_service_id_idx ON reviews (service_id);
CREATE INDEX reviews_store_id_idx ON reviews (store_id);
CREATE INDEX reviews_professional_id_idx ON reviews (professional_id);
CREATE INDEX reviews_created_at_idx ON reviews (created_at DESC);
```

### addresses

```sql
CREATE TABLE addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         VARCHAR(50),
  line1         VARCHAR(255) NOT NULL,
  line2         VARCHAR(255),
  city          VARCHAR(100) NOT NULL,
  region        VARCHAR(100),
  country       VARCHAR(2) NOT NULL DEFAULT 'ML',
  postal_code   VARCHAR(20),
  phone         VARCHAR(20),
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX addresses_user_id_idx ON addresses (user_id);

-- Une seule adresse par défaut par user
CREATE UNIQUE INDEX addresses_default_unique
  ON addresses (user_id)
  WHERE is_default = TRUE;
```

### notifications

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  channel     VARCHAR(20) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  metadata    JSONB,
  read_at     TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notifications_channel_check
    CHECK (channel IN ('EMAIL', 'SMS', 'PUSH', 'IN_APP'))
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_read_at_idx ON notifications (read_at);
CREATE INDEX notifications_created_at_idx ON notifications (created_at DESC);
```

### idempotency_keys

```sql
CREATE TABLE idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             VARCHAR(255) NOT NULL,
  scope           VARCHAR(150) NOT NULL,
  user_id         UUID REFERENCES users(id),
  request_hash    VARCHAR(64) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
  response_status INT,
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,

  CONSTRAINT idempotency_keys_unique UNIQUE (key, scope),
  CONSTRAINT idempotency_keys_status_check
    CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX idempotency_keys_expires_at_idx ON idempotency_keys (expires_at);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    UUID NOT NULL,
  metadata     JSONB,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_logs_actor_id_idx ON audit_logs (actor_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
```

## Tables Phase 2 (services)

### services

```sql
CREATE TABLE services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID NOT NULL REFERENCES professional_profiles(id),
  category_id       UUID REFERENCES categories(id),
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(200) NOT NULL UNIQUE,
  description       TEXT,
  pricing_model     VARCHAR(20) NOT NULL,
  base_price        DECIMAL(12, 2),
  currency          VARCHAR(3) NOT NULL DEFAULT 'XOF',
  duration_minutes  INT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT services_pricing_model_check
    CHECK (pricing_model IN ('QUOTE', 'FIXED', 'HOURLY')),
  CONSTRAINT services_base_price_check CHECK (
    (pricing_model IN ('FIXED', 'HOURLY') AND base_price IS NOT NULL AND base_price > 0)
    OR
    (pricing_model = 'QUOTE')
  )
);

CREATE INDEX services_professional_id_idx ON services (professional_id);
CREATE INDEX services_category_id_idx ON services (category_id);
```

### service_images

```sql
CREATE TABLE service_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  object_key  VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX service_images_primary_unique
  ON service_images (service_id)
  WHERE is_primary = TRUE;
```

### service_zones

```sql
CREATE TABLE service_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  city        VARCHAR(100),
  region      VARCHAR(100),
  radius_km   INT,

  CONSTRAINT service_zones_check CHECK (
    city IS NOT NULL OR region IS NOT NULL OR radius_km IS NOT NULL
  )
);
```

### availabilities

```sql
CREATE TABLE availabilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  day_of_week    INT,
  start_time     VARCHAR(5),
  end_time       VARCHAR(5),
  specific_date  DATE,
  is_recurring   BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT availabilities_day_check
    CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT availabilities_recurring_check CHECK (
    (is_recurring = TRUE AND day_of_week IS NOT NULL
      AND start_time IS NOT NULL AND end_time IS NOT NULL
      AND start_time < end_time)
    OR
    (is_recurring = FALSE AND specific_date IS NOT NULL)
  )
);
```

### quotes

```sql
CREATE TABLE quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  service_id      UUID NOT NULL REFERENCES services(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  description     TEXT NOT NULL,
  address         TEXT,
  preferred_date  TIMESTAMPTZ,
  budget          DECIMAL(12, 2),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT quotes_status_check
    CHECK (status IN ('PENDING', 'RESPONDED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'))
);

CREATE INDEX quotes_user_id_idx ON quotes (user_id);
CREATE INDEX quotes_service_id_idx ON quotes (service_id);
CREATE INDEX quotes_status_idx ON quotes (status);
```

### quote_responses

```sql
CREATE TABLE quote_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id          UUID NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
  professional_id   UUID NOT NULL REFERENCES professional_profiles(id),
  proposed_price    DECIMAL(12, 2) NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'XOF',
  message           TEXT,
  proposed_date     TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT quote_responses_price_check CHECK (proposed_price >= 0)
);
```

### bookings

```sql
CREATE TABLE bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  service_id    UUID NOT NULL REFERENCES services(id),
  quote_id      UUID UNIQUE REFERENCES quotes(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration      INT,
  address       TEXT,
  total_amount  DECIMAL(12, 2) NOT NULL,
  currency      VARCHAR(3) NOT NULL DEFAULT 'XOF',
  notes         TEXT,
  completed_at  TIMESTAMPTZ,
  canceled_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bookings_status_check
    CHECK (status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  CONSTRAINT bookings_unique_slot UNIQUE (service_id, scheduled_at)
);

CREATE INDEX bookings_user_id_idx ON bookings (user_id);
CREATE INDEX bookings_service_id_idx ON bookings (service_id);
CREATE INDEX bookings_scheduled_at_idx ON bookings (scheduled_at);
```

## Résumé des contraintes

| Table | Contraintes critiques |
|---|---|
| users | email unique, status valide |
| products | slug unique par store, price cohérent, status valide |
| product_variants | sku unique global, price > 0 |
| product_images | 1 seul primaire par produit (partial index) |
| inventory | XOR owner, reserved ≤ quantity |
| orders | status valide, canceled_at cohérent |
| order_items | XOR product/variant, quantity > 0 |
| payments | XOR order/booking, status valide, provider_ref unique |
| reviews | rating 1-5, au moins 1 cible |
| addresses | 1 seul défaut par user (partial index) |
| idempotency_keys | (key, scope) unique |
| services | pricing_model cohérent |
| bookings | créneau unique (service_id, scheduled_at) |


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
