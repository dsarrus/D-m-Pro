
# Règles de domaine

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Introduction

Les **règles de domaine** sont les contraintes invariantes qui
gouvernent le comportement du système. Elles s'appliquent
**indépendamment** de l'interface (API, admin, CLI) et sont
**garanties au niveau** :

1. **DTO** (validation Zod)
2. **Service** (logique métier)
3. **Base de données** (contraintes SQL)

**Une règle violée = une erreur métier explicite.**

## Règles transverses

### RT-001 — Ownership strict

**Règle** : Un acteur ne peut agir que sur les ressources dont il
est propriétaire.

**Implémentation** :
- Vérification systématique dans les services
- Erreur `UNAUTHORIZED_STORE` (403)
- Ne jamais se fier au client

```typescript
if (product.store.professional.userId !== ctx.userId) {
  throw new CatalogError(
    CatalogErrorCode.UNAUTHORIZED_STORE,
    "Vous n'êtes pas autorisé à modifier ce produit.",
  );
}
```

### RT-002 — Idempotence des créations sensibles

**Règle** : Toute création sensible (produit, commande, paiement)
supporte une clé d'idempotence.

**Implémentation** :
- Header `Idempotency-Key` optionnel
- Clé composite `(key, scope)` en DB
- TTL 24h
- Détection de payload différent → `IDEMPOTENCY_CONFLICT`

### RT-003 — Atomicité des opérations multi-tables

**Règle** : Toute opération touchant plusieurs tables est
transactionnelle.

**Implémentation** :
- `prisma.$transaction` obligatoire
- Isolation `Serializable` pour les écritures critiques
- Retry automatique sur P2034

### RT-004 — Validation à 3 niveaux

**Règle** : Toute entrée est validée à 3 niveaux :

1. **DTO Zod** — format, type, champs requis
2. **Service** — règles métier (unicité, état, ownership)
3. **DB** — contraintes (`@unique`, `CHECK`, FK)

```
Client ──► [DTO Zod] ──► [Service] ──► [DB]
              │             │            │
              ▼             ▼            ▼
            400           4xx         Erreur DB
                                      (rollback)
```

### RT-005 — Traçabilité des modifications

**Règle** : Les entités critiques (Order, Payment) ont un historique
de leurs transitions d'état.

**Implémentation** :
- Table `OrderStatusHistory`
- Chaque transition est enregistrée
- Champ `changedBy` pour audit

### RT-006 — Erreurs typées avec codes métier

**Règle** : Toute erreur métier a un **code** stable et un **status
HTTP** cohérent.

**Implémentation** :
- `CatalogError` centralisée
- Mapping code → status HTTP automatique
- Jamais de message technique exposé au client

### RT-007 — Soft delete par défaut

**Règle** : Les entités critiques ne sont **jamais** supprimées
physiquement.

**Implémentation** :
- Champ `status = ARCHIVED` ou `deletedAt`
- Filtres par défaut excluant les archivés
- Hard delete uniquement sur demande explicite (RGPD, admin)

## Règles par domaine

### Catalog

#### RC-001 — hasVariants et price sont cohérents

```
Si hasVariants = true  ⟹ price = null
Si hasVariants = false ⟹ price ≠ null
```

#### RC-002 — Une variante n'existe que si hasVariants = true

Impossible de créer une variante sur un produit `hasVariants = false`.

#### RC-003 — SKU unique global

Aucun doublon de SKU sur l'ensemble des variantes.

**Contraintes** :
- Vérification applicative (service)
- Contrainte DB (`@unique`)
- Retry sur P2002 (concurrence)

#### RC-004 — Slug unique par store

Deux produits d'une même boutique ne peuvent avoir le même slug.

#### RC-005 — Une seule image primaire par produit

Au plus un `isPrimary = true` par produit.

#### RC-006 — Première image devient primaire automatiquement

Si aucune image primaire n'existe, la première créée devient primaire.

#### RC-007 — Suppression d'image primaire promeut la suivante

Promotion automatique pour éviter l'absence de primaire.

#### RC-008 — Stock réservé ≤ stock total

`reserved <= quantity` toujours garanti par SQL atomique.

#### RC-009 — Annulation impossible si réservations actives

Un produit avec `reserved > 0` ne peut pas être supprimé.

#### RC-010 — Impossible de désactiver la dernière variante active

Garantit qu'un produit publié a toujours au moins une variante active.

#### RC-011 — Un produit archivé ne peut plus être modifié

Sauf pour le restaurer (explicitement).

### Store

#### RS-001 — Une boutique a un propriétaire unique

`store.professionalId` non null, ownership vérifié à chaque opération.

#### RS-002 — Slug unique global

Pas deux boutiques avec le même slug dans tout DɛmɛPro.

#### RS-003 — Statut contrôlé par admin

Passage à ACTIVE uniquement après vérification KYC.

#### RS-004 — Une boutique suspendue ne peut plus vendre

Produits invisibles aux clients, nouvelles commandes bloquées.

### Order

#### RO-001 — Une commande réserve le stock

À la création, le stock est **réservé** (atomique).

#### RO-002 — Un OrderItem référence un produit OU une variante

XOR strict.

#### RO-003 — Snapshot du prix et du nom

Le prix et le nom sont figés au moment de la commande.

#### RO-004 — Transitions d'état contrôlées

Seules les transitions autorisées sont permises.

#### RO-005 — Annulation possible si PENDING ou PAID

Refus si SHIPPED ou DELIVERED.

#### RO-006 — Remboursement possible si PAID ou DELIVERED (< 30j)

Fenêtre de 30 jours après livraison.

#### RO-007 — Commit du stock au paiement

Décrémente `quantity` ET `reserved` atomiquement.

