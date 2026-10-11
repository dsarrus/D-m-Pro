
# Milestones

> **Section** : 12-roadmap
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Vue d'ensemble

```
M1 ── Catalog validé           ✅ ATTEINT
M2 ── MVP ACHETER              ⏭️ EN COURS
M3 ── MVP TROUVER              ⏭️ PRÉVU
M4 ── Beta fermée              ⏭️ PRÉVU
M5 ── GA (production)          ⏭️ PRÉVU
M6 ── Rentabilité              ⏭️ PRÉVU
```

## M1 — Catalog validé ✅

**Date d'atteinte** : 2026-10-11

**Livrables** :
- [x] ProductService + VariantService + ImageService + InventoryService
- [x] IdempotencyService
- [x] Contraintes DB critiques
- [x] 142 tests verts (97 intégration + 45 E2E)
- [x] Documentation blueprint (13 sections)

**Métriques** :
- 142 tests
- 100% de couverture sur les services Catalog
- Zéro bug critique
- Performance : p95 < 500ms

**Critères de sortie** : tous atteints ✅

## M2 — MVP ACHETER ⏭️

**Date cible** : À définir (estimé 2-3 mois)

**Livrables** :
- [ ] StoreService + Controller
- [ ] CategoryService + Controller
- [ ] OrderService + cycle de vie
- [ ] PaymentService + Orange Money + Wave
- [ ] ReviewService
- [ ] AddressService
- [ ] NotificationService (email + SMS)
- [ ] Frontend web client (catalogue + panier + checkout)
- [ ] Tests E2E complets

**Métriques de succès** :
- 5-10 professionnels pilotes
- 20-30 clients testeurs
- 50 commandes réelles
- NPS > 30
- Taux de rétention client M1 > 40%

**Critères de sortie** :
- [ ] Parcours complet : créer boutique → produit → commande → paiement → livraison → avis
- [ ] Zéro bug critique pendant 2 semaines
- [ ] Uptime > 99.5%

**Risques** :
- Complexité Payment
- Adoption pro lente
- Logistique de livraison

## M3 — MVP TROUVER ⏭️

**Date cible** : 2-3 mois après M2

**Livrables** :
- [ ] ServiceService + portfolio
- [ ] QuoteService (demande + réponse)
- [ ] BookingService (réservation)
- [ ] Intégration Payment (booking)
- [ ] Extension Review (services)
- [ ] Frontend : recherche services, devis, réservation

**Métriques de succès** :
- 5-10 professionnels services pilotes
- 20 demandes de devis
- 10 réservations complétées
- NPS services > 30

**Critères de sortie** :
- [ ] Parcours complet : créer service → demande → devis → réservation → avis
- [ ] Taux de conversion devis > 30%
- [ ] Taux de réalisation > 70%

## M4 — Beta fermée ⏭️

**Date cible** : après M3

**Livrables** :
- [ ] Tous les modules MVP
- [ ] Frontend web complet
- [ ] Backoffice admin
- [ ] Monitoring complet
- [ ] Support client en place

**Métriques de succès** :
- 20 professionnels actifs
- 100 clients actifs
- 200 commandes + 50 services
- NPS global > 35
- Taux de rétention pro M3 > 60%

**Critères de sortie** :
- [ ] Zéro bug bloquant
- [ ] Documentation complète
- [ ] Formation des pros pilotes

## M5 — GA (General Availability) ⏭️

**Date cible** : après M4

**Livrables** :
- [ ] Ouverture publique
- [ ] Marketing actif (réseaux, radio, influence)
- [ ] Support multi-canal (WhatsApp + email + SMS)
- [ ] Monitoring + alerting production
- [ ] Infrastructure scalée

**Métriques de succès** :
- 100 professionnels actifs
- 2 000 clients actifs
- 500 commandes/mois
- 10 M FCFA GMV mensuel
- Uptime > 99.9%

**Critères de sortie** :
- [ ] Critères d'adoption MVP atteints
- [ ] Break-even opérationnel
- [ ] Équipe formée

## M6 — Rentabilité ⏭️

**Date cible** : 12-18 mois après GA

**Métriques de succès** :
- 2 000 professionnels actifs
- 60 000 clients actifs
- 250 M FCFA GMV mensuel
- Résultat net ≈ 0 (break-even financier)
- NPS > 50

**Critères de sortie** :
- [ ] Break-even financier atteint
- [ ] Levée de fonds Série A ou autofinancement
- [ ] Préparation expansion géographique

## Jalons intermédiaires

| Jalon | Description | Phase |
|---|---|---|
| J1 | Premier produit publié | ✅ |
| J2 | Premier test E2E vert | ✅ |
| J3 | 100 tests d'intégration | ✅ |
| J4 | Store + Category complets | Phase 3 |
| J5 | Première commande réelle | Phase 4 |
| J6 | Premier paiement Orange Money | Phase 4 |
| J7 | Premier avis publié | Phase 6 |
| J8 | Premier devis envoyé | Phase 5 |
| J9 | Première réservation | Phase 5 |
| J10 | 1 000 utilisateurs | Phase 8 |

## Critères de passage entre jalons

### M1 → M2

- [x] Catalog 100% fonctionnel
- [x] Tests verts
- [x] Documentation complète
- [ ] Décision go/no-go sur la suite

### M2 → M3

- [ ] MVP ACHETER validé en beta
- [ ] 50 commandes réelles
- [ ] NPS client > 30
- [ ] Décision go/no-go sur les services

### M3 → M4

- [ ] MVP TROUVER validé
- [ ] 10 réservations complétées
- [ ] NPS services > 30
- [ ] Préparation beta fermée

### M4 → M5

- [ ] Beta fermée validée
- [ ] 200 utilisateurs actifs
- [ ] Zéro bug bloquant
- [ ] Préparation GA

### M5 → M6

- [ ] GA stable
- [ ] 2 000 utilisateurs actifs
- [ ] Revenus mensuels > 300 K FCFA
- [ ] Préparation scale


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
