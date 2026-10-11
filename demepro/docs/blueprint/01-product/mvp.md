
# MVP (Minimum Viable Product)

> **Section** : 01-product
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Définition du MVP

Le MVP de DɛmɛPro est une **place de marché hybride** permettant à :

1. Un **professionnel** de créer une boutique, publier des produits,
   gérer son stock, et recevoir des commandes.
2. Un **client** de parcourir les produits, commander, payer, et
   laisser un avis.

Le MVP **couvre uniquement le flux ACHETER**. Le flux TROUVER
(services) est **explicitement exclu** du MVP et reporté en phase 2.

**Objectif** : valider le modèle économique et l'adoption du flux
produit avant d'investir dans la complexité des services.

## Périmètre du MVP

### Inclus (Phase 1 — ACHETER)

#### 🔐 Authentification & comptes
- [x] Inscription (client, professionnel)
- [x] Connexion / déconnexion
- [x] Gestion du profil de base
- [x] Rôles et permissions

#### 🏪 Boutique
- [ ] Créer une boutique
- [ ] Modifier sa boutique
- [ ] Activer / suspendre
- [ ] Voir ses statistiques

#### 📦 Catalogue
- [x] Créer un produit simple
- [x] Créer un produit à variantes
- [x] Modifier un produit
- [x] Archiver / supprimer
- [x] Activer un produit
- [x] Gérer les variantes
- [x] Gérer les images
- [x] Gérer le stock

#### 🛒 Navigation client
- [x] Parcourir les catégories
- [x] Voir la liste des produits
- [x] Voir le détail d'un produit
- [x] Voir les boutiques
- [ ] Rechercher un produit

#### 🛍️ Panier & commande
- [ ] Ajouter au panier
- [ ] Modifier les quantités
- [ ] Passer commande
- [ ] Choisir une adresse
- [ ] Choisir un mode de paiement

#### 💳 Paiement
- [ ] Orange Money
- [ ] Wave
- [ ] Paiement à la livraison
- [ ] Webhook de confirmation

#### 📋 Suivi de commande
- [ ] Voir mes commandes
- [ ] Changer le statut
- [ ] Annuler une commande

#### ⭐ Avis
- [ ] Laisser un avis
- [ ] Voir les avis

#### 🔔 Notifications
- [ ] Email transactionnel
- [ ] SMS transactionnel

#### 🛠️ Administration
- [ ] Vérifier les pros
- [ ] Suspendre une boutique
- [ ] Tableau de bord

### Exclus du MVP (backlog Phase 2+)

- Flux TROUVER (services)
- Livraison gérée par la plateforme
- Portefeuille professionnel
- Application mobile native
- Multi-langue
- Analytics avancé
- Programme de fidélité

## User stories critiques

### Authentification
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-001 | Visiteur | M'inscrire client | Acheter | P0 |
| US-002 | Visiteur | M'inscrire pro | Vendre | P0 |
| US-003 | Utilisateur | Me connecter | Accéder | P0 |

### Catalogue
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-020 | Pro | Créer un produit simple | Le rendre visible | P0 |
| US-021 | Pro | Créer un produit à variantes | Proposer options | P0 |
| US-022 | Pro | Uploader photos | Montrer | P0 |
| US-023 | Pro | Définir prix et stock | Vendre | P0 |

### Navigation client
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-030 | Client | Parcourir par catégorie | Découvrir | P0 |
| US-031 | Client | Voir le détail d'un produit | Décider | P0 |
| US-032 | Client | Voir les variantes | Choisir | P0 |

### Commande
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-040 | Client | Ajouter au panier | Commander | P0 |
| US-042 | Client | Passer commande | Acheter | P0 |
| US-043 | Client | Choisir une adresse | Être livré | P0 |

### Paiement
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-050 | Client | Payer avec Orange Money | Régler | P0 |
| US-051 | Client | Payer avec Wave | Choisir | P0 |

### Suivi
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-060 | Client | Voir mes commandes | Suivre | P0 |
| US-062 | Pro | Voir les commandes reçues | Traiter | P0 |
| US-063 | Pro | Marquer comme expédiée | Informer | P0 |

## Critères de sortie du MVP

### Fonctionnels
- [ ] Un professionnel peut créer sa boutique et publier 3 produits
      minimum en moins de 10 minutes
- [ ] Un client peut commander, payer et suivre sa commande
- [ ] Le flux réservation → commit → livraison est testé sous
      concurrence
- [ ] Les avis vérifiés fonctionnent
- [ ] Les notifications email partent à chaque étape

### Techniques
- [ ] Zéro bug critique pendant 2 semaines
- [ ] 95%+ de tests passent en CI
- [ ] Temps de réponse API < 500ms en p95
- [ ] Uptime > 99% sur 30 jours

### Adoption
- [ ] 50 professionnels actifs
- [ ] 200 clients inscrits
- [ ] 100 commandes complétées
- [ ] Taux de satisfaction > 4/5

## Timeline

| Phase | Durée | Livrable |
|---|---|---|
| Alpha | 4-6 semaines | Version testée en interne |
| Beta | 4-6 semaines | 5-10 pros pilotes, 20-30 clients |
| GA | continue | Ouverture publique |

## Ce qui suit le MVP

**Phase 2 — SERVICES** :
- Service (portfolio)
- Availability (créneaux)
- Quote (devis)
- Booking (réservation)

**Phase 3 — Écosystème** :
- Programme de fidélité
- Mobile natif
- Analytics avancé

## Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Adoption lente des pros | Moyenne | Élevé | Onboarding accompagné |
| Complexité paiement mobile | Moyenne | Élevé | Partenariats directs |
| Concurrence internationale | Faible | Moyen | Ancrage local |
| Logistique de livraison | Élevée | Moyen | Gérée par le pro |
| Bugs critiques en prod | Faible | Élevé | Tests E2E, staging |
| Manque de confiance | Moyenne | Élevé | Avis vérifiés |


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
