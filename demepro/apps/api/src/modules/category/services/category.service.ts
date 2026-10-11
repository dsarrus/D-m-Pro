// apps/api/src/modules/category/services/category.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { CategoryRepository } from "../repositories/category.repository";
import { CategoryError, CategoryErrorCode } from "../errors/category-error";

import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoriesQuery,
} from "../dtos/category.dto";

/* ================================================================
 * TYPES
 * ================================================================ */

export type AuthContext = {
  userId: string;
  role?: string;
  permissions?: string[];
};

const SERIALIZABLE_MAX_ATTEMPTS = 3;
const TRANSACTION_TIMEOUT_MS = 15000;
const MAX_CATEGORY_DEPTH = 3;

/* ================================================================
 * SERVICE
 * ================================================================ */

export class CategoryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: CategoryRepository,
  ) {}

  /* ================================================================
   * HELPERS
   * ================================================================ */

  private async withSerializableRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = SERIALIZABLE_MAX_ATTEMPTS,
  ): Promise<T> {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;

        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";

        if (!isSerializationConflict || attempt >= maxAttempts) {
          throw error;
        }

        const delay =
          Math.min(100 * 2 ** attempt, 2000) +
          Math.floor(Math.random() * 100);

        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  /**
   * Vérifie que l'appelant est ADMIN ou SUPER_ADMIN.
   */
  private assertAdmin(ctx: AuthContext): void {
    if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
      throw new CategoryError(
        CategoryErrorCode.UNAUTHORIZED,
        "Action réservée aux administrateurs.",
      );
    }
  }

  /**
   * Charge une catégorie par ID.
   */
  private async loadCategory(
    db: Prisma.TransactionClient | PrismaClient,
    id: string,
  ) {
    const category = await this.repository.findById(id, db);

    if (!category) {
      throw new CategoryError(
        CategoryErrorCode.CATEGORY_NOT_FOUND,
        "Catégorie introuvable.",
      );
    }

    return category;
  }

  /**
   * Vérifie l'unicité du slug dans un vertical.
   */
  private async assertSlugFree(
    db: Prisma.TransactionClient | PrismaClient,
    verticalId: string,
    slug: string,
    excludeCategoryId?: string,
  ): Promise<void> {
    const existing = await db.category.findFirst({
      where: {
        verticalId,
        slug,
        ...(excludeCategoryId ? { NOT: { id: excludeCategoryId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new CategoryError(
        CategoryErrorCode.CATEGORY_SLUG_TAKEN,
        `Le slug "${slug}" est déjà utilisé dans ce vertical.`,
      );
    }
  }

  /**
   * Vérifie que la profondeur ne dépasse pas 3 niveaux.
   * `parentId` est le futur parent.
   * Retourne la profondeur de l'enfant (1, 2 ou 3).
   */
  private async assertDepthOk(
    db: Prisma.TransactionClient | PrismaClient,
    parentId: string | null | undefined,
  ): Promise<void> {
    /* Pas de parent → profondeur 1 */
    if (!parentId) return;

    /* Charger l'ascendance du parent */
    const ancestors = await this.repository.findAncestors(parentId, db);

    /* Profondeur du parent = nombre d'ancêtres (incluant lui-même) */
    const parentDepth = ancestors.length;

    /* L'enfant aura depth = parentDepth + 1 */
    if (parentDepth + 1 > MAX_CATEGORY_DEPTH) {
      throw new CategoryError(
        CategoryErrorCode.CATEGORY_MAX_DEPTH,
        `Profondeur maximale de ${MAX_CATEGORY_DEPTH} niveaux atteinte.`,
      );
    }
  }

  /**
   * Vérifie que la catégorie parente n'est pas dans l'ascendance
   * (évite les cycles).
   */
  private async assertNoCycle(
    db: Prisma.TransactionClient | PrismaClient,
    categoryId: string,
    newParentId: string | null | undefined,
  ): Promise<void> {
    if (!newParentId) return;
    if (newParentId === categoryId) {
      throw new CategoryError(
        CategoryErrorCode.CATEGORY_CYCLE,
        "Une catégorie ne peut pas être son propre parent.",
      );
    }

    const ancestors = await this.repository.findAncestors(newParentId, db);

    if (ancestors.some((a) => a.id === categoryId)) {
      throw new CategoryError(
        CategoryErrorCode.CATEGORY_CYCLE,
        "Cycle détecté dans la hiérarchie.",
      );
    }
  }

  /**
   * Vérifie la cohérence de type entre parent et enfant.
   *
   * Règles :
   *  - BOTH parent accepte tout
   *  - SERVICE parent accepte SERVICE ou BOTH
   *  - PRODUCT parent accepte PRODUCT ou BOTH
   *  - Un enfant ne peut pas être "plus large" que son parent
   */
  private assertTypeCompatible(
    parentType: "SERVICE" | "PRODUCT" | "BOTH" | null,
    childType: "SERVICE" | "PRODUCT" | "BOTH",
  ): void {
    if (!parentType || parentType === "BOTH") return;

    /* Un parent SERVICE ne peut pas avoir d'enfant PRODUCT pur */
    if (parentType === "SERVICE" && childType === "PRODUCT") {
      throw new CategoryError(
        CategoryErrorCode.CATEGORY_TYPE_MISMATCH,
        "Une catégorie parente SERVICE ne peut pas avoir d'enfant PRODUCT.",
      );
    }

    if (parentType === "PRODUCT" && childType === "SERVICE") {
      throw new CategoryError(
        CategoryErrorCode.CATEGORY_TYPE_MISMATCH,
        "Une catégorie parente PRODUCT ne peut pas avoir d'enfant SERVICE.",
      );
    }
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  async createCategory(dto: CreateCategoryDto, ctx: AuthContext) {
    this.assertAdmin(ctx);

    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            /* Vérifier le vertical */
            const verticalOk = await this.repository.verticalExists(
              dto.verticalId,
              tx,
            );
            if (!verticalOk) {
              throw new CategoryError(
                CategoryErrorCode.VERTICAL_NOT_FOUND,
                "Vertical introuvable.",
              );
            }

            /* Vérifier le parent */
            let parentType: "SERVICE" | "PRODUCT" | "BOTH" | null = null;

            if (dto.parentId) {
              const parent = await this.repository.findById(
                dto.parentId,
                tx,
              );

              if (!parent) {
                throw new CategoryError(
                  CategoryErrorCode.CATEGORY_INVALID_PARENT,
                  "Catégorie parente introuvable.",
                );
              }

              /* Le parent doit être dans le même vertical */
              if (parent.verticalId !== dto.verticalId) {
                throw new CategoryError(
                  CategoryErrorCode.CATEGORY_INVALID_PARENT,
                  "La catégorie parente doit appartenir au même vertical.",
                );
              }

              parentType = parent.type;

              /* Vérifier la profondeur */
              await this.assertDepthOk(tx, dto.parentId);
            }

            /* Vérifier la compatibilité de type */
            this.assertTypeCompatible(parentType, dto.type);

            /* Vérifier le slug */
            await this.assertSlugFree(
              tx,
              dto.verticalId,
              dto.slug,
            );

            /* Créer */
            return this.repository.create(
              {
                vertical: { connect: { id: dto.verticalId } },
                ...(dto.parentId
                  ? { parent: { connect: { id: dto.parentId } } }
                  : {}),
                name: dto.name,
                slug: dto.slug,
                description: dto.description ?? null,
                type: dto.type,
                status: dto.status,
                sortOrder: dto.sortOrder,
                imageKey: dto.imageKey ?? null,
              },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  async getCategory(categoryId: string) {
    return this.loadCategory(this.prisma, categoryId);
  }

  async listCategories(query: ListCategoriesQuery) {
    const results = await this.repository.list(query);

    const limit = Math.min(query.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  async listChildren(categoryId: string) {
    /* Vérifier que la catégorie existe */
    await this.loadCategory(this.prisma, categoryId);
    return this.repository.findChildren(categoryId);
  }

  /**
   * Retourne l'arbre complet d'un vertical.
   */
  async getTreeByVertical(verticalId: string) {
    const categories = await this.prisma.category.findMany({
      where: { verticalId, status: { not: "ARCHIVED" } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    /* Construction de l'arbre */
    type Node = (typeof categories)[number] & { children: Node[] };

    const map = new Map<string, Node>();
    const roots: Node[] = [];

    for (const c of categories) {
      map.set(c.id, { ...c, children: [] });
    }

    for (const c of categories) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /* ================================================================
   * UPDATE
   * ================================================================ */

  async updateCategory(
    categoryId: string,
    dto: UpdateCategoryDto,
    ctx: AuthContext,
  ) {
    this.assertAdmin(ctx);

    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const category = await this.loadCategory(tx, categoryId);

            if (category.status === "ARCHIVED") {
              throw new CategoryError(
                CategoryErrorCode.CATEGORY_INVALID_PARENT,
                "Impossible de modifier une catégorie archivée.",
              );
            }

            /* Vérifier le slug si modifié */
            if (dto.slug !== undefined && dto.slug !== category.slug) {
              await this.assertSlugFree(
                tx,
                category.verticalId,
                dto.slug,
                categoryId,
              );
            }

            /* Si le type change, vérifier la compatibilité avec le parent */
            if (dto.type !== undefined) {
              const parent = category.parentId
                ? await this.repository.findById(category.parentId, tx)
                : null;

              this.assertTypeCompatible(parent?.type ?? null, dto.type);
            }

            /* Construire le patch */
            const data: Prisma.CategoryUpdateInput = {};

            if (dto.name !== undefined) data.name = dto.name;
            if (dto.slug !== undefined) data.slug = dto.slug;
            if (dto.description !== undefined) {
              data.description = dto.description;
            }
            if (dto.type !== undefined) data.type = dto.type;
            if (dto.status !== undefined) data.status = dto.status;
            if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
            if (dto.imageKey !== undefined) data.imageKey = dto.imageKey;

            return this.repository.update(categoryId, data, tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  /* ================================================================
   * DELETE
   * ================================================================ */

  async deleteCategory(categoryId: string, ctx: AuthContext) {
    this.assertAdmin(ctx);

    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadCategory(tx, categoryId);

            /* Vérifier les enfants */
            const childCount = await this.repository.countChildren(
              categoryId,
              tx,
            );
            if (childCount > 0) {
              throw new CategoryError(
                CategoryErrorCode.CATEGORY_HAS_CHILDREN,
                `Impossible de supprimer : ${childCount} sous-catégorie(s) existent.`,
              );
            }

            /* Vérifier les produits */
            const productCount = await this.repository.countProducts(
              categoryId,
              tx,
            );
            if (productCount > 0) {
              throw new CategoryError(
                CategoryErrorCode.CATEGORY_HAS_PRODUCTS,
                `Impossible de supprimer : ${productCount} produit(s) sont associés.`,
              );
            }

            /* Vérifier les services */
            const serviceCount = await this.repository.countServices(
              categoryId,
              tx,
            );
            if (serviceCount > 0) {
              throw new CategoryError(
                CategoryErrorCode.CATEGORY_HAS_SERVICES,
                `Impossible de supprimer : ${serviceCount} service(s) sont associés.`,
              );
            }

            return this.repository.delete(categoryId, tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  /* ================================================================
   * MAPPING PRISMA
   * ================================================================ */

  private mapPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(",")
          : String(error.meta?.target ?? "");

        if (target.includes("slug")) {
          throw new CategoryError(
            CategoryErrorCode.CATEGORY_SLUG_TAKEN,
            "Ce slug est déjà utilisé.",
          );
        }
      }

      if (error.code === "P2003") {
        throw new CategoryError(
          CategoryErrorCode.CATEGORY_INVALID_PARENT,
          "Référence invalide.",
        );
      }
    }

    throw error;
  }
}