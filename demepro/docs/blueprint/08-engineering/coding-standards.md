# Standards de code

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Voir

- [CONVENTIONS.md](../CONVENTIONS.md) — conventions détaillées

## Résumé

### Nommage
- **Fichiers** : kebab-case
- **Classes** : PascalCase
- **Méthodes** : camelCase
- **Constantes** : SCREAMING_SNAKE_CASE

### Structure
- Une classe par fichier
- Séparation des couches (Route/Controller/Service/Repository)

### TypeScript
- `strict: true`
- Pas de `any`
- Types explicites pour les APIs publiques

### Linting
- ESLint + Prettier
- Pre-commit hook
- CI bloque sur lint errors

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
