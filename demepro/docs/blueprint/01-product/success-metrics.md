
# Métriques de succès

> **Section** : 01-product
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## North Star Metric

### 🎯 GMV (Gross Merchandise Volume)

**Définition** : Valeur totale des transactions complétées sur la
plateforme (produits + services), sur une période donnée.

**Formule** :
```
GMV = Σ (commandes produits livrées) + Σ (réservations services complétées)
```

**Pourquoi ?** Mesure l'activité économique réelle, commune aux deux
flux, corrélée aux revenus ET à la valeur créée pour les pros.

### Cibles GMV

| Phase | GMV mensuel | GMV annuel |
|---|---|---|
| Alpha | 500 K | 6 M |
| Beta | 5 M | 60 M |
| GA (fin An 1) | 10 M | 48 M |
| An 2 | 50 M | 360 M |
| An 3 | 250 M | 2,16 Mds |
| An 4 | 600 M | 5 Mds |

## Métriques par catégorie

### 📈 Acquisition

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| Nouveaux clients/mois | 50 | 500 | 5 000 |
| Nouveaux pros/mois | 10 | 50 | 500 |
| CAC client | 2 000 | 1 500 | 1 000 |
| CAC pro | 10 000 | 8 000 | 5 000 |
| Taux de conversion inscription | 5% | 8% | 12% |

### 🚀 Activation

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| Taux activation client | 20% | 35% | 50% |
| Taux activation pro | 50% | 70% | 85% |
| Time-to-first-sale (pro) | 15 j | 10 j | 5 j |
| Time-to-first-purchase (client) | 7 j | 5 j | 3 j |

### 🔄 Rétention

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| Rétention client M1 | 30% | 45% | 60% |
| Rétention client M3 | 15% | 25% | 40% |
| Rétention pro M3 | 60% | 75% | 85% |
| Fréquence d'achat | 0.5 | 1.2 | 2.5 |

### 💰 Revenu

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| GMV mensuel | 500 K | 10 M | 250 M |
| Revenu mensuel | 0 | 300 K | 16 M |
| Panier moyen | 5 000 | 8 000 | 12 000 |
| Commission moyenne | 0% | 7% | 7,5% |
| Taux d'abonnement | 0% | 10% | 20% |

### 💚 Référence

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| NPS client | 20 | 40 | 60 |
| NPS pro | 15 | 35 | 55 |
| Taux de recommandation | 5% | 15% | 30% |
| Taux d'avis laissés | 20% | 40% | 60% |
| Note moyenne | 3.5 | 4.2 | 4.5 |
| Taux de réachat | 10% | 30% | 55% |

## Métriques par flux

### 🛒 Flux ACHETER

| Métrique | An 1 | An 3 |
|---|---|---|
| Produits publiés | 2 000 | 50 000 |
| Commandes/mois | 500 | 15 000 |
| Panier moyen | 8 000 | 12 000 |
| Conversion visite→commande | 1.5% | 3% |

### 🎯 Flux TROUVER (Phase 2)

| Métrique | An 2 | An 3 |
|---|---|---|
| Services publiés | 500 | 5 000 |
| Demandes de devis/mois | 100 | 3 000 |
| Taux de réponse pro | 60% | 85% |
| Taux d'acceptation | 30% | 45% |

## Métriques techniques

| Métrique | Cible |
|---|---|
| Uptime API | > 99,5% |
| Latence API p95 | < 500 ms |
| Taux d'erreur API | < 0,1% |
| Couverture de tests | > 80% |
| Taux de tests CI passants | 100% |

## Tableau de bord synthétique

| Indicateur | Cible An 1 |
|---|---|
| GMV mensuel | 10 M |
| Revenus mensuels | 300 K |
| Pros actifs | 100 |
| Clients actifs | 2 000 |
| NPS client | 40 |
| Rétention pro M3 | 75% |

## Ce que nous ne mesurons PAS

- Nombre d'inscriptions brutes
- Temps passé sur la plateforme
- Nombre de clics
- Followers sur les réseaux
- Nombre de fonctionnalités livrées


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
