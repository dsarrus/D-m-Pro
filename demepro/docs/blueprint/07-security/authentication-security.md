# Sécurité authentification

> **Section** : 07-security
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Mot de passe

- Hash **bcrypt** (coût 12) ou **argon2id**
- Longueur min 12 caractères
- Vérification contre les listes de mots de passe compromis

## JWT

- Algorithme **RS256** (asymétrique)
- Secret dans variable d'environnement
- Rotation des clés tous les 90 jours

## Sessions

- Access token : 15 min
- Refresh token : 7 jours, stocké en DB
- Révocation possible (logout, changement de mdp)

## 2FA (à venir)

- TOTP (Google Authenticator)
- SMS fallback

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
