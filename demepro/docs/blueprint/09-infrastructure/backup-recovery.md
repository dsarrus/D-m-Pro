# Backup & Recovery

> **Section** : 09-infrastructure
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Backups

| Type | Fréquence | Rétention |
|---|---|---|
| Full DB | Journalier | 30 jours |
| WAL archiving | Continu | 7 jours |
| Fichiers S3 | Versioning | 90 jours |

## RTO / RPO

| Métrique | Cible |
|---|---|
| RTO (Recovery Time Objective) | 1h |
| RPO (Recovery Point Objective) | 5 min |

## Procédure de restauration

1. Identifier le point de restauration
2. Provisionner une DB de restauration
3. Appliquer les WAL jusqu'au point voulu
4. Vérifier l'intégrité
5. Basculer le trafic

## Tests

Un drill de restauration est effectué **trimestriellement**.

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
