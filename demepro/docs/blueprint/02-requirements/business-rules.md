
# Règles métier

> **Section** : 02-requirements
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Format

Chaque règle est identifiée par `BR-<MODULE>-<NUM>`.

## Catalog

**BR-CAT-001** — Cohérence hasVariants / price
- **Règle** : `hasVariants = true ⟹ price = null`
- **Règle** : `hasVariants = false ⟹ price ≠ null`
- **Violation** : `INVALID_PRODUCT_STATE` (422)

**BR-CAT-002** — Variante nécessite hasVariants
- **Règle** : Impossible de créer une variante si `hasVariants = false`
- **Violation** : `PRODUCT_HAS_NO_VARIANTS` (422)

**BR-CAT-003** — SKU unique global
- **Règle** : Aucun doublon de SKU sur `ProductVariant`
- **Violation** : `DUPLICATE_SKU` (409)

**BR-CAT-004** — Slug unique par store
- **Règle** : Deux produits d'un même store ne peuvent avoir le même slug
- **Violation** : `DUPLICATE_SLUG` (409)

**BR-CAT-005** — Une seule image primaire
- **Règle** : Au plus un `isPrimary = true` par produit
- **Violation** : impossible (garanti par service)

**BR-CAT-006** — Promotion automatique de la primaire
- **Règle** : Première image créée = primaire
- **Règle** : Suppression de la primaire → promotion suivante

**BR-CAT-007** — Stock réservé ≤ stock total
- **Règle** : `reserved <= quantity` toujours
- **Implémentation** : SQL atomique `UPDATE ... WHERE quantity - reserved >= qty`

**BR-CAT-008** — Suppression protégée par réservations
- **Règle** : Refus de suppression si `reserved > 0`
- **Violation** : `INVALID_INVENTORY_QUANTITY` (422)

**BR-CAT-009** — Dernière variante active protégée
- **Règle** : Impossible de désactiver la dernière variante active
- **Violation** : `LAST_ACTIVE_VARIANT` (422)

**BR-CAT-010** — Produit archivé immuable
- **Règle** : Refus de modification d'un produit ARCHIVED
- **Violation** : `INVALID_PRODUCT_STATE` (422)

## Store

**BR-STO-001** — Un propriétaire par boutique
- **Règle** : `store.professionalId` obligatoire

**BR-STO-002** — Slug unique global
- **Violation** : `DUPLICATE_SLUG` (409)

**BR-STO-003** — Activation par admin
- **Règle** : Passage à ACTIVE après vérification KYC

**BR-STO-004** — Suspension bloque les ventes
- **Règle** : Produits invisibles, commandes bloquées

## Order

**BR-ORD-001** — Réservation de stock atomique
- **Règle** : À la création d'une commande, réservation du stock
- **Règle** : Si une réservation échoue, tout est annulé (rollback)

**BR-ORD-002** — XOR OrderItem
- **Règle** : Un OrderItem référence soit un Product, soit un ProductVariant

**BR-ORD-003** — Snapshot obligatoire
- **Règle** : `productName`, `variantName`, `unitPrice` figés au moment de la commande

**BR-ORD-004** — Transitions contrôlées
- **Transitions** :
  - PENDING → PAID, CANCELLED
  - PAID → SHIPPED, CANCELLED, REFUNDED
  - SHIPPED → DELIVERED
  - DELIVERED → REFUNDED (< 30j)

**BR-ORD-005** — Annulation si PENDING ou PAID
- **Violation** : `INVALID_PRODUCT_STATE` si SHIPPED/DELIVERED

**BR-ORD-006** — Commit stock au paiement
- **Règle** : Décrémente `quantity` ET `reserved` atomiquement

**BR-ORD-007** — Idempotence
- **Règle** : Support de `Idempotency-Key` sur POST /orders

## Service (Phase 2)

**BR-SRV-001** — pricingModel cohérent
- **Règle** : FIXED/HOURLY → basePrice non null
- **Règle** : QUOTE → basePrice peut être null

**BR-SRV-002** — Availability cohérente
- **Récurrent** : dayOfWeek + startTime < endTime
- **Ponctuel** : specificDate non null

**BR-SRV-003** — Badge KYC requis
- **Règle** : Un professionnel doit être VERIFIED pour publier

## Quote (Phase 2)

**BR-QTE-001** — Expiration automatique
- **Règle** : TTL 7 jours par défaut

**BR-QTE-002** — Conversion atomique
- **Règle** : ACCEPTED → CONVERTED + création Booking dans une transaction

**BR-QTE-003** — Une seule réponse
- **Règle** : `QuoteResponse.quoteId` unique

## Booking (Phase 2)

**BR-BKG-001** — Créneau unique
- **Règle** : Contrainte sur `(serviceId, scheduledAt)`

**BR-BKG-002** — Fenêtre d'annulation
- **Règle** : Possible > 24h avant, refus dans les 24h

**BR-BKG-003** — Statuts terminaux
- **Règle** : COMPLETED, CANCELLED, NO_SHOW immuables

## Payment

**BR-PAY-001** — XOR Order / Booking
- **Règle** : Un paiement référence un Order OU un Booking

**BR-PAY-002** — providerRef unique
- **Règle** : Évite les doublons

**BR-PAY-003** — Cohérence montant
- **Règle** : `payment.amount = order.totalAmount`

**BR-PAY-004** — Webhooks sécurisés
- **Règle** : Signature vérifiée + idempotence

## Review

**BR-REV-001** — Un avis par commande
- **Règle** : Contrainte unique sur `orderId`

**BR-REV-002** — Avis après livraison
- **Règle** : `order.status = DELIVERED` requis

**BR-REV-003** — Note 1-5
- **Règle** : Validation Zod + contrainte DB

**BR-REV-004** — isVerifiedPurchase auto
- **Règle** : true si `orderId` ou `bookingId` non null

## Address

**BR-ADR-001** — Une adresse par défaut
- **Règle** : Contrainte sur `(userId, isDefault = true)`

**BR-ADR-002** — Suppression protégée
- **Règle** : Refus si une commande PENDING y est liée

## Auth & RBAC

**BR-AUTH-001** — Email unique
- **Règle** : Contrainte DB `@unique`

**BR-AUTH-002** — Mot de passe fort
- **Règle** : Min 12 caractères, hash bcrypt coût 12+

**BR-AUTH-003** — JWT expiration
- **Règle** : Access 15 min, refresh 7 jours

**BR-RBAC-001** — Permissions granulaires
- **Règle** : Format `<module>.<entity>.<action>`

**BR-RBAC-002** — Ownership vérifié
- **Règle** : Chaque opération vérifie `resource.ownerId === ctx.userId`

**BR-RBAC-003** — Admin tracé
- **Règle** : Toute action admin est loggée

## Idempotence

**BR-IDEM-001** — Clé composite
- **Règle** : `(key, scope)` unique en DB

**BR-IDEM-002** — TTL 24h
- **Règle** : Purge automatique des clés expirées

**BR-IDEM-003** — Payload différent = conflit
- **Règle** : Hash SHA-256 du body + `IDEMPOTENCY_CONFLICT`


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
