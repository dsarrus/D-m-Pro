# C4 — System Context

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Diagramme

```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                           │ HTTPS
                           ▼
    ┌──────────────────────────────────┐
    │          DɛmɛPro                 │
    │                                  │
    │  ┌────────┐  ┌────────┐         │
    │  │  Web   │  │  API   │         │
    │  └────────┘  └────┬───┘         │
    │                   │              │
    └───────────────────┼──────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌──────────┐    ┌─────────┐
   │   DB    │    │ Payment  │    │ Storage │
   └─────────┘    └──────────┘    └─────────┘
```

## Acteurs externes

| Acteur | Type | Protocole |
|---|---|---|
| Client | Utilisateur | HTTPS |
| Payment Provider | Système | HTTPS / Webhook |
| Storage (S3) | Système | HTTPS |

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
