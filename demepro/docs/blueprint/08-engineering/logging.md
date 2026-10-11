# Logging

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Niveaux

| Niveau | Usage |
|---|---|
| error | Erreur critique |
| warn | Anomalie non bloquante |
| info | Événement métier |
| debug | Détail technique |
| trace | Très verbeux |

## Format

JSON structuré :

```json
{
  "level": "info",
  "timestamp": "2026-10-10T20:00:00Z",
  "message": "Product created",
  "context": {
    "userId": "uuid",
    "productId": "uuid",
    "duration": 45
  }
}
```

## Corrélation

Chaque requête a un `requestId` unique propagé dans tous les logs.

## PII

Jamais de données personnelles dans les logs.

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
