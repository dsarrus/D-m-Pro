// apps/api/src/modules/category/routes/category.routes.ts

import { Router } from "express";
import { z } from "zod";

import { CategoryController } from "../controllers/category.controller";
import { CategoryService } from "../services/category.service";
import { CategoryRepository } from "../repositories/category.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from "../dtos/category.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const repository = new CategoryRepository(prisma);
const service = new CategoryService(prisma, repository);
const controller = new CategoryController(service);

const verticalIdParamSchema = z.object({
  verticalId: z.string().uuid(),
});

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* ------------------------------------------------------------------
 * PUBLIC
 * ------------------------------------------------------------------ */

router.get(
  "/",
  validate(listCategoriesQuerySchema, "query"),
  controller.list,
);

router.get(
  "/:id",
  validate(categoryIdParamSchema, "params"),
  controller.getById,
);

router.get(
  "/:id/children",
  validate(categoryIdParamSchema, "params"),
  controller.listChildren,
);

router.get(
  "/vertical/:verticalId/tree",
  validate(verticalIdParamSchema, "params"),
  controller.getTreeByVertical,
);

/* ------------------------------------------------------------------
 * ADMIN
 * ------------------------------------------------------------------ */

router.post(
  "/",
  authenticate,
  requirePermission("category.create"),
  validate(createCategorySchema, "body"),
  controller.create,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("category.update"),
  validate(categoryIdParamSchema, "params"),
  validate(updateCategorySchema, "body"),
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("category.delete"),
  validate(categoryIdParamSchema, "params"),
  controller.delete,
);

export default router;