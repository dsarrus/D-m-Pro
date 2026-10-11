
# ADR-008 — Marketplace hybride (Produits + Services)

- **Date** : 2026-10-11
- **Statut** : Accepté
- **Décideurs** : Équipe produit et technique
- **Consultés** : —

## Contexte

DɛmɛPro a été initialement conçu comme une plateforme e-commerce
classique (vente de produits physiques). Après une première phase de
construction (module Catalog complet, 142 tests), une réflexion
stratégique a révélé un besoin plus large :

Le consommateur malien a **deux intentions fondamentales** :
1. **ACHETER** un produit tangible
2. **TROUVER** un professionnel pour un service

Ces deux intentions sont aujourd'hui traitées par des canaux
**séparés** (Facebook, WhatsApp, bouche-à-oreille, marchés
physiques), sans plateforme unifiée.

**Question** : devons-nous étendre DɛmɛPro pour couvrir les deux
flux, ou rester sur le seul flux produits ?

## Décision

**Nous adoptons une architecture de marketplace hybride.**

DɛmɛPro couvrira les **deux flux** :

### Flux ACHETER (produits)
- Catalogue de produits physiques
- Variantes, stock, images
- Commande, paiement, livraison
- Avis produits

### Flux TROUVER (services)
- Portfolio de professionnels
- Services avec tarification (fixe, horaire, devis)
- Demande de devis
- Réservation de créneau
- Avis services / professionnels

### Infrastructure commune
- **Identité** (User, Role, KYC)
- **Paiement** (Orange Money, Wave, cash)
- **Avis** (mécanisme unifié)
- **Notification** (email, SMS, push)
- **Adresse** (livraison + intervention)

## Conséquences

### Positives

1. **Différenciation forte** — Aucun concurrent local ne couvre les
   deux flux.

2. **Effet réseau renforcé** — Les clients qui achètent peuvent aussi
   trouver des services (et inversement).

3. **Mutualisation des coûts** — Infrastructure de confiance,
   paiement, notifications partagées.

4. **Valeur pour les professionnels** — Un artisan peut vendre ses
   produits ET proposer des services.

5. **Vision long terme cohérente** — Positionnement de plateforme
   économique locale complète.

6. **Réutilisation du Catalog** — Le module Catalog est directement
   réutilisable (produits, images, avis).

### Négatives

1. **Complexité accrue** — Deux flux à concevoir, tester, maintenir.

2. **MVP plus tardif** — Le flux SERVICE doit être développé
   (Phase 2).

3. **Risque de dilution** — Ne pas exceller sur l'un ou l'autre.

4. **Coûts marketing** — Deux propositions de valeur à communiquer.

5. **Support client** — Deux cas d'usage à supporter.

### Neutres

1. **Architecture modulaire monolithique** — Déjà prévue, adaptée.

2. **Base de données PostgreSQL** — Peut gérer les deux flux.

3. **Frontend** — Deux parcours mais composants partagés.

## Stratégie de mise en œuvre

### Phase 1 — MVP ACHETER

- Finaliser Store, Category, Order, Payment
- Lancer le flux produits
- Valider le modèle économique

### Phase 2 — Extension TROUVER

- Ajouter Service, Quote, Booking
- Réutiliser l'infrastructure transverse
- Lancer le flux services

### Phase 3 — Écosystème

- Analytics avancé
- Programme de fidélité
- API publique

## Alternatives considérées

### Alternative 1 — Rester sur les produits uniquement

- **Avantages** : Focus, MVP plus rapide, moins de complexité
- **Inconvénients** : Perte de différenciation, marché plus étroit,
  concurrence internationale
- **Raison du rejet** : Nous croyons au potentiel de la marketplace
  hybride pour le marché malien

### Alternative 2 — Deux plateformes séparées

- **Avantages** : Spécialisation, MVP indépendants
- **Inconvénients** : Duplication infrastructure, pas d'effet réseau,
  complexité opérationnelle
- **Raison du rejet** : La valeur réside dans l'unification

### Alternative 3 — Commencer par les services

- **Avantages** : Différenciation immédiate
- **Inconvénients** : Module Catalog déjà 100% fait, perte de
  l'investissement
- **Raison du rejet** : Miser sur l'acquis

## Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Complexité de gestion | Élevée | Moyen | Modular monolith strict |
| MVP plus tardif | Moyenne | Moyen | Phase ACHETER d'abord |
| Dilution de la marque | Faible | Moyen | Deux propositions distinctes |
| Support client complexe | Moyenne | Faible | Formation, documentation |
| Difficulté à recruter | Faible | Faible | — |

## Métriques de succès

- **Phase 1** : 100 pros produits actifs, 500 commandes/mois
- **Phase 2** : 50 pros services actifs, 100 devis/mois
- **Phase 3** : GMV hybride > 250M FCFA/mois

## Implémentation technique

### Modifications DB

Ajouts :
- `services`, `service_images`, `service_zones`, `availabilities`
- `quotes`, `quote_responses`
- `bookings`
- `reviews` étendu (target polymorphique)
- `payments` étendu (XOR order/booking)

### Modifications API

Nouveaux modules :
- `service`, `quote`, `booking`

Endpoints Phase 2 :
- `POST /services`, `GET /services`, ...
- `POST /quotes`, `POST /quotes/:id/respond`, ...
- `POST /bookings`, ...

### Modifications Frontend

Pages nouvelles :
- Liste des services
- Détail d'un service
- Portfolio professionnel
- Demande de devis
- Réservation de créneau
- Mes réservations

## Références

- [Vision produit](../01-product/vision.md)
- [Domain Overview](../03-domain/domain-overview.md)
- [Roadmap](../12-roadmap/roadmap.md)

---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 1.0.0 |
| Statut | ✅ Accepté |
| Dernière mise à jour | 2026-10-11 |
