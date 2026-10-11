# Architecture des données

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Principes

1. **PostgreSQL** comme source de vérité
2. **Prisma** comme ORM
3. **Migrations versionnées**
4. **Contraintes DB** pour les invariants critiques

## Modèle de données

```
User ──► ProfessionalProfile ──► Store ──► Product
                                            │
                    ┌───────────────────────┼───────────────────┐
                    │                       │                   │
                    ▼                       ▼                   ▼
              ProductVariant          ProductImage        Inventory
                    │
                    ▼
                Inventory
```

## Stratégie de migration

- Une migration par changement de schéma
- Migrations testées en staging avant prod
- Rollback préparé pour chaque migration destructive

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
