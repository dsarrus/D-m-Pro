# Authentification API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Flow JWT

1. `POST /auth/login` → retourne `accessToken` + `refreshToken`
2. Le client envoie `Authorization: Bearer <accessToken>`
3. Middleware `authenticate` valide et injecte `req.user`
4. `POST /auth/refresh` pour renouveler

## Tokens

| Token | Durée | Format |
|---|---|---|
| Access Token | 15 min | JWT |
| Refresh Token | 7 jours | JWT + DB |

## Payload JWT

```json
{
  "sub": "user-uuid",
  "role": "PROFESSIONAL",
  "iat": 1234567890,
  "exp": 1234568790
}
```

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
