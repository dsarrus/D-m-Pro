
# Dictionnaire de données

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Format

Chaque entrée spécifie : table, colonne, type, contraintes,
description, et exemple.

## users

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| email | VARCHAR(255) | UNIQUE NOT NULL | Email |
| password_hash | VARCHAR(255) | NOT NULL | Hash bcrypt |
| first_name | VARCHAR(100) | — | Prénom |
| last_name | VARCHAR(100) | — | Nom |
| phone | VARCHAR(20) | — | Téléphone |
| status | VARCHAR(20) | NOT NULL | ACTIVE / SUSPENDED / DELETED |
| email_verified | BOOLEAN | NOT NULL | Email confirmé |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## products

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| store_id | UUID | FK stores | Boutique |
| category_id | UUID | FK categories | Catégorie |
| name | VARCHAR(200) | NOT NULL | Nom |
| slug | VARCHAR(200) | UNIQUE(store_id) | Slug URL |
| sku | VARCHAR(100) | — | SKU produit simple |
| description | TEXT | — | Description |
| status | VARCHAR(20) | NOT NULL | DRAFT / ACTIVE / OUT_OF_STOCK / INACTIVE / ARCHIVED |
| has_variants | BOOLEAN | NOT NULL | Mode variantes |
| price | DECIMAL(12,2) | NULL | Prix (null si variantes) |
| currency | VARCHAR(3) | NOT NULL | XOF / EUR / USD |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## product_variants

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| product_id | UUID | FK products | Produit parent |
| name | VARCHAR(180) | NOT NULL | Nom variante |
| sku | VARCHAR(100) | UNIQUE | SKU global |
| price | DECIMAL(12,2) | NOT NULL | Prix |
| currency | VARCHAR(3) | NOT NULL | Devise |
| attributes | JSONB | — | Attributs (taille, couleur) |
| is_active | BOOLEAN | NOT NULL | Active |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

### Exemple attributes

```json
{
  "size": "42",
  "color": "Rouge",
  "material": "Coton"
}
```

## product_images

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| product_id | UUID | FK products | Produit |
| object_key | VARCHAR(500) | NOT NULL | Clé S3 |
| alt_text | VARCHAR(255) | — | Texte alternatif |
| sort_order | INT | NOT NULL | Ordre |
| is_primary | BOOLEAN | NOT NULL | Primaire |
| created_at | TIMESTAMPTZ | NOT NULL | Création |

## inventory

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| product_id | UUID | FK UNIQUE | Produit (XOR) |
| variant_id | UUID | FK UNIQUE | Variante (XOR) |
| quantity | INT | NOT NULL | Stock total |
| reserved | INT | NOT NULL | Stock réservé |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## orders

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| user_id | UUID | FK users | Client |
| store_id | UUID | FK stores | Boutique |
| status | VARCHAR(20) | NOT NULL | Statut |
| total_amount | DECIMAL(12,2) | NOT NULL | Total |
| currency | VARCHAR(3) | NOT NULL | Devise |
| delivery_address | TEXT | NOT NULL | Adresse |
| delivery_fee | DECIMAL(12,2) | NOT NULL | Frais |
| notes | TEXT | — | Notes |
| canceled_at | TIMESTAMPTZ | — | Annulation |
| refunded_at | TIMESTAMPTZ | — | Remboursement |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## order_items

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| order_id | UUID | FK orders | Commande |
| product_id | UUID | FK products (XOR) | Produit |
| variant_id | UUID | FK product_variants (XOR) | Variante |
| product_name | VARCHAR(200) | NOT NULL | Snapshot nom |
| variant_name | VARCHAR(180) | — | Snapshot variante |
| quantity | INT | NOT NULL | Quantité |
| unit_price | DECIMAL(12,2) | NOT NULL | Snapshot prix |
| subtotal | DECIMAL(12,2) | NOT NULL | Sous-total |

