#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Racine du projet (par défaut : dossier courant)
const ROOT = process.cwd();

// ============================================================
// Définition de l'arborescence du module Catalog
// ============================================================

const structure = {
  "apps/api/src/modules/catalog/dto": [
    "category.dto.ts",
    "product.dto.ts",
    "product-variant.dto.ts",
    "product-image.dto.ts",
    "inventory.dto.ts",
    "service.dto.ts",
    "catalog-query.dto.ts",
  ],
  "apps/api/src/modules/catalog/validators": ["catalog.validation.ts"],
  "apps/api/src/modules/catalog/repositories": [], // vide pour l'instant
  "apps/api/src/modules/catalog/services": [], // vide pour l'instant
  "apps/api/src/modules/catalog/controllers": [], // vide pour l'instant
  "apps/api/src/modules/catalog/routes": [], // vide pour l'instant
};

// ============================================================
// Contenu par défaut selon le type de fichier
// ============================================================

function defaultContent(filePath) {
  const fileName = path.basename(filePath, ".ts");
  const relative = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const header = `/**\n * ${relative}\n */\n\n`;

  // ---------- DTO ----------
  if (fileName.endsWith(".dto")) {
    // Cas spéciaux pour les DTOs principaux
    const dtoTemplates = {
      "category.dto": `import { z } from 'zod';

export const CreateCategoryDto = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(150).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const UpdateCategoryDto = CreateCategoryDto.partial();

export const CategoryResponseDto = CreateCategoryDto.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryDto>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryDto>;
export type CategoryResponse = z.infer<typeof CategoryResponseDto>;
`,

      "product.dto": `import { z } from 'zod';

export const ProductStatusEnum = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'ARCHIVED',
]);

export const CreateProductDto = z.object({
  storeId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(180),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  price: z.number().positive(),
  currency: z.string().length(3).default('XOF'),
  status: ProductStatusEnum.default('DRAFT'),
});

export const UpdateProductDto = CreateProductDto.partial();

export const ProductResponseDto = CreateProductDto.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateProductInput = z.infer<typeof CreateProductDto>;
export type UpdateProductInput = z.infer<typeof UpdateProductDto>;
export type ProductResponse = z.infer<typeof ProductResponseDto>;
`,

      "product-variant.dto": `import { z } from 'zod';

export const CreateProductVariantDto = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(1).max(80),
  name: z.string().min(1).max(180),
  price: z.number().positive().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
});

export const UpdateProductVariantDto = CreateProductVariantDto.partial();

export const ProductVariantResponseDto = CreateProductVariantDto.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateProductVariantInput = z.infer<typeof CreateProductVariantDto>;
export type UpdateProductVariantInput = z.infer<typeof UpdateProductVariantDto>;
export type ProductVariantResponse = z.infer<typeof ProductVariantResponseDto>;
`,

      "product-image.dto": `import { z } from 'zod';

export const CreateProductImageDto = z.object({
  productId: z.string().uuid(),
  key: z.string().min(1).max(500),
  alt: z.string().max(255).optional(),
  position: z.number().int().nonnegative().default(0),
  isPrimary: z.boolean().default(false),
});

export const UpdateProductImageDto = CreateProductImageDto.partial();

export const ProductImageResponseDto = CreateProductImageDto.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type CreateProductImageInput = z.infer<typeof CreateProductImageDto>;
export type UpdateProductImageInput = z.infer<typeof UpdateProductImageDto>;
export type ProductImageResponse = z.infer<typeof ProductImageResponseDto>;
`,

      "inventory.dto": `import { z } from 'zod';

export const UpdateInventoryDto = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
});

export const AdjustInventoryDto = z.object({
  variantId: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().max(255).optional(),
});

export const InventoryResponseDto = UpdateInventoryDto.extend({
  id: z.string().uuid(),
  updatedAt: z.string().datetime(),
});

export type UpdateInventoryInput = z.infer<typeof UpdateInventoryDto>;
export type AdjustInventoryInput = z.infer<typeof AdjustInventoryDto>;
export type InventoryResponse = z.infer<typeof InventoryResponseDto>;
`,

      "service.dto": `import { z } from 'zod';

export const PricingTypeEnum = z.enum(['FIXED', 'HOURLY', 'QUOTE', 'NEGOTIABLE']);
export const ServiceStatusEnum = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'ARCHIVED',
]);

export const CreateServiceDto = z.object({
  professionalId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(180),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  pricingType: PricingTypeEnum.default('QUOTE'),
  price: z.number().positive().nullable().optional(),
  currency: z.string().length(3).default('XOF'),
  status: ServiceStatusEnum.default('DRAFT'),
  durationMin: z.number().int().positive().nullable().optional(),
});

export const UpdateServiceDto = CreateServiceDto.partial();

export const ServiceResponseDto = CreateServiceDto.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateServiceInput = z.infer<typeof CreateServiceDto>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceDto>;
export type ServiceResponse = z.infer<typeof ServiceResponseDto>;
`,

      "catalog-query": `import { z } from 'zod';

export const PaginationDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const SortDto = z.object({
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const CatalogQueryDto = PaginationDto.merge(SortDto).extend({
  search: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  professionalId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
});

export type PaginationInput = z.infer<typeof PaginationDto>;
export type CatalogQueryInput = z.infer<typeof CatalogQueryDto>;
`,
    };

    return (
      header +
      (dtoTemplates[fileName] || `// DTO : ${fileName}\n\nexport {};\n`)
    );
  }

  // ---------- Validators ----------
  if (fileName.endsWith(".validation")) {
    return `${header}import { z } from 'zod';

/**
 * Validateurs transverses du module Catalog.
 * À utiliser dans les controllers / routes.
 */

export const UuidParam = z.object({
  id: z.string().uuid(),
});

export const SlugParam = z.object({
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
});

export const IdParam = UuidParam; // alias

/**
 * Exemple d'utilisation :
 *
 *   const parsed = UuidParam.safeParse(req.params);
 *   if (!parsed.success) throw new ValidationError(parsed.error);
 */
`;
  }

  // ---------- Fallback ----------
  return `${header}export {};\n`;
}

