# Autorisation API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## RBAC

Chaque endpoint déclare une permission requise.

```typescript
router.post(
  "/products",
  authenticate,
  requirePermission("catalog.product.create"),
  validate(createProductSchema, "body"),
  controller.create,
);
```

## Ownership

En complément du RBAC, chaque service vérifie la propriété :

```typescript
if (product.store.professional.userId !== ctx.userId) {
  throw new CatalogError(
    CatalogErrorCode.UNAUTHORIZED_STORE,
    "Vous n'êtes pas autorisé à modifier ce produit.",
  );
}
```

## Codes d'erreur

| Code | HTTP | Signification |
|---|---|---|
| UNAUTHENTICATED | 401 | Token manquant/invalide |
| UNAUTHORIZED | 403 | Permission manquante |
| UNAUTHORIZED_STORE | 403 | Non propriétaire |

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
