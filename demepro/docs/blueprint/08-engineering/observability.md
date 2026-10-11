# Observabilité

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Trois piliers

1. **Logs** — événements discrets
2. **Métriques** — agrégats numériques
3. **Traces** — parcours de requêtes

## Métriques clés

| Métrique | Type |
|---|---|
| http_requests_total | Counter |
| http_request_duration_seconds | Histogram |
| db_query_duration_seconds | Histogram |
| catalog_products_created_total | Counter |

## Health checks

```
GET /health       → statut global
GET /health/db    → statut base
GET /metrics      → Prometheus
```

## Alertes

| Alerte | Seuil |
|---|---|
| Error rate | > 1% sur 5 min |
| Latence p95 | > 1s sur 5 min |
| DB connections | > 80% |

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
