
# Critères d'acceptation

> **Section** : 02-requirements
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

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

## Auth

### Inscription

```gherkin
Feature: Inscription client

  Scenario: Inscription réussie
    Given un visiteur avec email "awa@test.ml"
    When elle s'inscrit avec mot de passe "SecurePass123!"
    Then un compte CLIENT est créé
    And elle reçoit un JWT
    And elle est redirigée vers l'accueil

  Scenario: Email déjà utilisé
    Given un utilisateur existant avec email "awa@test.ml"
    When un visiteur tente de s'inscrire avec le même email
    Then la requête échoue avec 409 DUPLICATE_EMAIL

  Scenario: Mot de passe faible
    Given un visiteur
    When il s'inscrit avec mot de passe "123"
    Then la requête échoue avec 400 VALIDATION_ERROR
```

## Catalog

### Créer un produit simple

```gherkin
Feature: Création de produit

  Background:
    Given un professionnel authentifié "fatou@test.ml"
    And une boutique "fatou-couture" dont elle est propriétaire
    And une catégorie "mode-femme"

  Scenario: Créer un produit simple valide
    When elle crée un produit
      | name          | "Robe wax" |
      | slug          | "robe-wax" |
      | hasVariants   | false |
      | price         | 15000 |
    Then le produit est créé avec status DRAFT
    And le prix est 15000

  Scenario: Refus si hasVariants=true sans variantes
    When elle crée un produit avec hasVariants=true
    Then la requête échoue avec 400 VALIDATION_ERROR

  Scenario: Refus si slug dupliqué
    Given un produit existant avec slug "robe-wax" dans la même boutique
    When elle crée un produit avec slug "robe-wax"
    Then la requête échoue avec 409 DUPLICATE_SLUG

  Scenario: Refus si non-propriétaire
    Given un autre professionnel "awa@test.ml"
    When elle tente de créer un produit dans la boutique de Fatou
    Then la requête échoue avec 403 UNAUTHORIZED_STORE
```

### Créer un produit à variantes

```gherkin
Scenario: Création atomique avec variantes et images
  When elle crée un produit complet
    | hasVariants | true |
    | variants    | [41, 42, 43] |
    | images      | [p1.jpg, p2.jpg] |
  Then le produit est créé avec 3 variantes
  And les 3 inventaires sont créés
  And 1 seule image est primaire

Scenario: Rollback si une variante échoue
  Given un SKU "CH-42" déjà utilisé ailleurs
  When elle tente de créer un produit avec 3 variantes dont SKU "CH-42"
  Then la requête échoue avec 409 DUPLICATE_SKU
  And aucun produit n'est créé
  And aucune variante n'est créée
```

### Concurrence

```gherkin
Scenario: Empêcher la survente sous concurrence
  Given un produit "Robe wax" avec stock=5
  When 10 clientes réservent simultanément 1 robe
  Then exactement 5 réservations réussissent
  And exactement 5 échouent avec INSUFFICIENT_STOCK
  And le stock réservé est 5
  And quantity - reserved = 0
```

### Idempotence

```gherkin
Scenario: Double clic sur "Créer produit"
  Given un professionnel avec clé "idem-key-1"
  When il crée un produit
  And il refait la même requête avec la même clé
  Then un seul produit existe en DB
  And les deux réponses sont identiques

Scenario: Même clé, payload différent
  Given une clé "idem-key-2" utilisée avec payload A
  When la même clé est utilisée avec payload B
  Then la requête échoue avec 409 IDEMPOTENCY_CONFLICT
```

## Order

### Créer une commande

```gherkin
Scenario: Commande réussie
  Given une cliente avec un panier de 2 articles
  When elle passe commande
  Then une Order est créée avec status PENDING
  And le stock est réservé
  And elle reçoit une notification

Scenario: Rollback si stock insuffisant
  Given un panier avec 2 articles dont 1 en rupture
  When elle passe commande
  Then la requête échoue avec 422 INSUFFICIENT_STOCK
  And aucun stock n'est réservé
  And aucune Order n'est créée
```

### Payer une commande

```gherkin
Scenario: Paiement Orange Money réussi
  Given une Order PENDING
  When le webhook Orange Money confirme le paiement
  Then l'Order passe à PAID
  And le stock est commité (quantity -= qty, reserved -= qty)
  And un email de confirmation est envoyé

Scenario: Webhook idempotent
  Given une Order déjà PAID
  When le même webhook est appelé à nouveau
  Then l'Order reste PAID
  And aucun stock n'est décrémenté à nouveau
```

### Annuler une commande

```gherkin
Scenario: Annulation avant paiement
  Given une Order PENDING
  When la cliente annule
  Then l'Order passe à CANCELLED
  And le stock est libéré

Scenario: Refus d'annulation après expédition
  Given une Order SHIPPED
  When la cliente tente d'annuler
  Then la requête échoue avec 422 INVALID_PRODUCT_STATE
```

## Review

```gherkin
Scenario: Laisser un avis après livraison
  Given une Order DELIVERED
  When la cliente laisse un avis 5 étoiles
  Then l'avis est créé avec isVerifiedPurchase=true
  And le professionnel reçoit une notification

Scenario: Refus d'avis sur commande non livrée
  Given une Order PENDING
  When la cliente tente de laisser un avis
  Then la requête échoue avec 422 INVALID_PRODUCT_STATE

Scenario: Un seul avis par commande
  Given une Order DELIVERED avec un avis existant
  When la cliente tente de laisser un second avis
  Then la requête échoue avec 409 DUPLICATE_REVIEW
```

## Service (Phase 2)

```gherkin
Scenario: Demander un devis
  Given une cliente
  And un service "Réparation de meuble"
  When elle demande un devis avec description
  Then un Quote est créé avec status PENDING
  And le professionnel reçoit une notification

Scenario: Accepter un devis crée une réservation
  Given un Quote avec status RESPONDED
  When la cliente accepte le devis
  Then un Booking est créé avec status CONFIRMED
  And le Quote passe à CONVERTED

Scenario: Refus si créneau déjà réservé
  Given un créneau déjà pris
  When la cliente accepte le devis pour ce créneau
  Then la requête échoue avec 409 BOOKING_CONFLICT
```

## Non-fonctionnels

```gherkin
Scenario: Temps de réponse API
  Given 100 requêtes POST /catalog/products
  When elles sont exécutées en séquence
  Then 95% ont une latence < 500ms

Scenario: Uptime
  Given une période de 30 jours
  When le service est monitoré en continu
  Then l'uptime est ≥ 99.5%

Scenario: Sécurité ownership
  Given un professionnel A et un professionnel B
  When A tente de modifier un produit de B
  Then la requête échoue avec 403 UNAUTHORIZED_STORE
  And l'action est loggée
```

## Matrice de couverture

| Domaine | Scénarios | Statut |
|---|---|---|
| Auth | 5 | 🟡 |
| Catalog | 10 | ✅ |
| Order | 8 | ❌ |
| Service | 4 | ❌ P2 |
| Review | 4 | ❌ |
| Non-fonctionnels | 3 | 🟡 |


---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 0.2.0 |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | 2026-10-11 |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| 2026-10-11 | 0.2.0 | Intégration vision place de marché hybride | — |
