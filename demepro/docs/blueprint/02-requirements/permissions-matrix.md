# Matrice de permissions

> **Section** : 02-requirements
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Rôles

| Rôle | Description |
|---|---|
| CLIENT | Utilisateur final |
| PROFESSIONAL | Commerçant |
| ADMIN | Administrateur |
| SUPER_ADMIN | Super administrateur |

## Matrice

| Permission | CLIENT | PROFESSIONAL | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `catalog.product.create` | ❌ | ✅ | ✅ | ✅ |
| `catalog.product.update` | ❌ | ✅ | ✅ | ✅ |
| `catalog.product.delete` | ❌ | ✅ | ✅ | ✅ |
| `catalog.product.read` | ✅ | ✅ | ✅ | ✅ |
| `order.create` | ✅ | ❌ | ❌ | ✅ |
| — | — | — | — | — |

## Convention de nommage

```
<module>.<entité>.<action>
```

Exemples :
- `catalog.product.create`
- `order.payment.confirm`
- `admin.user.suspend`

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
