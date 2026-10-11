# C4 — Runtime View

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Scénario 1 — Création de produit

```
Client   API      Auth   Catalog   DB
  │       │        │       │       │
  ├──POST─►        │       │       │
  │       ├──verify─►      │       │
  │       │        │       │       │
  │       ├──create────────►       │
  │       │        │       ├──BEGIN─►
  │       │        │       ├──INSERT─►
  │       │        │       ├──COMMIT─►
  │       │        │       │       │
  │◄──201─┤        │       │       │
```

## Scénario 2 — Commande (à venir)

[À compléter]

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
