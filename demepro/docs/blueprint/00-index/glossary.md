
# Glossaire

> **Section** : 00-index
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Termes métier

| Terme | Définition |
|---|---|
| **Vertical** | Secteur d'activité (ex : Artisans, Mode, Alimentation) |
| **Store** | Boutique en ligne d'un professionnel |
| **Product** | Produit physique vendu (bien tangible) |
| **Variant** | Déclinaison d'un produit (taille, couleur, etc.) |
| **SKU** | Stock Keeping Unit — identifiant unique d'une variante |
| **Inventory** | Stock d'un produit ou d'une variante |
| **Reserved** | Quantité réservée (paniers, commandes en cours) |
| **Available** | Stock disponible = `quantity - reserved` |
| **Order** | Commande passée par un client |
| **OrderItem** | Ligne de commande |
| **Payment** | Paiement d'une commande ou réservation |
| **Transaction** | Mouvement financier associé à un paiement |
| **Delivery** | Livraison physique d'une commande |
| **Review** | Avis laissé par un client après transaction |
| **Rating** | Note numérique (1-5 étoiles) |
| **Service** | Prestation proposée par un professionnel |
| **Quote** | Demande de devis pour un service |
| **QuoteResponse** | Réponse du professionnel à une demande de devis |
| **Booking** | Réservation d'un créneau de service |
| **Availability** | Créneau horaire où un service est disponible |
| **Professional** | Utilisateur avec un profil vérifié (vendeur / prestataire) |
| **Client** | Utilisateur acheteur |
| **KYC** | Know Your Customer — vérification d'identité |
| **Badge** | Marqueur visuel de vérification (✓ Pro, ✓ Business) |
| **Escrow** | Séquestre (paiement bloqué jusqu'à validation) |

## Termes techniques

| Terme | Définition |
|---|---|
| **ADR** | Architecture Decision Record |
| **Aggregate** | Groupe d'entités traitées comme une unité transactionnelle |
| **Bounded Context** | Frontière explicite d'un modèle de domaine |
| **CQRS** | Command Query Responsibility Segregation |
| **DDD** | Domain-Driven Design |
| **DI** | Dependency Injection |
| **DTO** | Data Transfer Object |
| **Domain Event** | Événement métier significatif |
| **Event Sourcing** | Stockage de l'état via une séquence d'événements |
| **FK** | Foreign Key |
| **Idempotence** | Propriété d'une opération qui peut être répétée sans effet |
| **JWT** | JSON Web Token |
| **Monolith** | Application déployée en un seul bloc |
| **Modular Monolith** | Monolithe organisé en modules faiblement couplés |
| **ORM** | Object-Relational Mapping |
| **Ownership** | Propriété d'une ressource par un utilisateur |
| **PII** | Personally Identifiable Information |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **RTO** | Recovery Time Objective |
| **RPO** | Recovery Point Objective |
| **Saga** | Pattern pour transactions distribuées |
| **Serializable** | Niveau d'isolation maximal en DB |
| **Soft Delete** | Suppression logique (marquage au lieu de suppression) |
| **TTL** | Time To Live |
| **UUID** | Universally Unique Identifier |
| **Value Object** | Objet immuable sans identité propre |

## Acronymes

| Acronyme | Signification |
|---|---|
| **ADR** | Architecture Decision Record |
| **API** | Application Programming Interface |
| **CDN** | Content Delivery Network |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **CRUD** | Create Read Update Delete |
| **DDD** | Domain-Driven Design |
| **DI** | Dependency Injection |
| **DTO** | Data Transfer Object |
| **ERD** | Entity-Relationship Diagram |
| **FK** | Foreign Key |
| **GMV** | Gross Merchandise Volume |
| **JWT** | JSON Web Token |
| **KYC** | Know Your Customer |
| **MoSCoW** | Must Should Could Won't |
| **MVP** | Minimum Viable Product |
| **NPS** | Net Promoter Score |
| **ORM** | Object-Relational Mapping |
| **PII** | Personally Identifiable Information |
| **PK** | Primary Key |
| **PWA** | Progressive Web App |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **RGPD** | Règlement Général sur la Protection des Données |
| **RICE** | Reach Impact Confidence Effort |
| **RPO** | Recovery Point Objective |
| **RTO** | Recovery Time Objective |
| **SaaS** | Software as a Service |
| **SKU** | Stock Keeping Unit |
| **TTL** | Time To Live |
| **UI** | User Interface |
| **UUID** | Universally Unique Identifier |
| **UX** | User Experience |
| **XOR** | Exclusive OR |

## Termes DɛmɛPro spécifiques

| Terme | Définition |
|---|---|
| **Acheter** | Flux de vente de produits physiques |
| **Trouver** | Flux de prestation de services |
| **DɛmɛPro** | Nom de la plateforme (bambara : « aider, soutenir ») |
| **Vertical** | Secteur d'activité (ARTISANS, MODE, etc.) |
| **Artisan** | Professionnel de l'artisanat (couturier, menuisier, etc.) |
| **Mobile Money** | Paiement via téléphone (Orange Money, Wave) |
| **SeaweedFS** | Système de stockage S3-compatible utilisé |

## Codes d'état

### Product.status
- **DRAFT** — Brouillon, non publié
- **ACTIVE** — Publié, achetable
- **OUT_OF_STOCK** — Rupture de stock
- **INACTIVE** — Désactivé
- **ARCHIVED** — Archivé (soft delete)

### Order.status
- **PENDING** — En attente de paiement
- **PAID** — Payée
- **SHIPPED** — Expédiée
- **DELIVERED** — Livrée
- **CANCELLED** — Annulée
- **REFUNDED** — Remboursée

### Payment.status
- **PENDING** — En attente
- **PROCESSING** — En cours
- **PAID** — Payé
- **FAILED** — Échoué
- **REFUNDED** — Remboursé
- **PARTIALLY_REFUNDED** — Partiellement remboursé

### Store.status
- **PENDING** — En attente de validation
- **ACTIVE** — Active
- **SUSPENDED** — Suspendue
- **CLOSED** — Fermée

### Quote.status (Phase 2)
- **PENDING** — En attente de réponse
- **RESPONDED** — Répondue
- **ACCEPTED** — Acceptée
- **REJECTED** — Refusée
- **EXPIRED** — Expirée
- **CONVERTED** — Convertie en réservation

### Booking.status (Phase 2)
- **CONFIRMED** — Confirmée
- **IN_PROGRESS** — En cours
- **COMPLETED** — Terminée
- **CANCELLED** — Annulée
- **NO_SHOW** — Client absent

## Rôles

| Rôle | Description |
|---|---|
| **VISITEUR** | Non authentifié |
| **CLIENT** | Acheteur authentifié |
| **PROFESSIONAL** | Vendeur / prestataire |
| **ADMIN** | Modérateur plateforme |
| **SUPER_ADMIN** | Super administrateur |


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
