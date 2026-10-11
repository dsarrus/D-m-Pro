
# Erreurs API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Format standard

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SKU",
    "message": "Le SKU "CH-41" est déjà utilisé.",
    "statusCode": 409,
    "details": { "sku": "CH-41" }
  }
}
```

## Catalogue complet des codes

### 400 — Validation

| Code | Description | Exemple |
|---|---|---|
| `VALIDATION_ERROR` | Validation Zod échouée | Body invalide |
| `INVALID_UUID` | UUID malformé | Param invalide |
| `INVALID_QUERY` | Query string invalide | Filtre invalide |

### 401 — Authentification

| Code | Description |
|---|---|
| `UNAUTHENTICATED` | Token manquant ou invalide |
| `TOKEN_EXPIRED` | Token JWT expiré |
| `INVALID_CREDENTIALS` | Email/password incorrect |
| `EMAIL_NOT_VERIFIED` | Email non confirmé |

### 403 — Autorisation

| Code | Description |
|---|---|
| `UNAUTHORIZED` | Permission manquante |
| `UNAUTHORIZED_STORE` | Non propriétaire de la ressource |
| `STORE_NOT_ACTIVE` | Boutique suspendue |
| `PRO_ACCOUNT_REQUIRED` | Rôle insuffisant |
| `VERIFICATION_REQUIRED` | KYC manquant |

### 404 — Ressource introuvable

| Code | Description |
|---|---|
| `PRODUCT_NOT_FOUND` | Produit inexistant |
| `PRODUCT_VARIANT_NOT_FOUND` | Variante inexistante |
| `PRODUCT_IMAGE_NOT_FOUND` | Image inexistante |
| `INVENTORY_NOT_FOUND` | Inventaire inexistant |
| `STORE_NOT_FOUND` | Boutique inexistante |
| `CATEGORY_NOT_FOUND` | Catégorie inexistante |
| `ORDER_NOT_FOUND` | Commande inexistante |
| `PAYMENT_NOT_FOUND` | Paiement inexistant |
| `REVIEW_NOT_FOUND` | Avis inexistant |
| `USER_NOT_FOUND` | Utilisateur inexistant |
| `PROFESSIONAL_NOT_FOUND` | Professionnel inexistant |

### 409 — Conflit

| Code | Description |
|---|---|
| `DUPLICATE_SLUG` | Slug déjà utilisé |
| `DUPLICATE_SKU` | SKU déjà utilisé |
| `DUPLICATE_EMAIL` | Email déjà utilisé |
| `DUPLICATE_REVIEW` | Avis déjà laissé |
| `IDEMPOTENCY_CONFLICT` | Clé utilisée avec payload différent |
| `IDEMPOTENCY_IN_PROGRESS` | Clé en cours de traitement |
| `BOOKING_CONFLICT` | Créneau déjà réservé |

### 422 — État invalide

| Code | Description |
|---|---|
| `INVALID_PRODUCT_STATE` | État du produit incompatible |
| `INVALID_INVENTORY_QUANTITY` | Quantité invalide |
| `PRODUCT_HAS_NO_VARIANTS` | Opération nécessite hasVariants=true |
| `VARIANTS_EXIST` | Impossible de désactiver les variantes |
| `LAST_ACTIVE_VARIANT` | Dernière variante active |
| `INSUFFICIENT_STOCK` | Stock insuffisant |
| `INVALID_ORDER_STATE` | Transition de statut invalide |
| `INVALID_PAYMENT_STATE` | État de paiement incompatible |
| `QUOTE_EXPIRED` | Devis expiré |
| `REFUND_WINDOW_EXPIRED` | Délai de remboursement dépassé |

### 429 — Rate limit

| Code | Description |
|---|---|
| `RATE_LIMIT_EXCEEDED` | Trop de requêtes |

### 500 — Erreur interne

| Code | Description |
|---|---|
| `INTERNAL_ERROR` | Erreur serveur non gérée |
| `DATABASE_ERROR` | Erreur PostgreSQL |

### 503 — Indisponible

| Code | Description |
|---|---|
| `SERVICE_UNAVAILABLE` | Maintenance ou surcharge |
| `PAYMENT_PROVIDER_UNAVAILABLE` | Provider down |

## Implémentation

### Hiérarchie des erreurs

```typescript
// Base
class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Catalog
class CatalogError extends AppError {
  constructor(code: CatalogErrorCode, message: string, statusCode = 400) {
    super(code, message, statusCode);
  }
}

