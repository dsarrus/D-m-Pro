# Monitoring

> **Section** : 09-infrastructure
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Stack

| Composant | Outil |
|---|---|
| Métriques | Prometheus |
| Visualisation | Grafana |
| Logs | Loki |
| Traces | Tempo |
| Alertes | Alertmanager |

## Dashboards

### API

- Requêtes/seconde
- Latence p50/p95/p99
- Taux d'erreur
- Connexions DB actives

### Business

- Produits créés/jour
- Commandes/jour
- CA/jour

## Alertes critiques

| Alerte | Condition | Sévérité |
|---|---|---|
| API down | Health check fail | P0 |
| DB down | Connexion impossible | P0 |
| Error rate | > 5% sur 5 min | P1 |
| Latence p95 | > 2s sur 5 min | P1 |

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