### Service (Phase 2)

#### RV-001 — pricingModel cohérent avec basePrice

- FIXED ou HOURLY → `basePrice ≠ null`
- QUOTE → `basePrice` peut être null

#### RV-002 — Availability cohérente

- Récurrent → `dayOfWeek`, `startTime < endTime`
- Ponctuel → `specificDate` non null

#### RV-003 — Un professionnel vérifié peut publier des services

Badge KYC requis.

### Quote (Phase 2)

#### RQ-001 — Un devis expire

TTL par défaut : 7 jours.

#### RQ-002 — Un devis accepté crée un Booking

Transaction atomique : `ACCEPTED → CONVERTED` + création Booking.

#### RQ-003 — Une seule réponse par devis

`QuoteResponse.quoteId` unique.

### Booking (Phase 2)

#### RB-001 — Un créneau ne peut être réservé qu'une fois

Contrainte sur `(serviceId, scheduledAt)`.

#### RB-002 — Annulation possible > 24h avant

Refus dans les 24 dernières heures (sauf accord du pro).

#### RB-003 — Statuts finaux non modifiables

`COMPLETED`, `CANCELLED`, `NO_SHOW` sont terminaux.

### Payment

#### RP-001 — XOR entre Order et Booking

Un paiement référence soit une commande, soit une réservation.

#### RP-002 — providerRef unique

Évite les doublons de paiement.

#### RP-003 — Cohérence du montant

`payment.amount = order.totalAmount` (ou booking.totalAmount).

#### RP-004 — Webhooks signés et idempotents

Vérification de signature + idempotence.

### Review

#### RR-001 — Un avis par commande/réservation

Contrainte unique.

#### RR-002 — Avis uniquement après livraison

`order.status = DELIVERED`.

#### RR-003 — Note entre 1 et 5

Validation Zod.

#### RR-004 — isVerifiedPurchase automatique

Si `orderId` ou `bookingId` non null.

### Address

#### RA-001 — Une seule adresse par défaut par user

Contrainte sur `(userId, isDefault = true)`.

#### RA-002 — Adresse supprimable si pas utilisée

Refus si une commande PENDING y est liée.

## Matrice de validation

| Règle | DTO | Service | DB | Test |
|---|---|---|---|---|
| RT-001 Ownership | — | ✅ | FK | ✅ |
| RT-002 Idempotence | — | ✅ | unique | ✅ |
| RT-003 Atomicité | — | ✅ | tx | ✅ |
| RT-004 Validation 3 niveaux | ✅ | ✅ | ✅ | ✅ |
| RT-005 Traçabilité | — | ✅ | table | ✅ |
| RT-006 Erreurs typées | — | ✅ | — | ✅ |
| RT-007 Soft delete | — | ✅ | status | ✅ |
| RC-001 hasVariants/price | ✅ | ✅ | — | ✅ |
| RC-002 Variante/hasVariants | — | ✅ | — | ✅ |
| RC-003 SKU unique | — | ✅ | unique | ✅ |
| RC-004 Slug unique store | — | ✅ | unique | ✅ |
| RC-005 Image primaire | ✅ | ✅ | — | ✅ |
| RC-006 Première image | — | ✅ | — | ✅ |
| RC-007 Promotion primaire | — | ✅ | — | ✅ |
| RC-008 reserved ≤ quantity | — | ✅ | CHECK + SQL | ✅ |
| RC-009 Réservations actives | — | ✅ | — | ✅ |
| RC-010 Dernière variante | — | ✅ | — | ✅ |
| RC-011 Produit archivé | — | ✅ | — | ✅ |
| RO-001 Réservation stock | — | ✅ | tx | ✅ |
| RO-002 XOR OrderItem | ✅ | ✅ | — | ✅ |
| RO-003 Snapshot | — | ✅ | — | ✅ |
| RO-004 Transitions | — | ✅ | — | ✅ |
| RO-005 Annulation | — | ✅ | — | ✅ |
| RO-006 Remboursement | — | ✅ | — | ✅ |
| RO-007 Commit stock | — | ✅ | SQL | ✅ |

## Implémentation centralisée

### Constantes

```typescript
// apps/api/src/modules/<module>/domain/rules.ts

export const RESERVATION_TIMEOUT_MINUTES = 15;
export const REFUND_WINDOW_DAYS = 30;
export const QUOTE_EXPIRY_DAYS = 7;
export const CANCELLATION_WINDOW_HOURS = 24;
export const IDEMPOTENCY_TTL_HOURS = 24;
```

### Fonctions d'assertion

```typescript
export function assertOwnership(
  resource: { ownerId: string },
  ctx: AuthContext,
): void {
  if (resource.ownerId !== ctx.userId) {
    throw new CatalogError(
      CatalogErrorCode.UNAUTHORIZED_STORE,
      "Non autorisé.",
    );
  }
}

export function assertHasVariantsConsistency(
  hasVariants: boolean,
  price: number | null,
): void {
  if (hasVariants && price !== null) {
    throw new CatalogError(
      CatalogErrorCode.INVALID_PRODUCT_STATE,
      "Un produit à variantes ne doit pas avoir de prix direct.",
    );
  }
  if (!hasVariants && price === null) {
    throw new CatalogError(
      CatalogErrorCode.INVALID_PRODUCT_STATE,
      "Un produit simple doit avoir un prix.",
    );
  }
}
```

## Tests des règles

Chaque règle a **au moins un test** :

```typescript
describe("RC-008 — reserved <= quantity", () => {
  it("respecte l'invariant sous concurrence", async () => {
    // ... 10 réservations simultanées
    expect(inv.reserved).toBeLessThanOrEqual(inv.quantity);
  });
});
```


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
