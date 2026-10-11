# Déploiement

> **Section** : 09-infrastructure
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Stratégie

**Blue/Green** pour les déploiements sans downtime.

## Étapes

1. Build l'image
2. Push au registry
3. Déployer sur l'environnement "green"
4. Vérifier health checks
5. Basculer le trafic
6. Garder "blue" pendant 24h
7. Éteindre "blue"

## Rollback

```bash
# Retour à la version précédente
git revert <commit>
git push origin main
```

## Migrations DB

- Migrations appliquées **avant** le déploiement du code
- Migrations **rétrocompatibles** (pas de DROP COLUMN direct)

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
