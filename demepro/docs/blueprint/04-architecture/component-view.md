
# C4 — Component View (API)

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Vue d'ensemble

L'API est organisée en **modules faiblement couplés** (modular
monolith). Chaque module a ses contrôleurs, services, repositories,
DTOs et erreurs.

## Structure des modules

```
apps/api/
├── modules/
│   ├── auth/
│   ├── rbac/
│   ├── catalog/
│   ├── store/
│   ├── category/
│   ├── order/
│   ├── payment/
│   ├── service/        (Phase 2)
│   ├── quote/          (Phase 2)
│   ├── booking/        (Phase 2)
│   ├── review/
│   └── notification/
│
├── shared/
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── require-permission.ts
│   │   ├── validate.ts
│   │   └── error-handler.ts
│   ├── errors/
│   │   └── app-error.ts
│   ├── utils/
│   │   ├── with-serializable-retry.ts
│   │   └── req-user.ts
│   └── types/
│       └── auth-context.ts
│
└── infrastructure/
    ├── database/
    │   └── prisma.ts
    └── logger/
        └── logger.ts
```

## Structure d'un module

```
module/
├── controllers/          # Handlers HTTP
│   └── xxx.controller.ts
├── services/            # Logique métier
│   └── xxx.service.ts
├── repositories/        # Accès données
│   └── xxx.repository.ts
├── dtos/                # Schémas Zod + types
│   └── xxx.dto.ts
├── errors/              # Erreurs spécifiques
│   └── xxx-error.ts
├── routes/              # Wiring Express
│   └── xxx.routes.ts
└── domain/              # (optionnel) Logique pure
    └── state-machines.ts
```

## Diagramme des composants

```
                    ┌──────────────────────────────────┐
                    │          Express App              │
                    └───────────────┬──────────────────┘
                                    │
                    ┌───────────────┼──────────────────┐
                    │               │                  │
                    ▼               ▼                  ▼
            ┌──────────┐    ┌──────────┐        ┌──────────┐
            │ Middleware│    │  Routes  │        │  Error   │
            │ (auth,   │    │  (wiring)│        │ Handler  │
            │  validate)│    └────┬─────┘        └──────────┘
            └──────────┘         │
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │Controller│  │Controller│  │Controller│
            └────┬─────┘  └────┬─────┘  └────┬─────┘
                 │             │             │
                 └─────────────┼─────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ Service  │ │ Service  │ │ Service  │
            │ (logique)│ │(logique) │ │(logique) │
            └────┬─────┘ └────┬─────┘ └────┬─────┘
                 │            │            │
                 └────────────┼────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │Repository│ │Repository│ │Repository│
            └────┬─────┘ └────┬─────┘ └────┬─────┘
                 │            │            │
                 └────────────┼────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Prisma Client  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    └──────────────────┘
```

## Modules par contexte

### Identity

**auth**
- `AuthController` : register, login, refresh, logout
- `AuthService` : logique JWT, hashing, tokens
- `AuthRepository` : lookup users
- Routes : `/auth/*`

**rbac**
- `RbacService` : vérification permissions
- `RbacRepository` : lookup role/permission
- Middleware : `requirePermission`

### Catalog

**catalog** (produits)
- `ProductController` / `ProductService` / `ProductRepository`
- `ProductVariantController` / `ProductVariantService` / `ProductVariantRepository`
- `ProductImageController` / `ProductImageService` / `ProductImageRepository`
- `InventoryController` / `InventoryService` / `InventoryRepository`
- `IdempotencyService` : anti-double-soumission
- Routes : `/catalog/*`

### Store (à créer)

**store**
- `StoreController` / `StoreService` / `StoreRepository`
- Routes : `/stores/*`

### Order (à créer)

**order**
- `OrderController` / `OrderService` / `OrderRepository`
- `OrderItemRepository`
- `OrderStatusHistoryRepository`
- `OrderStateMachine` (domain)
- Routes : `/orders/*`

### Payment (à créer)

**payment**
- `PaymentController` / `PaymentService` / `PaymentRepository`
- `PaymentProviderAdapter` (Orange Money, Wave)
- `WebhookController` (réception webhooks)
- Routes : `/payments/*`, `/webhooks/*`

### Service (Phase 2)

**service**
- `ServiceController` / `ServiceService` / `ServiceRepository`
- Routes : `/services/*`

**quote**
- `QuoteController` / `QuoteService` / `QuoteRepository`
- Routes : `/quotes/*`

**booking**
- `BookingController` / `BookingService` / `BookingRepository`
- Routes : `/bookings/*`

### Transverse