## payments

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| order_id | UUID | FK UNIQUE (XOR) | Commande |
| booking_id | UUID | FK UNIQUE (XOR) | Réservation |
| amount | DECIMAL(12,2) | NOT NULL | Montant |
| currency | VARCHAR(3) | NOT NULL | Devise |
| status | VARCHAR(30) | NOT NULL | Statut |
| provider | VARCHAR(50) | — | ORANGE_MONEY / WAVE |
| provider_ref | VARCHAR(255) | UNIQUE | Ref provider |
| paid_at | TIMESTAMPTZ | — | Paiement |
| refunded_at | TIMESTAMPTZ | — | Remboursement |
| metadata | JSONB | — | Métadonnées |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## reviews

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| user_id | UUID | FK users | Auteur |
| rating | INT | NOT NULL | Note 1-5 |
| comment | TEXT | — | Commentaire |
| product_id | UUID | FK products | Cible |
| service_id | UUID | FK services | Cible |
| store_id | UUID | FK stores | Cible |
| professional_id | UUID | FK professionals | Cible |
| order_id | UUID | FK UNIQUE | Commande |
| booking_id | UUID | FK UNIQUE | Réservation |
| is_verified_purchase | BOOLEAN | NOT NULL | Achat vérifié |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## addresses

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| user_id | UUID | FK users | Propriétaire |
| label | VARCHAR(50) | — | Libellé |
| line1 | VARCHAR(255) | NOT NULL | Adresse 1 |
| line2 | VARCHAR(255) | — | Adresse 2 |
| city | VARCHAR(100) | NOT NULL | Ville |
| region | VARCHAR(100) | — | Région |
| country | VARCHAR(2) | NOT NULL | Pays (ML) |
| postal_code | VARCHAR(20) | — | Code postal |
| phone | VARCHAR(20) | — | Téléphone |
| is_default | BOOLEAN | NOT NULL | Défaut |
| created_at | TIMESTAMPTZ | NOT NULL | Création |
| updated_at | TIMESTAMPTZ | NOT NULL | Modif |

## notifications

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| user_id | UUID | FK users | Destinataire |
| type | VARCHAR(50) | NOT NULL | Type |
| channel | VARCHAR(20) | NOT NULL | EMAIL/SMS/PUSH/IN_APP |
| title | VARCHAR(255) | NOT NULL | Titre |
| body | TEXT | NOT NULL | Corps |
| metadata | JSONB | — | Métadonnées |
| read_at | TIMESTAMPTZ | — | Lu à |
| sent_at | TIMESTAMPTZ | — | Envoyé à |
| created_at | TIMESTAMPTZ | NOT NULL | Création |

## Types énumérés

### User.status

- `ACTIVE` — Actif
- `SUSPENDED` — Suspendu
- `DELETED` — Supprimé

### Product.status

- `DRAFT` — Brouillon
- `ACTIVE` — Publié
- `OUT_OF_STOCK` — Rupture
- `INACTIVE` — Désactivé
- `ARCHIVED` — Archivé

### Order.status

- `PENDING` — En attente de paiement
- `PAID` — Payée
- `SHIPPED` — Expédiée
- `DELIVERED` — Livrée
- `CANCELLED` — Annulée
- `REFUNDED` — Remboursée

### Payment.status

- `PENDING` — En attente
- `PROCESSING` — En cours
- `PAID` — Payé
- `FAILED` — Échec
- `REFUNDED` — Remboursé
- `PARTIALLY_REFUNDED` — Partiel

### Store.status

- `PENDING` — En attente de validation
- `ACTIVE` — Actif
- `SUSPENDED` — Suspendu
- `CLOSED` — Fermé

### Review target

Une review doit avoir au moins un des :
- `product_id`
- `service_id`
- `store_id`
- `professional_id`

## Règles de validation

### users.email

- Format email valide
- Max 255 caractères
- Lowercase

### products.slug

- Min 3 caractères
- Max 200 caractères
- Regex : `^[a-z0-9]+(?:-[a-z0-9]+)*$`

### products.price

- `> 0` si `has_variants = false`
- `NULL` si `has_variants = true`

### product_variants.sku

- Max 100 caractères
- Uppercase
- Caractères : `[A-Z0-9-_]`

### reviews.rating

- Entier entre 1 et 5

### addresses.country

- Code ISO 3166-1 alpha-2
- Défaut : `ML`

## Champs sensibles

| Champ | Sensibilité | Traitement |
|---|---|---|
| password_hash | Critique | Hash bcrypt, jamais exposé |
| provider_ref | Haute | Chiffré si possible |
| ip_address | Haute | Rétention 30 jours |
| user_agent | Moyenne | Rétention 30 jours |
| phone | Moyenne | Masquage partiel dans les logs |


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
