# C4 — Component View (API)

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Composants du module API

```
apps/api/
├── modules/
│   ├── auth/         # Authentification
│   ├── rbac/         # Autorisation
│   ├── catalog/      # Produits, stock
│   ├── store/        # Boutiques
│   ├── category/     # Catégories
│   └── order/        # Commandes
├── shared/
│   ├── middleware/   # Auth, validate, errors
│   ├── errors/       # Base errors
│   └── utils/        # Helpers
└── infrastructure/
    ├── database/     # Prisma
    └── logger/       # Logs
```

## Structure d'un module

```
module/
├── controllers/
├── services/
├── repositories/
├── dtos/
├── errors/
└── routes/
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
