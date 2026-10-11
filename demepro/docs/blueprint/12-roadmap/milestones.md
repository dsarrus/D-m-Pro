
# Milestones

> **Section** : 12-roadmap
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Vue d'ensemble

```
M1 ── Catalog validé           ✅ ATTEINT
M2 ── Store + Category + KYC   ✅ ATTEINT
M3 ── Order + Payment          ⏭️ PROCHAIN
M4 ── Transverse (Review, Notif) ⏭️ PRÉVU
M5 ── MVP ACHETER (beta)       ⏭️ PRÉVU
M6 ── Service (TROUVER)        ⏭️ PRÉVU
M7 ── GA (production)          ⏭️ PRÉVU
M8 ── Rentabilité              ⏭️ PRÉVU
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

## M2 — Store + Category + KYC progressif ✅

**Date d'atteinte** : 2026-10-11

**Livrables** :
- [x] StoreService (mono-boutique par professionnel)
- [x] StoreController + routes (public + pro + admin)
- [x] CategoryService (hiérarchie 3 niveaux max, admin-only)
- [x] CategoryController + routes (public read, admin write)
- [x] VerificationService (progressif : BASIC → TRUSTED → CERTIFIED)
- [x] VerificationController + routes
- [x] Modification `Store.activateStore` (Phase 1 : téléphone confirmé)
- [x] Migration Prisma `progressive_verification`
- [x] Contrainte `@unique` sur `Store.professionalId`
- [x] 48 tests supplémentaires (41 Store + 43 Category + 13 Verification)

**Décisions structurantes** :
- **Mono-boutique stricte** — Un professionnel = une boutique (Option 1)
- **KYC progressif** — Le KYC strict est inadapté au marché malien
- **3 niveaux de confiance** :
  - BASIC : inscription + téléphone confirmé
  - TRUSTED : selfie + 3 transactions réussies (auto-validé)
  - CERTIFIED : KYC optionnel + validation admin
- **Hiérarchie 3 niveaux max** — Couvre 99% des besoins
- **Admin-only** pour Category — Donnée de référence

**Métriques** :
- 229 tests au total (142 Catalog + 87 Phase 3)
- Couverture > 90%
- Zéro bug critique
- Durée d'exécution : ~81s

**Critères de sortie** : tous atteints ✅

## M3 — Order + Payment ⏭️

**Date cible** : À définir (estimé 3-4 semaines)

**Objectif** : Premier flux transactionnel complet (ACHETER).

**Livrables** :
- [ ] OrderService (création atomique + réservation stock)
- [ ] OrderItem + snapshots prix/nom
- [ ] OrderStatusHistory (audit trail)
- [ ] Cycle de vie : PENDING → PAID → SHIPPED → DELIVERED
- [ ] Annulation (release stock + refund si PAID)
- [ ] PaymentService
- [ ] Intégration Orange Money (provider mocké au début)
- [ ] Intégration Wave (provider mocké au début)
- [ ] Webhooks signés + idempotents
- [ ] DeliveryService
- [ ] OrderController + PaymentController + routes
- [ ] Tests de concurrence (10 commandes simultanées sur le dernier article)
- [ ] Tests E2E du parcours complet

**Métriques de succès** :
- 30-50 tests supplémentaires
- Parcours : créer commande → payer → expédier → livrer → avis
- Concurrence maîtrisée (pas de survente)
- Webhooks idempotents

**Critères de sortie** :
- [ ] Une commande peut être créée, payée, expédiée, livrée
- [ ] Zéro survente sous 10 commandes simultanées
- [ ] Rollback complet si une réservation échoue
- [ ] Webhook peut être appelé N fois sans effet supplémentaire

**Risques** :
- Complexité des webhooks signés
- Gestion des timeouts provider
- Test de concurrence (fragilité possible)

## M4 — Transverse (Review + Address + Notification) ⏭️

**Date cible** : après M3 (estimé 2-3 semaines)

**Objectif** : Compléter l'infrastructure de confiance et de communication.

**Livrables** :
- [ ] AddressService (adresses de livraison)
- [ ] ReviewService (avis vérifiés post-achat)
- [ ] ReviewReportService (signalements)
- [ ] NotificationService (email + SMS + in-app)
- [ ] NotificationTemplateService
- [ ] Templates email transactionnels
- [ ] Scheduler (cron jobs : expiration devis, purge idempotency)
- [ ] Intégration SendGrid (email)
- [ ] Intégration Twilio ou SMS local (SMS)

**Métriques de succès** :
- Email de confirmation à chaque étape commande
- SMS de confirmation paiement
- Avis authentiques (uniquement post-achat)
- Signalement fonctionnel

**Critères de sortie** :
- [ ] Un client peut laisser un avis après livraison
- [ ] Les notifications partent à chaque étape
- [ ] Les adresses sont utilisables dans Order

## M5 — MVP ACHETER (beta fermée) ⏭️

**Date cible** : après M4 (estimé 2-3 mois)

**Objectif** : Valider le flux ACHETER avec de vrais utilisateurs.

**Livrables** :
- [ ] Frontend web client (catalogue, panier, checkout)
- [ ] Dashboard professionnel
- [ ] Backoffice admin (vérification, modération)
- [ ] Monitoring complet
- [ ] Support client (WhatsApp + email)
- [ ] Documentation utilisateur

**Métriques de succès** :
- 5-10 professionnels pilotes
- 20-30 clients testeurs
- 50 commandes réelles
- NPS > 30
- Taux de rétention client M1 > 40%

**Critères de sortie** :
- [ ] Parcours complet fonctionnel : boutique → produit → commande → paiement → livraison → avis
- [ ] Zéro bug critique pendant 2 semaines
- [ ] Uptime > 99.5%

**Risques** :
- Adoption pro lente
- Logistique de livraison
- Bugs d'intégration frontend

## M6 — Service (TROUVER) ⏭️

**Date cible** : 2-3 mois après M5

**Objectif** : Ouvrir le flux services (marketplace de compétences).

**Livrables** :
- [ ] ServiceService + portfolio
- [ ] ServiceImage + ServiceZone + Availability
- [ ] QuoteService (demande + réponse)
- [ ] BookingService (réservation de créneau)
- [ ] Intégration Payment (XOR order/booking)
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

## M7 — GA (General Availability) ⏭️

**Date cible** : après M6

**Livrables** :
- [ ] Ouverture publique
- [ ] Marketing actif (réseaux, radio, influence)
- [ ] Support multi-canal (WhatsApp + email + SMS)
- [ ] Monitoring + alerting production
- [ ] Infrastructure scalée
- [ ] Analytics (dashboard pro + admin)

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

## M8 — Rentabilité ⏭️

**Date cible** : 12-18 mois après M7

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

| Jalon | Description | Statut |
|---|---|---|
| J1 | Premier produit publié | ✅ |
| J2 | Premier test E2E vert | ✅ |
| J3 | 100 tests d'intégration | ✅ |
| J4 | Store + Category + KYC complets | ✅ |
| J5 | 190 tests verts | ✅ |
| J6 | Première commande créée | ⏭️ M3 |
| J7 | Premier paiement Orange Money | ⏭️ M3 |
| J8 | Premier webhook traité | ⏭️ M3 |
| J9 | Premier avis publié | ⏭️ M4 |
| J10 | Premier devis envoyé | ⏭️ M6 |
| J11 | Première réservation | ⏭️ M6 |
| J12 | 1 000 utilisateurs | ⏭️ M7 |

## Critères de passage entre jalons

### M1 → M2 ✅

- [x] Catalog 100% fonctionnel
- [x] Tests verts
- [x] Documentation complète
- [x] Décision go/no-go : GO

### M2 → M3 ✅

- [x] Store + Category + KYC fonctionnels
- [x] 190 tests verts
- [x] Décisions structurantes actées (mono-boutique, KYC progressif)
- [x] Décision go/no-go : GO sur Order

### M3 → M4

- [ ] Order + Payment validés
- [ ] Parcours de commande complet fonctionnel
- [ ] Zéro survente sous concurrence
- [ ] Webhooks idempotents testés
- [ ] Décision go/no-go sur Transverse

### M4 → M5

- [ ] Transverse (Review + Address + Notification) validés
- [ ] Notifications transactionnelles opérationnelles
- [ ] Préparation beta fermée

### M5 → M6

- [ ] MVP ACHETER validé en beta
- [ ] 50 commandes réelles
- [ ] NPS client > 30
- [ ] Décision go/no-go sur les services

### M6 → M7

- [ ] MVP TROUVER validé
- [ ] 10 réservations complétées
- [ ] NPS services > 30
- [ ] Préparation GA

### M7 → M8

- [ ] GA stable
- [ ] 2 000 utilisateurs actifs
- [ ] Revenus mensuels > 300 K FCFA
- [ ] Préparation scale

---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 0.3.0 |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | 2026-10-11 |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| 2026-10-11 | 0.2.0 | Intégration vision place de marché hybride | — |
| 2026-10-11 | 0.3.0 | M2 atteint (Store + Category + KYC progressif), renumérotation M3-M8 | — |
