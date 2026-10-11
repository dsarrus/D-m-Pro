# Vue d'ensemble de l'architecture

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Style architectural

**Modular Monolith** — un seul déployable, plusieurs modules faiblement couplés.

## Principes

1. Séparation en couches (Route / Controller / Service / Repository)
2. Communication inter-modules via interfaces
3. Base de données partagée, schémas séparés par module
4. Évolution possible vers microservices

## Diagramme C4 — Contexte

```
[Utilisateur] ──► [DɛmɛPro] ──► [Payment Provider]
                     │
                     ├──► [Storage]
                     └──► [Notification]
```

## Voir aussi

- [Principes](./principles.md)
- [C4 Container](./container-view.md)
- [Déploiement](./deployment-view.md)

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
