
# Architecture des données

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Principes

1. **PostgreSQL 16** — Source de vérité unique
2. **Prisma 7** — ORM typé avec adapter PG
3. **Migrations versionnées** — Jamais de modification manuelle en prod
4. **Contraintes DB** — Défense en profondeur pour les invariants critiques
5. **Isolation Serializable** — Pour les écritures critiques

## Topologie

```
┌──────────────────────────────────────────────────────────┐
│                    APPLICATION                            │
│                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│  │  Service │───►│  Prisma  │───►│ Adapter  │            │
│  │  (logique│    │  Client  │    │   PG     │            │
│  │  métier) │    │          │    │          │            │
│  └──────────┘    └──────────┘    └────┬─────┘            │
│                                        │                  │
└────────────────────────────────────────┼──────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────┐
│                  PostgreSQL 16                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │  Schéma    │  │  Schéma    │  │  Schéma    │          │
│  │  public    │  │  audit     │  │  analytics │          │
│  │  (données  │  │  (traces)  │  │  (agrégats)│          │
│  │  métier)   │  │            │  │            │          │
│  └────────────┘  └────────────┘  └────────────┘          │
└──────────────────────────────────────────────────────────┘
```

## Modèle de données par contexte

### Identity

```
User ──┬──► ProfessionalProfile ──┬──► Store
       │                          │
       │                          └──► Service (Phase 2)
       │
       ├──► Address
       ├──► Notification
       ├──► Order
       ├──► Quote (Phase 2)
       ├──► Booking (Phase 2)
       └──► Review
```

### Catalog

```
Store ──► Product ──┬──► ProductVariant ──► Inventory
                    │
                    ├──► ProductImage
                    │
                    └──► Inventory
```

### Order

```
Order ──┬──► OrderItem
        ├──► OrderStatusHistory
        ├──► Payment ──► Transaction
        ├──► Delivery
        └──► Review
```

### Service (Phase 2)

```
Service ──┬──► ServiceImage
          ├──► ServiceZone
          ├──► Availability
          ├──► Quote ──┬──► QuoteResponse
          │            └──► Booking
          └──► Review
```

## Stratégie de migration

### Règles

1. **Une migration = un changement cohérent**
2. **Toujours réversible** ou documentée comme destructive
3. **Testée en staging** avant prod
4. **Rétrocompatible** — ne casse pas le code en cours
5. **Versionnée** dans Git

### Ordre d'application

```
1. Migration DB (additive uniquement)
2. Déploiement code
3. Vérification
4. Migration de nettoyage (drop, rename)
```

### Types de migrations

| Type | Exemple | Risque |
|---|---|---|
| **Additive** | ADD COLUMN nullable | Faible |
| **Backfill** | UPDATE data | Moyen |
| **Constraint** | ADD CHECK | Moyen |
| **Rename** | RENAME COLUMN | Élevé |
| **Drop** | DROP COLUMN | Critique |

### Stratégie pour les migrations critiques

**Rename column** (3 étapes) :
1. Ajouter nouvelle colonne nullable
2. Backfill depuis l'ancienne
3. Drop l'ancienne après vérification

## Contraintes DB critiques

### Unicité

```sql
-- SKU unique global
ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);

-- Slug unique par store
ALTER TABLE products
  ADD CONSTRAINT products_store_slug_key UNIQUE (store_id, slug);

-- XOR Inventory
ALTER TABLE inventory
  ADD CONSTRAINT inventory_owner_check CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  );

-- reserved <= quantity
ALTER TABLE inventory
  ADD CONSTRAINT inventory_reserved_check
  CHECK (reserved >= 0 AND reserved <= quantity);
```

### Index

```sql
-- Lookup rapide
CREATE INDEX products_store_id_idx ON products (store_id);
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX product_variants_product_id_idx ON product_variants (product_id);

-- Recherche full-text (à venir)
CREATE INDEX products_search_idx ON products
  USING GIN (to_tsvector('french', name || ' ' || coalesce(description, '')));
```

## Transactions

### Niveaux d'isolation utilisés

| Cas | Niveau |
|---|---|
| Lectures simples | Read Committed |
| Création produit + variantes | Serializable |
| Création commande + réservation | Serializable |
| Commit paiement | Serializable |
| Calcul de stats | Read Committed |

### Retry automatique

```typescript
async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (!isSerializationConflict || attempt >= maxAttempts) {
        throw error;
      }

      const delay =
        Math.min(100 * 2 ** attempt, 2000) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

## Audit

### Tables d'audit

```prisma
model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  actorId    String?  @map("actor_id") @db.Uuid
  action     String   @db.VarChar(100)
  entityType String   @map("entity_type") @db.VarChar(50)
  entityId   String   @map("entity_id") @db.Uuid
  metadata   Json?
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")
}
```

### Actions tracées

- Toutes les actions ADMIN
- Créations/suppressions sensibles
- Modifications de permissions
- Accès aux données personnelles

## Sauvegarde et restauration

### Stratégie

| Type | Fréquence | Rétention |
|---|---|---|
| **Full backup** | Quotidien (2h) | 30 jours |
| **WAL archiving** | Continu | 7 jours |
| **Snapshot S3** | Hebdomadaire | 90 jours |

### RTO / RPO

| Métrique | Cible |
|---|---|
| RTO (Recovery Time) | 1h |
| RPO (Recovery Point) | 5 min |

### Drill de restauration

**Trimestriel** — Restauration complète sur environnement isolé.

## Croissance et partitioning

### Seuils de partitioning

| Table | Seuil | Stratégie |
|---|---|---|
| Order | 10M lignes | Par mois |
| OrderItem | 50M lignes | Avec Order |
| AuditLog | 100M lignes | Par mois |
| Notification | 50M lignes | Par mois |

### Archive

- Données > 2 ans archivées sur S3
- Accès via API dédiée
- Suppression après 10 ans (légal)

## Sécurité des données

### Chiffrement

| Couche | Méthode |
|---|---|
| En transit | TLS 1.3 |
| Au repos (DB) | AES-256 (managed) |
| Sauvegardes | AES-256 |
| PII sensible | Chiffrement applicatif (Phase 2) |

### Row-Level Security (Phase 2)

Pour les tables multi-tenant :
```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

## Monitoring DB

### Métriques clés

| Métrique | Seuil d'alerte |
|---|---|
| Connexions actives | > 80% du pool |
| Requêtes lentes (> 1s) | > 10/min |
| Deadlocks | > 0 |
| Replication lag | > 30s |
| Taille DB | > 80% disque |

### Requêtes lentes

```sql
CREATE EXTENSION pg_stat_statements;
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
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
