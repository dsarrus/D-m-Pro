
# Vue d'ensemble de l'API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-17

## Base URL

| Environnement | URL |
|---|---|
| Local | http://localhost:3000/api/v1 |
| Staging | https://staging.demepro.ml/api/v1 |
| Production | https://api.demepro.ml/api/v1 |

## Format de réponse

### Succès

```json
{
  "success": true,
  "data": { ... }
}
```

### Erreur

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Produit introuvable.",
    "statusCode": 404
  }
}
```

## Endpoints par module

### Auth
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /auth/register | Non |
| POST | /auth/login | Non |

### Catalog
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /catalog/products | Pro |
| POST | /catalog/products/full | Pro |
| GET | /catalog/products | Public |
| GET | /catalog/products/:id | Public |
| PATCH | /catalog/products/:id | Pro |
| DELETE | /catalog/products/:id | Pro |
| POST | /catalog/products/:id/activate | Pro |
| POST | /catalog/products/:id/enable-variants | Pro |
| POST | /catalog/products/:id/disable-variants | Pro |
| POST | /catalog/products/:productId/variants | Pro |
| GET | /catalog/products/:productId/variants | Public |
| GET | /catalog/variants/:id | Public |
| PATCH | /catalog/variants/:id | Pro |
| DELETE | /catalog/variants/:id | Pro |
| POST | /catalog/products/:productId/images | Pro |
| POST | /catalog/products/:productId/images/reorder | Pro |
| PATCH | /catalog/images/:id | Pro |
| DELETE | /catalog/images/:id | Pro |
| GET | /catalog/inventory/:id | Pro |
| PATCH | /catalog/inventory/:id | Pro |
| POST | /catalog/inventory/:id/adjust | Pro |

### Store
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /stores | Pro |
| GET | /stores | Public |
| GET | /stores/mine | Pro |
| GET | /stores/:id | Pro |
| PATCH | /stores/:id | Pro |
| POST | /stores/:id/activate | Pro |
| POST | /stores/:id/suspend | Admin |

### Category
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /categories | Admin |
| GET | /categories | Public |
| GET | /categories/:id | Public |
| PATCH | /categories/:id | Admin |
| DELETE | /categories/:id | Admin |

### Order
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /orders | Client |
| GET | /orders/mine | Client |
| GET | /orders/store/:storeId | Pro |
| GET | /orders/:id | Client/Pro |
| POST | /orders/:id/ship | Pro |
| POST | /orders/:id/deliver | Pro |
| POST | /orders/:id/cancel | Client/Pro |

### Payment
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /orders/:id/payment | Client |
| GET | /orders/:id/payment | Client/Pro |
| POST | /orders/:id/payment/refund | Client/Admin |
| POST | /webhooks/payment/:provider | Public (signé) |

### Address
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /addresses | Client |
| GET | /addresses/mine | Client |
| GET | /addresses/default | Client |
| GET | /addresses/:id | Client |
| PATCH | /addresses/:id | Client |
| POST | /addresses/:id/default | Client |
| DELETE | /addresses/:id | Client |

### Review
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /reviews | Client |
| GET | /reviews/products/:productId | Public |
| GET | /reviews/stores/:storeId | Public |
| GET | /reviews/summary | Public |
| PATCH | /reviews/:id | Client |
| DELETE | /reviews/:id | Client/Admin |
| POST | /reviews/:id/report | Client |
| POST | /reviews/:id/moderate | Admin |

### Notification
| Méthode | Endpoint | Auth |
|---|---|---|
| GET | /notifications/mine | Client/Pro |
| GET | /notifications/unread-count | Client/Pro |
| POST | /notifications/:id/read | Client/Pro |
| POST | /notifications/read-all | Client/Pro |

### Service
| Méthode | Endpoint | Auth |
|---|---|---|
| POST | /services | Pro |
| POST | /services/full | Pro |
| GET | /services | Public |
| GET | /services/mine | Pro |
| GET | /services/:id | Public |
| PATCH | /services/:id | Pro |
| POST | /services/:id/activate | Pro |
| DELETE | /services/:id | Pro |
| POST | /services/:id/images | Pro |
| POST | /services/:id/images/reorder | Pro |
| DELETE | /services/images/:imageId | Pro |
| POST | /services/:id/zones | Pro |
| DELETE | /services/zones/:zoneId | Pro |
| POST | /services/:id/availabilities | Pro |
| DELETE | /services/availabilities/:availabilityId | Pro |

### Verification
| Méthode | Endpoint | Auth |
|---|---|---|
| GET | /me/verification | Client/Pro |
| POST | /me/verification/upgrade-trusted | Client/Pro |
| POST | /me/verification/request-certification | Client/Pro |
| POST | /admin/verification/:id/approve | Admin |
| POST | /admin/verification/:id/reject | Admin |

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| 2026-10-17 | 0.4.0 | Mise à jour tous endpoints (390 tests) | — |
