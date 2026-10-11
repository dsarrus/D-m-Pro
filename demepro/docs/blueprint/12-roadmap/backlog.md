
# Backlog

> **Section** : 12-roadmap
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Priorité P0 — Critique (bloquant MVP)

### Phase 3 — Store + Category
- [ ] StoreService (CRUD + statuts)
- [ ] StoreController + routes
- [ ] CategoryService (hiérarchie)
- [ ] CategoryController + routes
- [ ] Tests d'intégration

### Phase 4 — Order + Payment
- [ ] OrderService (création atomique)
- [ ] Cycle de vie order
- [ ] PaymentService (Orange Money)
- [ ] PaymentService (Wave)
- [ ] Webhooks sécurisés
- [ ] DeliveryService
- [ ] Tests concurrence

### Phase 6 — Transverse minimal
- [ ] AddressService
- [ ] ReviewService (produits uniquement)
- [ ] NotificationService (email)

### Phase 8 — Frontend MVP
- [ ] Next.js setup
- [ ] Pages catalogue
- [ ] Panier + checkout
- [ ] Authentification UI
- [ ] Dashboard pro minimal

## Priorité P1 — Important (valeur utilisateur)

### Phase 5 — Service (TROUVER)
- [ ] ServiceService + portfolio
- [ ] QuoteService (devis)
- [ ] BookingService (réservation)
- [ ] Intégration Payment (booking)

### Phase 6 — Transverse étendu
- [ ] ReviewService (services)
- [ ] ReviewReportService
- [ ] NotificationService (SMS, push)
- [ ] Templates email
- [ ] Scheduler (cron)

### Phase 8 — Frontend étendu
- [ ] Recherche de services
- [ ] Demande de devis
- [ ] Réservation de créneau
- [ ] Backoffice admin

## Priorité P2 — Nice to have

### Fonctionnalités avancées
- [ ] Recherche full-text
- [ ] Filtres avancés
- [ ] Recommandations personnalisées
- [ ] Programme de fidélité
- [ ] Parrainage
- [ ] Coupons et promotions

### Analytics
- [ ] Dashboard professionnel avancé
- [ ] Rapports exportables
- [ ] Tendances et prédictions
- [ ] A/B testing infrastructure

### Communication
- [ ] Chat interne (client ↔ pro)
- [ ] Notifications push mobile
- [ ] Templates personnalisables

### Mobile
- [ ] PWA (Progressive Web App)
- [ ] Application React Native
- [ ] Notifications push natives

### Infrastructure
- [ ] Cache Redis (lectures)
- [ ] Read replicas (Phase 3)
- [ ] CDN images
- [ ] Multi-région (Phase 4)

## Priorité P3 — Idées futures

- [ ] Multi-langue (bambara, anglais)
- [ ] Multi-devises
- [ ] Extension géographique (Sénégal, Côte d'Ivoire, Burkina)
- [ ] Marketplace de gros (B2B)
- [ ] API publique
- [ ] Marketplace de partenaires
- [ ] Formation en ligne
- [ ] Assurance transactionnelle
- [ ] Financement des pros (micro-crédit)
- [ ] Avance de trésorerie

## Dette technique

### À adresser en priorité

- [ ] Uniformiser `errors/` (kebab-case partout)
- [ ] Uniformiser `dtos/` vs `dto/`
- [ ] Extraire `withSerializableRetry` en utilitaire partagé
- [ ] Extraire `AuthContext` en type global
- [ ] Retirer warning `__dirname` Vitest
- [ ] Retirer warning `poolOptions` Vitest 4+
- [ ] Améliorer `truncateAll` (plus sélectif)
- [ ] Documentation inline (JSDoc)

### À surveiller

- [ ] Couverture de tests > 80%
- [ ] Complexité cyclomatique < 10
- [ ] Duplication < 3%
- [ ] Bundle size (frontend)

## Idées non structurées

### Améliorations UX
- Onboarding interactif pour pros
- Guide de démarrage pour clients
- Tour guidé première visite
- Notifications intelligentes (fréquence adaptée)
- Recherche vocale (bambara)

### Modèle économique
- Abonnement annuel (réduction)
- Sponsoring de catégories
- Publicités ciblées (non intrusives)
- Certification pro premium
- Formation payante

### Partenariats
- Chambre des métiers
- Coopératives d'artisans
- Opérateurs mobile money
- ONG et bailleurs (impact social)
- Institutions financières (paiement)

## Roadmap des versions

| Version | Contenu | Date cible |
|---|---|---|
| 0.1.0 | Foundation | ✅ |
| 0.2.0 | Catalog | ✅ |
| 0.3.0 | Store + Category | À venir |
| 0.4.0 | Order + Payment | À venir |
| 0.5.0 | Service (TROUVER) | À venir |
| 0.6.0 | Transverse | À venir |
| 0.7.0 | Analytics | À venir |
| 1.0.0 | MVP complet | À venir |

## Méthodologie de priorisation

### Framework RICE

**R**each (portée) × **I**mpact × **C**onfidence / **E**ffort

| Feature | Reach | Impact | Conf. | Effort | Score |
|---|---|---|---|---|---|
| Order + Payment | Élevé | Élevé | Élevé | Élevé | Prioritaire |
| Service | Élevé | Élevé | Moyen | Élevé | Haut |
| Frontend | Élevé | Élevé | Élevé | Très élevé | Prioritaire |
| Analytics | Moyen | Moyen | Élevé | Moyen | Moyen |
| Programme fidélité | Moyen | Moyen | Faible | Moyen | Faible |

### Règles de priorisation

1. **Bloquer le MVP** → P0
2. **Valeur utilisateur directe** → P1
3. **Différenciation** → P1
4. **Optimisation** → P2
5. **Nice to have** → P3

## Prochaine action immédiate

**P0** : Commencer la Phase 3 (Store + Category).

Voir [roadmap.md](./roadmap.md) pour la séquence complète.


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
