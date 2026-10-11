# Hooks IA

> **Section** : 11-ai-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Hooks

| Hook | Trigger | Action |
|---|---|---|
| pre-commit | Avant commit | Lint + tests |
| pre-push | Avant push | Tests intégration |
| post-merge | Après merge | Migrations |

## Hooks Git

```bash
# .husky/pre-commit
pnpm lint-staged
pnpm test:unit
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
