// apps/api/src/modules/category/repositories/category.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.category.findUnique({
      where: { id },
      include: {
        vertical: true,
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { children: true, products: true, services: true },
        },
      },
    });
  }

  async findBySlugAndVertical(
    verticalId: string,
    slug: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.category.findUnique({
      where: {
        verticalId_slug: { verticalId, slug },
      },
    });
  }

  async findChildren(
    parentId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.category.findMany({
      where: { parentId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { children: true, products: true, services: true },
        },
      },
    });
  }

  /**
   * Récupère l'ascendance complète d'une catégorie (parent → grand-parent → ...).
   * Utilisé pour vérifier la profondeur et détecter les cycles.
   */
  async findAncestors(
    categoryId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const ancestors: Array<{
      id: string;
      parentId: string | null;
      name: string;
      slug: string;
    }> = [];

    let currentId: string | null = categoryId;

    while (currentId) {
      const category: {
        id: string;
        parentId: string | null;
        name: string;
        slug: string;
      } | null = await tx.category.findUnique({
        where: { id: currentId },
        select: { id: true, parentId: true, name: true, slug: true },
      });

      if (!category) break;

      ancestors.push(category);
      currentId = category.parentId;
    }

    return ancestors;
  }

  /**
   * Liste paginée avec filtres.
   */
  async list(
    filters: {
      verticalId?: string;
      parentId?: string | null;
      type?: "SERVICE" | "PRODUCT" | "BOTH";
      status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
      limit?: number;
      cursor?: string | null;
    },
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(filters.limit ?? 20, 100);

    const where: Prisma.CategoryWhereInput = {};

    if (filters.verticalId) where.verticalId = filters.verticalId;
    if (filters.parentId !== undefined) where.parentId = filters.parentId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    return tx.category.findMany({
      where,
      include: {
        vertical: { select: { id: true, code: true, name: true } },
        _count: {
          select: { children: true, products: true, services: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: limit + 1,
      ...(filters.cursor
        ? { cursor: { id: filters.cursor }, skip: 1 }
        : {}),
    });
  }

  /**
   * Vérifie qu'un vertical existe.
   */
  async verticalExists(
    verticalId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const v = await tx.vertical.findUnique({
      where: { id: verticalId },
      select: { id: true },
    });
    return Boolean(v);
  }

  /* ================================================================
   * COMPTEURS
   * ================================================================ */

  async countChildren(
    categoryId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.category.count({ where: { parentId: categoryId } });
  }

  async countProducts(
    categoryId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.product.count({ where: { categoryId } });
  }

  async countServices(
    categoryId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.service.count({ where: { categoryId } });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.CategoryCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.category.create({ data });
  }

  async update(
    id: string,
    data: Prisma.CategoryUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.category.update({
      where: { id },
      data,
    });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.category.delete({ where: { id } });
  }
}