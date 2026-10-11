# CI / CD

> **Section** : 09-infrastructure
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Pipeline GitHub Actions

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build
```

## Déploiement

| Environnement | Déclencheur |
|---|---|
| Staging | Push sur `develop` |
| Production | Tag `v*` |

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
