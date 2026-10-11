# Principes architecturaux

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## 1. Simplicité avant tout

Préférer une solution simple et lisible à une solution "élégante" mais complexe.

## 2. Explicit over implicit

Les invariants sont vérifiés au niveau base de données, pas seulement en application.

## 3. Transactions atomiques

Toute opération qui touche plusieurs tables est transactionnelle.

## 4. Idempotence par défaut

Les créations sensibles supportent `Idempotency-Key`.

## 5. Ownership systématique

Chaque opération vérifie que l'utilisateur a le droit d'agir sur la ressource.

## 6. Erreurs explicites

Les erreurs ont un code métier clair, pas un message générique.

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
