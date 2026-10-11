# Cycle de vie des données

> **Section** : 05-data
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Étapes

```
Create → Active → Archived → Deleted
```

## Produit

| État | Description | Action |
|---|---|---|
| DRAFT | Créé, non publié | — |
| ACTIVE | Publié, achetable | — |
| ARCHIVED | Retiré, non achetable | Soft delete |

## Rétention

| Type de données | Rétention | Raison |
|---|---|---|
| Commandes | 10 ans | Légal |
| Produits | Illimité | — |
| Logs | 90 jours | RGPD |
| Sessions | 30 jours | Sécurité |

## Suppression

- **Soft delete** : archivage, conservation
- **Hard delete** : suppression définitive après période légale

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