// Order (Phase 2)
class OrderError extends AppError { /* ... */ }
```

### Codes centralisés

```typescript
// apps/api/src/modules/catalog/errors/catalog-error.ts
export const CatalogErrorCode = {
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  // ...
} as const;

const STATUS_BY_CODE: Record<CatalogErrorCode, number> = {
  PRODUCT_NOT_FOUND: 404,
  UNAUTHORIZED_STORE: 403,
  DUPLICATE_SKU: 409,
  // ...
};
```

### Mapping Prisma → Catalog

```typescript
export function mapCatalogPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");

      if (target.includes("sku")) {
        throw new CatalogError(
          CatalogErrorCode.DUPLICATE_SKU,
          "Ce SKU est déjà utilisé.",
        );
      }
      if (target.includes("slug")) {
        throw new CatalogError(
          CatalogErrorCode.DUPLICATE_SLUG,
          "Ce slug est déjà utilisé.",
        );
      }
      if (target.includes("email")) {
        throw new CatalogError(
          CatalogErrorCode.DUPLICATE_EMAIL,
          "Cet email est déjà utilisé.",
        );
      }
    }

    if (error.code === "P2034") {
      throw new CatalogError(
        CatalogErrorCode.INTERNAL_ERROR,
        "Conflit de transaction, veuillez réessayer.",
      );
    }
  }

  throw error;
}
```

### Error handler global

```typescript
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // CatalogError
  if (error instanceof CatalogError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      },
    });
    return;
  }

  // ZodError
  if (error && typeof error === "object" && "name" in error
    && (error as any).name === "ZodError") {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Les données fournies sont invalides.",
        statusCode: 400,
        details: (error as any).issues,
      },
    });
    return;
  }

  // Fallback
  console.error("[errorHandler] Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Erreur interne.",
      statusCode: 500,
    },
  });
}
```

## Bonnes pratiques

### 1. Jamais de message technique exposé

```typescript
// ❌ Faux
throw new Error("Prisma P2002: Duplicate key on product_variants.sku");

// ✅ Correct
throw new CatalogError(
  CatalogErrorCode.DUPLICATE_SKU,
  "Le SKU "CH-41" est déjà utilisé.",
);
```

### 2. Code stable et documenté

Chaque code doit :
- Être documenté dans ce fichier
- Avoir un mapping status HTTP
- Avoir un test

### 3. Détails optionnels

```typescript
throw new CatalogError(
  CatalogErrorCode.DUPLICATE_SKU,
  `Le SKU "${sku}" est déjà utilisé.`,
  409,
  { sku, field: "sku" },
);
```

### 4. Idempotence des erreurs

Une même erreur doit toujours avoir le même code.

### 5. Ne pas masquer les erreurs critiques

Les erreurs internes doivent être loggées, pas silencieuses.

## Tests

Chaque code d'erreur doit avoir un test :

```typescript
it("retourne 404 PRODUCT_NOT_FOUND", async () => {
  const res = await api.get("/catalog/products/00000000-0000-0000-0000-000000000000");
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
});
```

## Tableau récapitulatif

| Code HTTP | Nb codes | Exemples |
|---|---|---|
| 400 | 3 | VALIDATION_ERROR, INVALID_UUID |
| 401 | 4 | UNAUTHENTICATED, TOKEN_EXPIRED |
| 403 | 5 | UNAUTHORIZED, UNAUTHORIZED_STORE |
| 404 | 11 | PRODUCT_NOT_FOUND, ORDER_NOT_FOUND |
| 409 | 7 | DUPLICATE_SKU, IDEMPOTENCY_CONFLICT |
| 422 | 10 | INVALID_PRODUCT_STATE, INSUFFICIENT_STOCK |
| 429 | 1 | RATE_LIMIT_EXCEEDED |
| 500 | 2 | INTERNAL_ERROR, DATABASE_ERROR |
| 503 | 2 | SERVICE_UNAVAILABLE |
| **Total** | **45** | — |


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
