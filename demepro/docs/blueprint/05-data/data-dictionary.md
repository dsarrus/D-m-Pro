# Dictionnaire de données

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Format

| Table | Colonne | Type | Contrainte | Description |
|---|---|---|---|---|

## products

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant |
| store_id | UUID | FK | Boutique propriétaire |
| category_id | UUID | FK | Catégorie |
| name | VARCHAR(200) | NOT NULL | Nom du produit |
| slug | VARCHAR(200) | UNIQUE(store_id) | Slug URL |
| sku | VARCHAR(100) | UNIQUE | SKU du produit simple |
| status | VARCHAR(20) | NOT NULL | DRAFT / ACTIVE / ... |
| has_variants | BOOLEAN | NOT NULL | Mode variantes |
| price | DECIMAL(12,2) | NULL | Prix (null si variantes) |
| currency | VARCHAR(3) | NOT NULL | XOF / EUR / USD |

## product_variants

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | — |
| product_id | UUID | FK | Produit parent |
| name | VARCHAR(180) | NOT NULL | Nom de la variante |
| sku | VARCHAR(100) | UNIQUE | SKU global |
| price | DECIMAL(12,2) | NOT NULL | Prix |
| is_active | BOOLEAN | NOT NULL | Actif |

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
