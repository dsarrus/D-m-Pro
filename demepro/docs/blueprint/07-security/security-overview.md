# Vue d'ensemble sécurité

> **Section** : 07-security
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Principes

1. **Défense en profondeur** — plusieurs couches de sécurité
2. **Moindre privilège** — permissions minimales
3. **Fail-safe** — refuser par défaut
4. **Zero trust** — vérifier à chaque requête

## Couches

| Couche | Mesures |
|---|---|
| Réseau | HTTPS, WAF, DDoS protection |
| Application | Auth JWT, RBAC, validation Zod |
| Base de données | Contraintes, chiffrement at-rest |
| Fichiers | Signed URLs, virus scan |
| Monitoring | Logs, alertes, audit |

## Conformité

- RGPD : droit à l'oubli, portabilité
- PCI-DSS : pas de stockage de cartes (délégué au provider)

---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 0.1.0 |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | 2026-10-10 |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
