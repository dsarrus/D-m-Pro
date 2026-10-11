# Agrégats

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Product (Aggregate Root)

```
Product (root)
  ├── ProductVariant[]
  ├── ProductImage[]
  └── Inventory
```

**Frontière transactionnelle** : toutes les opérations sur Product et ses enfants sont transactionnelles.

## Order (Aggregate Root)

```
Order (root)
  └── OrderItem[]
```

## Règles d'agrégat

- On ne référence que l'ID d'un autre agrégat, jamais son objet complet
- Une transaction modifie un seul agrégat

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
