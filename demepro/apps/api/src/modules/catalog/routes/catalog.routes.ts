// apps/api/src/modules/catalog/routes/catalog.routes.ts

import { Router } from "express";

import productRoutes from "./product.routes";
import { productVariantNestedRouter, productVariantDirectRouter } from "./product-variant.routes";
import { productImageNestedRouter, productImageDirectRouter } from "./product-image.routes";
import inventoryRoutes from "./inventory.routes";

const router = Router();

/* ⚠️ ORDRE CRITIQUE — routes imbriquées AVANT routes produit */

/* 1. Variants imbriqués */
router.use("/products/:productId/variants", productVariantNestedRouter);

/* 2. Images imbriquées */
router.use("/products/:productId/images", productImageNestedRouter);

/* 3. Routes produit (sans variants/images imbriqués dedans) */
router.use("/products", productRoutes);

/* 4. Routes directes */
router.use("/variants", productVariantDirectRouter);
router.use("/images", productImageDirectRouter);

/* 5. Inventory */
router.use("/inventory", inventoryRoutes);

export default router;