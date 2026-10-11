# Machines à états

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Product Status

```
        ┌─────────┐
        │  DRAFT  │
        └────┬────┘
             │ activate
             ▼
        ┌─────────┐
        │ ACTIVE  │◄─────┐
        └────┬────┘      │
             │           │
    out of stock         │ restock
             ▼           │
    ┌────────────────┐   │
    │ OUT_OF_STOCK   │───┘
    └────────────────┘
             │
             │ archive
             ▼
        ┌─────────┐
        │ARCHIVED │
        └─────────┘
```

## Order Status (à venir)

```
PENDING ──► PAID ──► SHIPPED ──► DELIVERED
   │         │
   │         └──► REFUNDED
   │
   └──► CANCELLED
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
