# Protection des données

> **Section** : 07-security
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Chiffrement

| Couche | Méthode |
|---|---|
| En transit | TLS 1.3 |
| Au repos | AES-256 (DB) |
| Secrets | Variables d'environnement chiffrées |

## Données personnelles

| Donnée | Sensibilité | Rétention |
|---|---|---|
| Email | Moyenne | Jusqu'à suppression compte |
| Téléphone | Moyenne | — |
| Adresse | Haute | 10 ans (légal) |
| Mot de passe | Critique | Hash uniquement |

## RGPD

- Droit d'accès : endpoint `GET /me/data`
- Droit à l'oubli : `DELETE /me`
- Portabilité : export JSON

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
