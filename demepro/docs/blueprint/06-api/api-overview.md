# Vue d'ensemble de l'API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Base URL

| Environnement | URL |
|---|---|
| Local | http://localhost:3000/api/v1 |
| Staging | https://staging.demepro.ml/api/v1 |
| Production | https://api.demepro.ml/api/v1 |

## Modules

| Module | Préfixe | Statut |
|---|---|---|
| Auth | /auth | ✅ |
| Catalog | /catalog | ✅ |
| Store | /store | ⚠️ |
| Order | /orders | ❌ |

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
