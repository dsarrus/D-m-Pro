
# Exigences non-fonctionnelles

> **Section** : 02-requirements
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Performance

| Exigence | Cible | Mesure |
|---|---|---|
| Temps de réponse API (p50) | < 150 ms | Prometheus |
| Temps de réponse API (p95) | < 500 ms | Prometheus |
| Temps de réponse API (p99) | < 1 s | Prometheus |
| Temps de chargement page (p95) | < 2 s | Lighthouse |
| Temps de création produit | < 2 s | Test E2E |
| Temps de création commande | < 1 s | Test E2E |
| Temps de réservation stock | < 100 ms | Test intégration |
| Time to First Byte (TTFB) | < 300 ms | RUM |

## Scalabilité

| Exigence | Cible | Stratégie |
|---|---|---|
| Utilisateurs simultanés | 10 000 | Horizontal scaling |
| Requêtes/seconde | 5 000 | Load balancing |
| Commandes/jour | 50 000 | Partitioning |
| Produits en catalogue | 1 000 000 | Indexation |
| Images stockées | 10 TB | CDN + S3 |

## Disponibilité

| Exigence | Cible | Mesure |
|---|---|---|
| Uptime API | 99.9% | Monitoring |
| Uptime DB | 99.95% | Managed PostgreSQL |
| RTO (Recovery Time Objective) | 1h | Drill trimestriel |
| RPO (Recovery Point Objective) | 5 min | WAL archiving |
| Downtime planifié | < 4h/an | Blue/green deploys |

## Sécurité

| Exigence | Cible |
|---|---|
| Chiffrement en transit | TLS 1.3 |
| Chiffrement au repos | AES-256 |
| Hash mot de passe | bcrypt coût 12+ |
| JWT signature | RS256 |
| Validation entrées | Zod + contraintes DB |
| Rate limiting | Par IP + par user |
| Audit log | Toutes actions sensibles |
| Secrets | Variables d'env chiffrées |
| PII | Chiffrées ou tokenisées |

## Fiabilité transactionnelle

| Exigence | Cible | Implémentation |
|---|---|---|
| Atomicité | 100% des opérations multi-tables | Prisma transactions |
| Isolation Serializable | Écritures critiques | \`isolationLevel: Serializable\` |
| Retry P2034 | Automatique (3 tentatives) | \`withSerializableRetry\` |
| Idempotence | 100% des créations sensibles | \`Idempotency-Key\` |
| Intégrité référentielle | 100% | FK + CHECK |
| Absence de survente | Garantie | SQL atomique |

## Compatibilité

| Exigence | Cible |
|---|---|
| Navigateurs | Chrome 100+, Safari 15+, Firefox 100+ |
| Mobile | iOS 14+, Android 10+ |
| Résolution | 320px+ |
| Connexion | 3G+ |
| PWA | Installable (post-MVP) |

## Accessibilité

| Exigence | Cible |
|---|---|
| WCAG | 2.1 niveau AA |
| Contraste | ≥ 4.5:1 |
| Navigation clavier | Complète |
| Screen readers | Compatible |

## Internationalisation

| Exigence | Cible | Phase |
|---|---|---|
| Langues | Français + Bambara | Phase 2 |
| Devises | XOF (par défaut) | MVP |
| Multi-devises | EUR, USD | Phase 3 |
| Formats de date | Locale-aware | Phase 2 |

## Observabilité

| Exigence | Cible |
|---|---|
| Logs structurés | JSON |
| Niveaux de log | error, warn, info, debug |
| Métriques | Prometheus |
| Traces | OpenTelemetry |
| Alertes | Error rate > 1%, latence p95 > 1s |

## Maintenabilité

| Exigence | Cible |
|---|---|
| Couverture de tests | > 80% |
| Complexité cyclomatique | < 10 par fonction |
| Duplication | < 3% |
| Documentation API | OpenAPI 3.1 |
| Documentation code | JSDoc sur APIs publiques |

## Conformité

| Exigence | Cible |
|---|---|
| RGPD | Droit d'accès, droit à l'oubli |
| PCI-DSS | Aucun stockage de cartes |
| Fiscalité | Conformité DGI Mali |
| KYC | Vérification des professionnels |

## Coûts

| Poste | Cible An 1 |
|---|---|
| Infrastructure | < 300 K FCFA/mois |
| Coût par transaction | < 50 FCFA |
| Coût par utilisateur actif | < 200 FCFA/mois |

## Contraintes techniques

- **Monorepo** : pnpm workspaces
- **Backend** : Node.js 20+, TypeScript strict
- **Frontend** : Next.js 14+
- **DB** : PostgreSQL 16+
- **ORM** : Prisma 7+
- **Storage** : S3-compatible (SeaweedFS, MinIO)
- **Cache** : Redis 7+
- **Queue** : BullMQ

## Contraintes légales

- Hébergement : Mali ou région (latence)
- RGPD : conformité si expansion UE
- KYC : obligatoire pour professionnels
- Fiscalité : facturation conforme DGI


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
