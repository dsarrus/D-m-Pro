import { Prisma } from "../../../generated/prisma/client";

import { CatalogError, CatalogErrorCode } from "../errors/catalog.error";

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
    }
  }

  throw error;
}
