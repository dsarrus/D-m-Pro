# Critères d'acceptation

> **Section** : 02-requirements
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Format Gherkin

```gherkin
Feature: [Nom]
  As a [role]
  I want [action]
  So that [benefit]

  Scenario: [Titre]
    Given [contexte]
    When [action]
    Then [résultat]
```

## Scénarios critiques

### Création de produit

```gherkin
Scenario: Créer un produit simple
  Given un professionnel authentifié
  And une boutique dont il est propriétaire
  When il crée un produit avec hasVariants=false et price=15000
  Then le produit est créé avec status=DRAFT
  And le prix est 15000
```

### Commande

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
