# Sécurité API

> **Section** : 07-security
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Rate limiting

| Endpoint | Limite |
|---|---|
| `POST /auth/login` | 5 / 15 min / IP |
| `POST /catalog/products` | 60 / min / user |
| Global | 1000 / min / IP |

## Headers de sécurité

```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
```

## CORS

Origines autorisées explicites :
```typescript
cors({
  origin: ["https://demepro.ml", "https://admin.demepro.ml"],
  credentials: true,
})
```

## Injection SQL

- Prisma paramètre toutes les requêtes
- `$queryRaw` avec template literals `${}` (jamais de concaténation)

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
