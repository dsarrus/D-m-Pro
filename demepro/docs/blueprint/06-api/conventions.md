# Conventions API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Nommage des endpoints

```
GET    /resources
GET    /resources/:id
POST   /resources
PATCH  /resources/:id
DELETE /resources/:id
```

## Ressources imbriquées

```
GET  /products/:id/variants
POST /products/:id/variants
GET  /products/:id/images
```

## Actions spéciales

```
POST /products/:id/activate
POST /products/:id/archive
POST /variants/:id/deactivate
```

## Headers

| Header | Usage |
|---|---|
| Authorization | Bearer token |
| Idempotency-Key | Anti-double-soumission |
| Content-Type | application/json |

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
