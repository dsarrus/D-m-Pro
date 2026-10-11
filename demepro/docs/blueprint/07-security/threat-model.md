# Modèle de menaces

> **Section** : 07-security
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Méthodologie STRIDE

| Menace | Description | Mitigation |
|---|---|---|
| **S**poofing | Usurpation d'identité | JWT signé, HTTPS |
| **T**ampering | Modification de données | Contraintes DB, validation |
| **R**epudiation | Nier une action | Logs d'audit |
| **I**nformation disclosure | Fuite de données | Chiffrement, RBAC |
| **D**enial of service | Saturation | Rate limiting, quotas |
| **E**levation of privilege | Escalade | RBAC strict, ownership |

## Scénarios critiques

### 1. Accès à un produit d'un autre store

**Attaque** : Un professionnel tente de modifier un produit qui ne lui appartient pas.
**Mitigation** : Vérification `product.store.professional.userId === ctx.userId`.

### 2. Survente

**Attaque** : Deux clients achètent le dernier article en même temps.
**Mitigation** : Réservation atomique SQL.

### 3. Double soumission

**Attaque** : Un client clique deux fois sur "Commander".
**Mitigation** : Idempotency-Key.

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
