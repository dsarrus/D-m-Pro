import { PrismaClient } from "../../generated/prisma";

import type { CreateProductDto, UpdateProductDto } from "../dto/product.dto";

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.product.findUnique({
      where: {
        id,
      },

      include: {
        store: {
          include: {
            professional: true,
          },
        },

        category: {
          include: {
            vertical: true,
          },
        },

        variants: {
          where: {
            isActive: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },

        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        inventory: true,
      },
    });
  }

  async findByStoreAndSlug(storeId: string, slug: string) {
    return this.prisma.product.findUnique({
      where: {
        storeId_slug: {
          storeId,
          slug,
        },
      },
    });
  }

  async findBySku(sku: string) {
    return this.prisma.product.findUnique({
      where: {
        sku,
      },
    });
  }

  async findStore(storeId: string) {
    return this.prisma.store.findUnique({
      where: {
        id: storeId,
      },

      include: {
        professional: true,
      },
    });
  }

  async findCategory(categoryId: string) {
    return this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },

      include: {
        vertical: true,
      },
    });
  }

  async create(data: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        storeId: data.storeId,
        categoryId: data.categoryId,

        name: data.name,
        slug: data.slug,
        description: data.description,

        sku: data.sku,

        status: data.status,

        hasVariants: data.hasVariants,

        price: data.price,
        currency: data.currency,
      },

      include: {
        store: true,
        category: {
          include: {
            vertical: true,
          },
        },

        variants: true,
        images: true,
        inventory: true,
      },
    });
  }

  async update(id: string, data: UpdateProductDto) {
    return this.prisma.product.update({
      where: {
        id,
      },

      data,

      include: {
        store: true,
        category: {
          include: {
            vertical: true,
          },
        },

        variants: true,
        images: true,
        inventory: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.product.update({
      where: {
        id,
      },

      data: {
        status: "ARCHIVED",
      },
    });
  }

  async activate(id: string) {
    return this.prisma.product.update({
      where: {
        id,
      },

      data: {
        status: "ACTIVE",
      },
    });
  }

  async deactivate(id: string) {
    return this.prisma.product.update({
      where: {
        id,
      },

      data: {
        status: "INACTIVE",
      },
    });
  }
}
