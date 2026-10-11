
# Blueprint DɛmɛPro

> **Section** : 00-index
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## À propos

Ce dossier contient la **documentation de conception complète** de
DɛmɛPro, organisée en 13 sections.

## Structure

| Section | Contenu | Complétion |
|---|---|---|
| [01-product](../01-product/) | Vision, personas, MVP | 85% |
| [02-requirements](../02-requirements/) | Exigences fonctionnelles et non-fonctionnelles | 75% |
| [03-domain](../03-domain/) | Modèle de domaine, workflows | 80% |
| [04-architecture](../04-architecture/) | Architecture technique | 40% |
| [05-data](../05-data/) | Schéma de données | 70% |
| [06-api](../06-api/) | Contrats API | 40% |
| [07-security](../07-security/) | Sécurité | 20% |
| [08-engineering](../08-engineering/) | Standards d'ingénierie | 30% |
| [09-infrastructure](../09-infrastructure/) | Infrastructure, CI/CD | 20% |
| [10-decisions](../10-decisions/) | ADRs | 60% |
| [11-ai-engineering](../11-ai-engineering/) | Règles pour les agents IA | 30% |
| [12-roadmap](../12-roadmap/) | Roadmap, milestones | 70% |

## Comment lire ce blueprint

### Pour comprendre le produit

1. [01-product/vision.md](../01-product/vision.md)
2. [01-product/problem.md](../01-product/problem.md)
3. [01-product/users.md](../01-product/users.md)
4. [01-product/value-proposition.md](../01-product/value-proposition.md)
5. [01-product/mvp.md](../01-product/mvp.md)

### Pour comprendre le domaine

1. [03-domain/domain-overview.md](../03-domain/domain-overview.md)
2. [03-domain/entities.md](../03-domain/entities.md)
3. [03-domain/aggregates.md](../03-domain/aggregates.md)
4. [03-domain/domain-rules.md](../03-domain/domain-rules.md)

### Pour développer

1. [04-architecture/component-view.md](../04-architecture/component-view.md)
2. [08-engineering/coding-standards.md](../08-engineering/coding-standards.md)
3. [10-decisions/README.md](../10-decisions/README.md)

### Pour contribuer

1. [11-ai-engineering/rules.md](../11-ai-engineering/rules.md)
2. [11-ai-engineering/definition-of-done.md](../11-ai-engineering/definition-of-done.md)

## Principes directeurs

DɛmɛPro est une **place de marché hybride** qui couvre **deux
intentions** :

1. **ACHETER** — Vente de produits physiques
2. **TROUVER** — Prestation de services

Les deux flux partagent :
- **Identité** (User, Role, KYC)
- **Confiance** (avis, vérification)
- **Paiement** (Orange Money, Wave, cash)
- **Notifications** (email, SMS, push)

## Navigation rapide

- **Index** : ce document
- **Glossaire** : [glossary.md](./glossary.md)
- **Statut** : [document-status.md](./document-status.md)

## Statut actuel du projet

```
Phase 1 — Foundation       ✅
Phase 2 — Catalog          ✅ (142 tests)
Phase 3 — Store + Category ⏭️ Prochaine
Phase 4 — Order + Payment  ⏭️
Phase 5 — Service          ⏭️
Phase 6 — Transverse       ⏭️
Phase 7 — Analytics        ⏭️
Phase 8 — Frontends        ⏭️
```

## Comment contribuer

### Avant de modifier

1. Lire les documents concernés
2. Vérifier les ADRs existants
3. Consulter le statut des documents

### Convention de mise à jour

- **Toujours** mettre à jour le `## Historique` en bas de chaque
  document
- **Toujours** passer la version à la suivante
- **Jamais** supprimer du contenu sans raison explicite
- **Signaler** les sections incomplètes avec 🚧 ou 🟡

### Processus

1. Proposer le changement (issue ou PR)
2. Discuter si nécessaire
3. Modifier le document
4. Mettre à jour l'historique
5. Mettre à jour [document-status.md](./document-status.md)
6. Commit avec message clair

## Outils

### Scripts de génération

```bash
# Générer la structure initiale
node scripts/init-blueprint.mjs

# Mettre à jour les fichiers (Vague 1 + 2)
node scripts/update-blueprint-v1.mjs

# Mettre à jour les fichiers (Vagues 3-6)
node scripts/update-blueprint-v2.mjs
```

### Options

```bash
# Voir sans écrire
node scripts/update-blueprint-v2.mjs --dry-run

# Forcer l'écrasement
node scripts/update-blueprint-v2.mjs --force
```

## Références externes

- [DɛmɛPro - README principal](../../README.md)
- [CHANGELOG](../../CHANGELOG.md)
- [Conventions de code](../CONVENTIONS.md)

## Contact

- **Équipe produit** : —
- **Équipe technique** : —
- **Slack / WhatsApp** : —


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
