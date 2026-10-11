# Architecture d'intégration

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Intégrations externes

| Service | Usage | Protocole |
|---|---|---|
| Orange Money | Paiement | REST + Webhook |
| Wave | Paiement | REST + Webhook |
| SendGrid | Email | REST |
| Twilio | SMS | REST |
| S3 | Fichiers | S3 API |

## Stratégie

- **Adapters** : chaque intégration est encapsulée dans un adapter
- **Retry** : les appels sortants ont un retry exponentiel
- **Circuit breaker** : en cas de panne prolongée
- **Idempotence** : les webhooks sont idempotents

## Contrats

- Chaque intégration a un schéma Zod pour valider les payloads
- Les secrets sont dans des variables d'environnement

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
