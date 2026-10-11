# Politique de dépendances

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Critères d'ajout

1. **Maintenue** — commits récents, issues traitées
2. **Populaire** — > 1M téléchargements/mois
3. **Auditée** — pas de vulnérabilités connues
4. **Licence compatible** — MIT, Apache 2.0

## Mises à jour

| Type | Fréquence |
|---|---|
| Patch (security) | Immédiat |
| Minor | Mensuel |
| Major | Trimestriel + tests |

## Outils

- `pnpm audit` en CI
- Dependabot pour les PR automatiques
- Snyk pour le scan continu

## Politique de lock

`pnpm-lock.yaml` **toujours commité**.

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
