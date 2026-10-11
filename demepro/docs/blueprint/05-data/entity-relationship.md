
# Diagramme entité-relation

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Mermaid ER global

```mermaid
erDiagram
    User ||--o| ProfessionalProfile : has
    User ||--o{ Address : owns
    User ||--o{ Notification : receives
    User ||--o{ Order : places
    User ||--o{ Quote : requests
    User ||--o{ Booking : books
    User ||--o{ Review : writes

    ProfessionalProfile ||--o{ Store : owns
    ProfessionalProfile ||--o{ Service : offers
    ProfessionalProfile ||--o{ QuoteResponse : responds
    ProfessionalProfile ||--o{ Review : receives

    Store ||--o{ Product : contains
    Store ||--o{ Order : receives
    Store ||--o{ Review : rated

    Category ||--o{ Product : classifies
    Category ||--o{ Service : classifies

    Product ||--o{ ProductVariant : has
    Product ||--o{ ProductImage : has
    Product ||--o| Inventory : has
    Product ||--o{ Review : reviewed

    ProductVariant ||--o| Inventory : has

    Service ||--o{ ServiceImage : has
    Service ||--o{ ServiceZone : covers
    Service ||--o{ Availability : has
    Service ||--o{ Quote : receives
    Service ||--o{ Booking : booked
    Service ||--o{ Review : reviewed

    Order ||--o{ OrderItem : contains
    Order ||--o{ OrderStatusHistory : tracks
    Order ||--o| Payment : paid_by
    Order ||--o| Delivery : shipped_by
    Order ||--o| Review : has

    OrderItem }o--|| Product : references
    OrderItem }o--|| ProductVariant : references

    Quote ||--o| QuoteResponse : has
    Quote ||--o| Booking : converts_to

    Booking ||--o| Payment : paid_by
    Booking ||--o| Review : has

    Payment ||--o{ Transaction : has

    Review ||--o{ ReviewReport : reported
```

## Détails par contexte

### Identity

```mermaid
erDiagram
    User ||--o| ProfessionalProfile : has
    User ||--o{ UserRoleAssignment : has
    Role ||--o{ UserRoleAssignment : assigned
    Role ||--o{ RolePermission : has
    Permission ||--o{ RolePermission : granted

    User {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        string status
    }

    ProfessionalProfile {
        uuid id PK
        uuid userId FK
        string businessName
        string slug UK
        string verificationStatus
    }

    Role {
        uuid id PK
        string code UK
        string name
    }

    Permission {
        uuid id PK
        string code UK
        string resource
        string action
    }
```

### Catalog

```mermaid
erDiagram
    Store ||--o{ Product : contains
    Category ||--o{ Product : classifies
    Product ||--o{ ProductVariant : has
    Product ||--o{ ProductImage : has
    Product ||--o| Inventory : has
    ProductVariant ||--o| Inventory : has

    Product {
        uuid id PK
        uuid storeId FK
        uuid categoryId FK
        string name
        string slug
        string sku
        string status
        boolean hasVariants
        decimal price
        string currency
    }

    ProductVariant {
        uuid id PK
        uuid productId FK
        string name
        string sku UK
        decimal price
        boolean isActive
    }

    ProductImage {
        uuid id PK
        uuid productId FK
        string objectKey
        int sortOrder
        boolean isPrimary
    }

    Inventory {
        uuid id PK
        uuid productId FK
        uuid variantId FK
        int quantity
        int reserved
    }
```

### Order

```mermaid
erDiagram
    User ||--o{ Order : places
    Store ||--o{ Order : receives
    Order ||--o{ OrderItem : contains
    Order ||--o{ OrderStatusHistory : tracks
    Order ||--o| Payment : paid
    Order ||--o| Delivery : shipped
    Order ||--o| Review : reviewed
    OrderItem }o--|| Product : references
    OrderItem }o--|| ProductVariant : references
    Payment ||--o{ Transaction : has
```

### Service (Phase 2)

```mermaid
erDiagram
    ProfessionalProfile ||--o{ Service : offers
    Service ||--o{ ServiceImage : has
    Service ||--o{ ServiceZone : covers
    Service ||--o{ Availability : has
    Service ||--o{ Quote : receives
    Service ||--o{ Booking : booked
    Quote ||--o| QuoteResponse : has
    Quote ||--o| Booking : converts
    Booking ||--o| Payment : paid
```

## Cardinalités

| Relation | Cardinalité | Contrainte |
|---|---|---|
| User → ProfessionalProfile | 1-0..1 | 1 profil par user |
| User → Address | 1-N | N adresses |
| User → Order | 1-N | Historique |
| ProfessionalProfile → Store | 1-N | Plusieurs boutiques |
| Store → Product | 1-N | Catalogue |
| Product → ProductVariant | 1-N | Si hasVariants |
| Product → ProductImage | 1-N | Plusieurs images |
| Product → Inventory | 1-0..1 | Si produit simple |
| ProductVariant → Inventory | 1-0..1 | Une par variante |
| Order → OrderItem | 1-N | Lignes |
| Order → Payment | 1-0..1 | Un paiement |
| Order → Delivery | 1-0..1 | Une livraison |
| Order → Review | 1-0..1 | Un avis |
| Service → Quote | 1-N | Demandes |
| Quote → Booking | 1-0..1 | Conversion |
| Booking → Payment | 1-0..1 | Un paiement |

## Relations critiques

### XOR contraintes

| Table | Contrainte |
|---|---|
| inventory | product_id XOR variant_id |
| order_items | product_id XOR variant_id |
| payments | order_id XOR booking_id |

### Unicité

| Table | Contrainte |
|---|---|
| users | email |
| professional_profiles | user_id, slug |
| stores | slug |
| products | (store_id, slug) |
| product_variants | sku |
| payments | provider_ref |
| reviews | order_id, booking_id |
| idempotency_keys | (key, scope) |
| bookings | (service_id, scheduled_at) |

### Index partiels

| Table | Index | Condition |
|---|---|---|
| product_images | unique (product_id) | WHERE is_primary = TRUE |
| service_images | unique (service_id) | WHERE is_primary = TRUE |
| addresses | unique (user_id) | WHERE is_default = TRUE |

## Cardinalités par volume

| Table | Volume An 1 | Volume An 3 |
|---|---|---|
| users | 2 000 | 60 000 |
| professional_profiles | 100 | 2 000 |
| stores | 120 | 2 500 |
| products | 2 000 | 50 000 |
| product_variants | 8 000 | 200 000 |
| product_images | 10 000 | 300 000 |
| inventory | 8 000 | 200 000 |
| orders | 5 000 | 200 000 |
| order_items | 15 000 | 600 000 |
| payments | 4 500 | 180 000 |
| reviews | 1 000 | 60 000 |
| notifications | 20 000 | 1 000 000 |
| audit_logs | 50 000 | 5 000 000 |

## Décisions de modélisation

1. **UUID partout** — Pas d'IDs auto-incrémentés exposés (IDOR)
2. **Soft delete via status** — Pas de suppression physique
3. **Snapshot dans OrderItem** — Préserver l'historique
4. **Index partiels** — Pour les unicités conditionnelles
5. **CHECK constraints** — Pour les invariants critiques
6. **Audit séparé** — Table `audit_logs` indépendante


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
