# Sécurité autorisation

> **Section** : 07-security
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## RBAC

Chaque rôle a un ensemble de permissions :

```typescript
const ROLE_PERMISSIONS = {
  CLIENT: ["catalog.product.read", "order.create"],
  PROFESSIONAL: ["catalog.product.*", "store.*"],
  ADMIN: ["*"],
};
```

## Ownership

Vérification systématique :

```typescript
if (resource.ownerId !== ctx.userId) {
  throw new CatalogError(
    CatalogErrorCode.UNAUTHORIZED_STORE,
    "Non autorisé.",
  );
}
```

## IDOR (Insecure Direct Object Reference)

Toujours utiliser des UUID, jamais d'IDs auto-incrémentés exposés.

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
