# Versionnement API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Stratégie

Versionnement par **préfixe URL** : `/api/v1/`, `/api/v2/`.

## Politique

- Une version reste supportée **12 mois** après sa dépréciation
- Les breaking changes nécessitent une nouvelle version
- Les ajouts rétrocompatibles ne changent pas la version

## Dépréciation

Header `Deprecation` + `Sunset` :

```
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
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
