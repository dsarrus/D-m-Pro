// apps/api/tests/setup/test-app.ts

import express, { type Express } from "express";

import catalogRoutes from "../../src/modules/catalog/routes/catalog.routes";
import storeRoutes from "../../src/modules/stores/routes/store.routes";
import categoryRoutes from "../../src/modules/category/routes/category.routes";
import verificationRoutes from "../../src/modules/verification/routes/verification.routes";

import { errorHandler } from "../../src/shared/middleware/error-handler";

export function createTestApp(): Express {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  /* En NODE_ENV=test, les middlewares `authenticate` et
   * `requirePermission` détectent automatiquement le header
   * `X-Test-User-Id` et court-circuitent la vraie auth. */

  app.use("/api/v1/catalog", catalogRoutes);
  app.use("/api/v1/stores", storeRoutes);
  app.use("/api/v1/categories", categoryRoutes);
  app.use("/api/v1", verificationRoutes);

  app.use(errorHandler);

  return app;
}