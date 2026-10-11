
# Vue d'ensemble de l'API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Base URL

| Environnement | URL |
|---|---|
| Local | http://localhost:3000/api/v1 |
| Staging | https://staging.demepro.ml/api/v1 |
| Production | https://api.demepro.ml/api/v1 |

## Versionnement

**Stratégie** : préfixe URL (`/api/v1/`).

**Politique** : une version reste supportée 12 mois après dépréciation.

## Format de réponse

### Succès

```json
{
  "success": true,
  "data": { ... }
}
```

### Succès paginé

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "limit": 20,
    "nextCursor": "uuid-or-null",
    "hasMore": true
  }
}
```

### Erreur

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Produit introuvable.",
    "statusCode": 404,
    "details": [ ... ]
  }
}
```

## Endpoints par module

### Auth

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/register | Non | Inscription |
| POST | /auth/login | Non | Connexion |
| POST | /auth/refresh | Non | Renouvellement token |
| POST | /auth/logout | Oui | Déconnexion |
| GET | /me | Oui | Profil |

### Catalog — Products

| Méthode | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | /catalog/products | Oui | catalog.product.create |
| POST | /catalog/products/full | Oui | catalog.product.create |
| GET | /catalog/products | Non | — |
| GET | /catalog/products/store/:storeId | Oui | catalog.product.read.own |
| GET | /catalog/products/:id | Non | — |
| PATCH | /catalog/products/:id | Oui | catalog.product.update |
| POST | /catalog/products/:id/activate | Oui | catalog.product.activate |
| POST | /catalog/products/:id/enable-variants | Oui | catalog.product.update |
| POST | /catalog/products/:id/disable-variants | Oui | catalog.product.update |
| DELETE | /catalog/products/:id | Oui | catalog.product.archive |
| DELETE | /catalog/products/:id/hard | Oui | catalog.product.delete |

### Catalog — Variants

| Méthode | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | /catalog/products/:productId/variants | Oui | catalog.variant.create |
| GET | /catalog/products/:productId/variants | Non | — |
| GET | /catalog/variants/:id | Non | — |
| PATCH | /catalog/variants/:id | Oui | catalog.variant.update |
| DELETE | /catalog/variants/:id | Oui | catalog.variant.delete |
| POST | /catalog/variants/:id/activate | Oui | catalog.variant.activate |
| POST | /catalog/variants/:id/deactivate | Oui | catalog.variant.deactivate |

### Catalog — Images

| Méthode | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | /catalog/products/:productId/images | Oui | catalog.image.create |
| GET | /catalog/products/:productId/images | Non | — |
| POST | /catalog/products/:productId/images/reorder | Oui | catalog.image.reorder |
| GET | /catalog/images/:id | Non | — |
| PATCH | /catalog/images/:id | Oui | catalog.image.update |
| DELETE | /catalog/images/:id | Oui | catalog.image.delete |

### Catalog — Inventory

| Méthode | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | /catalog/inventory/product/:productId | Oui | catalog.inventory.update |
| POST | /catalog/inventory/variant/:variantId | Oui | catalog.inventory.update |
| GET | /catalog/inventory/:id | Oui | catalog.inventory.read |
| PATCH | /catalog/inventory/:id | Oui | catalog.inventory.update |
| POST | /catalog/inventory/:id/adjust | Oui | catalog.inventory.adjust |

### Store (à implémenter)

| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /stores | Oui |
| GET | /stores/me | Oui |
| GET | /stores/:slug | Non |
| PATCH | /stores/:id | Oui |
| POST | /stores/:id/activate | Oui (admin) |
| POST | /stores/:id/suspend | Oui (admin) |

### Order (à implémenter)

| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /orders | Oui |
| GET | /orders | Oui |
| GET | /orders/:id | Oui |
| POST | /orders/:id/pay | Oui |
| POST | /orders/:id/cancel | Oui |
| POST | /orders/:id/ship | Oui (pro) |
| POST | /orders/:id/deliver | Oui (pro) |

### Review (à implémenter)

| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /reviews | Oui |
| GET | /reviews | Non |
| PATCH | /reviews/:id | Oui |
| DELETE | /reviews/:id | Oui |
| POST | /reviews/:id/report | Oui |

## Headers standards

| Header | Valeurs | Usage |
|---|---|---|
| Authorization | Bearer {token} | Auth |
| Content-Type | application/json | Body |
| Idempotency-Key | string | Créations sensibles |
| X-Test-User-Id | UUID | Tests uniquement (NODE_ENV=test) |

## Codes HTTP

| Code | Usage |
|---|---|
| 200 | Succès lecture/update |
| 201 | Création réussie |
| 204 | Suppression (sans body) |
| 400 | Validation Zod échouée |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource introuvable |
| 409 | Conflit (slug, SKU, idempotence) |
| 422 | État invalide |
| 429 | Rate limit dépassé |
| 500 | Erreur interne |
| 503 | Service indisponible |

## Pagination

### Curseur (recommandé)

```
GET /resources?limit=20&cursor=<lastId>
```

**Avantages** : stable, performant sur grandes collections.

### Offset (déprécié)

```
GET /resources?page=2&limit=20
```

## Filtrage

```
GET /catalog/products?status=ACTIVE&storeId=xxx
```

## Tri

```
GET /catalog/products?sort=createdAt:desc
```

## Recherche

```
GET /catalog/products?q=robe
```

**Implémentation** : full-text PostgreSQL (à venir).

## Rate limiting

| Endpoint | Limite |
|---|---|
| POST /auth/login | 5 / 15 min / IP |
| POST /auth/register | 3 / h / IP |
| POST /catalog/products | 60 / min / user |
| POST /orders | 10 / min / user |
| Global | 1000 / min / IP |

**Header de réponse** :
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1700000000
```

## Idempotence

### Endpoints supportés

- `POST /catalog/products`
- `POST /catalog/products/full`
- `POST /catalog/products/:productId/variants`
- `POST /orders`
- `POST /payments`

### Usage

```http
POST /catalog/products
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ ... }
```

**Réponse** : identique pour la même clé + même payload.
**Conflit** : 409 `IDEMPOTENCY_CONFLICT` si payload différent.

## Authentification

### JWT Bearer

```http
GET /me
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### Tokens

| Token | Durée | Usage |
|---|---|---|
| Access | 15 min | Requêtes API |
| Refresh | 7 jours | Renouvellement |

### Rafraîchissement

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "..." }
```

## Documentation

- **OpenAPI 3.1** : `/docs/openapi.yaml`
- **Swagger UI** : `/docs` (dev/staging uniquement)
- **Postman** : collection exportable

## Exemples

### Créer un produit simple

```bash
curl -X POST https://api.demepro.ml/api/v1/catalog/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "550e8400-e29b-41d4-a716-446655440000",
    "categoryId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Robe wax",
    "slug": "robe-wax",
    "hasVariants": false,
    "price": 15000,
    "currency": "XOF"
  }'
```

### Créer un produit à variantes

```bash
curl -X POST https://api.demepro.ml/api/v1/catalog/products/full \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "...",
    "categoryId": "...",
    "name": "Chaussure homme",
    "slug": "chaussure-homme",
    "hasVariants": true,
    "currency": "XOF",
    "variants": [
      { "name": "41", "sku": "CH-41", "price": 15000, "inventory": 10 },
      { "name": "42", "sku": "CH-42", "price": 15000, "inventory": 8 }
    ],
    "images": [
      { "objectKey": "products/chaussure.jpg", "isPrimary": true }
    ]
  }'
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
