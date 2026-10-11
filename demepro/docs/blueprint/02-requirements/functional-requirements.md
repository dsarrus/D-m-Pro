
# Exigences fonctionnelles

> **Section** : 02-requirements
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Format

Chaque exigence est identifiée par `FR-XXX` :

> **FR-XXX** — [Titre]
> **Priorité** : Must / Should / Could / Won't (MoSCoW)
> **Description** : —
> **Critères d'acceptation** : —

## Module Auth

**FR-001** — Inscription utilisateur
- **Priorité** : Must
- **Description** : Un visiteur peut s'inscrire comme CLIENT ou
  PROFESSIONNEL avec email + mot de passe.
- **Critères** :
  - Email unique validé
  - Mot de passe hashé (bcrypt, coût 12+)
  - Confirmation par email (optionnel MVP)
  - Inscription en < 30 secondes

**FR-002** — Connexion utilisateur
- **Priorité** : Must
- **Critères** :
  - JWT access token (15 min)
  - Refresh token (7 jours)
  - Retourne 401 si credentials invalides

**FR-003** — Réinitialisation de mot de passe
- **Priorité** : Should
- **Critères** : Lien par email, token à usage unique, expiration 1h

## Module Catalog

**FR-010** — Créer un produit simple
- **Priorité** : Must
- **Critères** :
  - hasVariants=false → price obligatoire
  - slug unique par store
  - status initial = DRAFT

**FR-011** — Créer un produit avec variantes
- **Priorité** : Must
- **Critères** :
  - hasVariants=true → au moins 1 variante
  - price=null
  - SKU unique global
  - Transaction atomique

**FR-012** — Modifier un produit
- **Priorité** : Must
- **Critères** :
  - Refus si produit ARCHIVED
  - Vérif ownership

**FR-013** — Archiver un produit
- **Priorité** : Must
- **Critères** :
  - status=ARCHIVED
  - Toutes les variantes désactivées
  - Stock conservé

**FR-014** — Activer un produit
- **Priorité** : Must
- **Critères** :
  - Refus si pas de stock
  - Refus si ARCHIVED

**FR-015** — Ajouter une variante
- **Priorité** : Must
- **Critères** :
  - Uniquement si hasVariants=true
  - SKU unique global
  - Création d'inventaire automatique

**FR-016** — Ajouter des images
- **Priorité** : Must
- **Critères** :
  - Première image → primaire auto
  - Au plus 1 primaire par produit

**FR-017** — Réordonner les images
- **Priorité** : Should
- **Critères** : Liste ordonnée complète requise

## Module Store

**FR-020** — Créer une boutique
- **Priorité** : Must
- **Critères** :
  - Uniquement pour PROFESSIONAL
  - Slug unique global
  - Status initial = PENDING

**FR-021** — Activer une boutique
- **Priorité** : Must (admin)
- **Critères** : Après vérification KYC

**FR-022** — Suspendre une boutique
- **Priorité** : Should (admin)
- **Critères** : Produits invisibles, commandes bloquées

## Module Order

**FR-030** — Ajouter au panier
- **Priorité** : Must
- **Critères** :
  - Persistance serveur (ou localStorage au MVP)
  - Vérif stock disponible

**FR-031** — Passer commande
- **Priorité** : Must
- **Critères** :
  - Réservation atomique du stock
  - Idempotence supportée
  - Rollback complet si échec
  - Snapshot prix/nom

**FR-032** — Payer une commande
- **Priorité** : Must
- **Critères** :
  - Orange Money + Wave + cash
  - Webhook signé
  - Commit atomique du stock
  - Idempotence

**FR-033** — Voir ses commandes
- **Priorité** : Must
- **Critères** :
  - Uniquement ses propres commandes
  - Pagination

**FR-034** — Expédier une commande
- **Priorité** : Must (pro)
- **Critères** : Seulement si status=PAID

**FR-035** — Livrer une commande
- **Priorité** : Must (pro)
- **Critères** : Seulement si status=SHIPPED

**FR-036** — Annuler une commande
- **Priorité** : Should
- **Critères** :
  - Possible si PENDING ou PAID
  - Release du stock
  - Remboursement si PAID

## Module Service (Phase 2)

**FR-040** — Créer un service
- **Priorité** : Should (Phase 2)
- **Critères** : pricingModel cohérent

**FR-041** — Demander un devis
- **Priorité** : Should
- **Critères** : Description obligatoire, expiration 7j

**FR-042** — Répondre à un devis
- **Priorité** : Should
- **Critères** : Prix proposé + date

**FR-043** — Accepter un devis
- **Priorité** : Should
- **Critères** : Création automatique de Booking

**FR-044** — Réserver un créneau
- **Priorité** : Should
- **Critères** : Créneau unique, transaction atomique

## Module Review

**FR-050** — Laisser un avis
- **Priorité** : Must
- **Critères** :
  - Après livraison uniquement
  - 1 avis par commande
  - Note 1-5

**FR-051** — Voir les avis
- **Priorité** : Must
- **Critères** : Tri par date, pagination

**FR-052** — Signaler un avis
- **Priorité** : Should
- **Critères** : Raison obligatoire, modération admin

## Module Notification

**FR-060** — Notifications email
- **Priorité** : Must
- **Critères** :
  - Commande créée/expédiée/livrée
  - Paiement confirmé
  - Templates traduits

**FR-061** — Notifications SMS
- **Priorité** : Should
- **Critères** : Confirmations transactionnelles

## Priorités globales

| Priorité | Nb | % |
|---|---|---|
| Must | 25 | 68% |
| Should | 10 | 27% |
| Could | 2 | 5% |
| Won't (MVP) | — | — |


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
