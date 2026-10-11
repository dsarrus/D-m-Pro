# Workflows

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Workflow — Création de produit

```
Professionnel
    │
    ▼
[POST /catalog/products]
    │
    ├── Auth + RBAC
    ├── Vérif Store ownership
    ├── Vérif Category
    ├── Vérif slug unique
    ├── INSERT Product
    └── Retour DRAFT
```

## Workflow — Commande (à venir)

```
Client
    │
    ▼
[POST /orders]
    │
    ├── Auth
    ├── Vérif stock disponible
    ├── RESERVE stock
    ├── INSERT Order PENDING
    └── Redirection paiement
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
