# Roadmap d'évolution architecturale

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Phase actuelle — Modular Monolith

Un seul déployable, plusieurs modules.

## Phase 2 — Extraction de services

Extraire les modules à forte charge :
- Catalog (lecture intensive)
- Order (écriture intensive)

## Phase 3 — Microservices

Si nécessaire :
- Découpage par bounded context
- Message bus (Kafka / RabbitMQ)
- Saga pattern pour les transactions distribuées

## Critères de déclenchement

Passer à la phase suivante **uniquement** si :
- La charge dépasse la capacité d'un seul serveur
- Les équipes deviennent trop nombreuses pour un monolithe
- Les cycles de déploiement deviennent bloquants

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
