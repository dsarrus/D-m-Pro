# Environnements

> **Section** : 09-infrastructure
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Liste

| Env | Usage | URL |
|---|---|---|
| Local | Développement | localhost |
| Test | CI | Docker éphémère |
| Staging | Pré-prod | staging.demepro.ml |
| Production | Prod | api.demepro.ml |

## Isolation

Chaque environnement a :
- Sa propre base de données
- Ses propres secrets
- Son propre bucket S3

## Promotion

```
Local → PR → Staging (auto) → Production (manuel)
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
