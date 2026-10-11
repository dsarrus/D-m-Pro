# C4 — Deployment View

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Environnements

| Environnement | URL | Base |
|---|---|---|
| Local | localhost | Docker |
| Staging | staging.demepro.ml | Managed |
| Production | api.demepro.ml | Managed |

## Infrastructure

```
                    ┌─────────────┐
                    │   CDN       │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Load       │
                    │  Balancer   │
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
            ┌───────┐  ┌───────┐  ┌───────┐
            │ API-1 │  │ API-2 │  │ API-3 │
            └───┬───┘  └───┬───┘  └───┬───┘
                └──────────┼──────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    └─────────────┘
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
