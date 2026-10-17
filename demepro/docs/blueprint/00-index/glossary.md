
# Glossaire

> **Section** : 00-index
> **Dernière mise à jour** : 2026-10-17

## Termes métier

| Terme | Définition |
|---|---|
| **Vertical** | Secteur d'activité (ex : Artisans, Mode) |
| **Store** | Boutique d'un professionnel (mono-boutique) |
| **Product** | Produit physique |
| **Variant** | Déclinaison d'un produit |
| **SKU** | Stock Keeping Unit |
| **Inventory** | Stock (quantity, reserved) |
| **Order** | Commande client |
| **Payment** | Paiement d'une commande |
| **Review** | Avis client (post-achat) |
| **Service** | Prestation (Phase 5) |
| **Quote** | Devis (Phase 5.2) |
| **Booking** | Réservation (Phase 5.3) |
| **Availability** | Créneaux disponibles (Phase 5.1) |
| **KYC** | Know Your Customer (vérification) |

## Statuts

### ProductStatus
DRAFT, ACTIVE, OUT_OF_STOCK, INACTIVE, ARCHIVED

### StoreStatus
DRAFT, ACTIVE, SUSPENDED, CLOSED

### OrderStatus
PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED

### PaymentStatus
PENDING, PROCESSING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED

### ServiceStatus
DRAFT, ACTIVE, INACTIVE, ARCHIVED

### VerificationLevel
BASIC, TRUSTED, CERTIFIED

### VerificationStatus
UNVERIFIED, PENDING, VERIFIED, REJECTED, EXPIRED

### QuoteStatus (Phase 5.2)
PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED, CONVERTED

### BookingStatus (Phase 5.3)
CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW

---

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| 2026-10-17 | 0.4.0 | Ajout Service, Quote, Booking, Availability, Verification | — |