**review**
- `ReviewController` / `ReviewService` / `ReviewRepository`
- Routes : `/reviews/*`

**notification**
- `NotificationService` : envoi email/SMS/push
- `NotificationRepository`
- `EmailAdapter`, `SmsAdapter`, `PushAdapter`
- Écoute les events métier

## Communication inter-modules

### Principe

- **Un module ne référence JAMAIS les modèles d'un autre module**
- Communication via **interfaces** (services publics)
- Ou via **events** (asynchrone, Phase 3)

### Exemples

```typescript
// ✅ Order utilise InventoryService
import { InventoryService } from "../catalog/services/inventory.service";

class OrderService {
  constructor(private inventory: InventoryService) {}

  async createOrder(dto: CreateOrderDto, ctx: AuthContext) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await this.inventory.reserve(item.inventoryId, item.quantity, tx);
      }
      return this.orderRepository.create(...);
    });
  }
}

// ❌ Order n'importe PAS directement InventoryRepository
// ❌ Order n'accède PAS à tx.inventory directement (sauf dans son propre repo)
```

## Couches

### Controller

**Responsabilité** : Décoder la requête HTTP, appeler le service,
formater la réponse.

**Ne fait JAMAIS** : logique métier, accès DB.

```typescript
export class ProductController {
  constructor(private service: ProductService) {}

  create = async (req, res, next) => {
    try {
      const result = await this.service.createProduct(
        req.body,
        { userId: req.user.id },
        req.header("Idempotency-Key"),
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
```

### Service

**Responsabilité** : Logique métier, transactions, règles.

**Ne fait JAMAIS** : HTTP.

```typescript
export class ProductService {
  constructor(
    private prisma: PrismaClient,
    private repository: ProductRepository,
    private idempotency: IdempotencyService,
  ) {}

  async createProduct(dto, ctx, idempotencyKey?) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(async (tx) => {
        // logique métier
      }),
    );
  }
}
```

### Repository

**Responsabilité** : Accès données (Prisma).

**Ne fait JAMAIS** : règles métier.

```typescript
export class ProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string, tx = this.prisma) {
    return tx.product.findUnique({ where: { id } });
  }
}
```

### Domain (optionnel)

**Responsabilité** : Logique pure (state machines, value objects).

```typescript
// domain/state-machines.ts
export const PRODUCT_TRANSITIONS = { ... };

export function canTransition(from, to): boolean {
  return PRODUCT_TRANSITIONS[from].includes(to);
}
```

## Middlewares

### authenticate

Vérifie JWT et injecte `req.user`.

### requirePermission

Vérifie la permission RBAC.

### validate

Valide body/params/query avec Zod.

### errorHandler

Convertit les erreurs en réponses JSON.

## Wiring des routes

```typescript
// catalog.routes.ts
const repository = new ProductRepository(prisma);
const idempotency = new IdempotencyService(prisma);
const service = new ProductService(prisma, repository, idempotency);
const controller = new ProductController(service);

router.post(
  "/products",
  authenticate,
  requirePermission("catalog.product.create"),
  validate(createProductSchema, "body"),
  controller.create,
);
```

## Tests par couche

| Couche | Type de test | Outil |
|---|---|---|
| Controller | E2E (supertest) | Vitest |
| Service | Intégration (DB) | Vitest + Testcontainers |
| Repository | Intégration (DB) | Vitest + Testcontainers |
| Domain | Unit | Vitest |
| Middleware | E2E | Vitest + supertest |

## État d'avancement

| Module | Controllers | Services | Repositories | Tests |
|---|---|---|---|---|
| auth | ✅ | ✅ | ✅ | ⚠️ |
| rbac | — | ✅ | ✅ | ⚠️ |
| catalog | ✅ | ✅ | ✅ | ✅ 142 |
| store | ❌ | ❌ | ❌ | ❌ |
| category | ❌ | ❌ | ❌ | ❌ |
| order | ❌ | ❌ | ❌ | ❌ |
| payment | ❌ | ❌ | ❌ | ❌ |
| service | ❌ | ❌ | ❌ | ❌ |
| quote | ❌ | ❌ | ❌ | ❌ |
| booking | ❌ | ❌ | ❌ | ❌ |
| review | ❌ | ❌ | ❌ | ❌ |
| notification | ❌ | ❌ | ❌ | ❌ |

## Décisions structurantes

1. **Un module = un dossier**
2. **Communication via services, pas via repositories**
3. **Transactions gérées par les services**
4. **Controllers sans logique**
5. **Repositories sans règles**
6. **Domain pour la logique pure**


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
