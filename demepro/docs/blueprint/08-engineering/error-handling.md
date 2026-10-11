# Gestion des erreurs

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Hiérarchie

```
Error (native)
  ├── AppError (base)
  │     ├── CatalogError
  │     ├── OrderError
  │     └── AuthError
  └── PrismaError (wrapped)
```

## Format

```typescript
class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

## Middleware global

```typescript
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  logger.error(err);
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Erreur interne." },
  });
});
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
