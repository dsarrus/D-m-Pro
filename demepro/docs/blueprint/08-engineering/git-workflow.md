# Workflow Git

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Branches

| Branche | Usage |
|---|---|
| `main` | Production |
| `develop` | Intégration |
| `feature/*` | Nouvelles fonctionnalités |
| `fix/*` | Corrections |
| `hotfix/*` | Correctifs urgents |

## Convention de commit

```
<type>(<scope>): <description>

[body]

[footer]
```

**Types** : feat, fix, docs, style, refactor, test, chore

**Exemples** :
```
feat(catalog): ajouter la création atomique de produit
fix(inventory): corriger la survente sous concurrence
docs(blueprint): ajouter le fichier de vision
```

## Pull Requests

- Titre clair
- Description avec contexte
- Tests passent
- Au moins 1 reviewer
- Squash merge

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