// ============================================================
// Utilitaires
// ============================================================

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  if (fs.existsSync(filePath)) {
    console.log(`⏭️  Existe déjà : ${path.relative(ROOT, filePath)}`);
    return "skipped";
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Créé : ${path.relative(ROOT, filePath)}`);
  return "created";
}

function createEmptyDir(dir) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) {
    ensureDir(fullDir);
    // Créer un .gitkeep pour versionner les dossiers vides
    const gitkeep = path.join(fullDir, ".gitkeep");
    if (!fs.existsSync(gitkeep)) {
      fs.writeFileSync(gitkeep, "");
    }
    console.log(`📁 Créé : ${dir}/  (+ .gitkeep)`);
  } else {
    console.log(`⏭️  Existe déjà : ${dir}/`);
  }
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log("\n🚀 Création de l'arborescence du module Catalog...\n");
  console.log(`📁 Racine : ${ROOT}\n`);

  let created = 0;
  let skipped = 0;

  for (const [dir, files] of Object.entries(structure)) {
    if (files.length === 0) {
      // Dossier vide → ajouter .gitkeep
      createEmptyDir(dir);
      continue;
    }

    const fullDir = path.join(ROOT, dir);
    ensureDir(fullDir);

    for (const file of files) {
      const fullPath = path.join(fullDir, file);
      const result = writeFile(fullPath, defaultContent(fullPath));
      if (result === "created") created++;
      else skipped++;
    }
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`✅ Fichiers créés    : ${created}`);
  console.log(`⏭️  Fichiers ignorés : ${skipped}`);
  console.log("─────────────────────────────────────────\n");

  console.log("📂 Arborescence générée :\n");
  console.log(`
apps/api/src/modules/catalog/
├── dto/
│   ├── category.dto.ts
│   ├── product.dto.ts
│   ├── product-variant.dto.ts
│   ├── product-image.dto.ts
│   ├── inventory.dto.ts
│   ├── service.dto.ts
│   └── catalog-query.dto.ts
├── validators/
│   └── catalog.validation.ts
├── repositories/
│   └── .gitkeep
├── services/
│   └── .gitkeep
├── controllers/
│   └── .gitkeep
└── routes/
    └── .gitkeep
  `);

  console.log("\n✨ Terminé !\n");
  console.log("📌 Prochaines étapes suggérées :");
  console.log(
    "  1. Ajouter les modèles Prisma : Category, Product, ProductVariant, ProductImage, Inventory",
  );
  console.log(
    "  2. Créer les repositories (category.repository.ts, product.repository.ts, ...)",
  );
  console.log(
    "  3. Créer les services métier (catalog.service.ts, inventory.service.ts, ...)",
  );
  console.log("  4. Créer les controllers et routes");
  console.log("  5. Ajouter l'index.ts du module Catalog\n");
}

main();
