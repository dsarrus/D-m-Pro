# Pagination API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Stratégie

Pagination par **curseur** pour les grandes collections.

## Format

```
GET /resources?limit=20&cursor=<lastId>
```

## Réponse

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "nextCursor": "uuid-or-null",
    "hasMore": true
  }
}
```

## Implémentation

```typescript
const limit = Math.min(options.limit ?? 20, 100);
const results = await prisma.xxx.findMany({
  take: limit + 1,
  cursor: options.cursor ? { id: options.cursor } : undefined,
  skip: options.cursor ? 1 : 0,
});
const hasMore = results.length > limit;
const data = hasMore ? results.slice(0, limit) : results;
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
