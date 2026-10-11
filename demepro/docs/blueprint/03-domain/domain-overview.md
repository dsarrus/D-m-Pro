# Vue d'ensemble du domaine

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Carte des domaines

```
┌───────────────────────────────────────────────┐
│              DɛmɛPro Domain                   │
├───────────────────────────────────────────────┤
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Catalog  │  │  Order   │  │ Payment  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │           │
│       └─────────────┴─────────────┘           │
│                     │                         │
│              ┌──────┴──────┐                  │
│              │    Store    │                  │
│              └─────────────┘                  │
│                                               │
└───────────────────────────────────────────────┘
```

## Domaines

| Domaine | Responsabilité | Statut |
|---|---|---|
| Catalog | Produits, variantes, images, stock | ✅ |
| Order | Commandes, cycle de vie | ❌ |
| Payment | Transactions, remboursements | ❌ |
| Store | Boutiques, professionnels | ⚠️ |

## Contextes bornés (Bounded Contexts)

- —

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
