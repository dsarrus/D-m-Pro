// apps/api/tests/setup/test-app.ts

import express, { Express } from "express";

import catalogRoutes from "../../src/modules/catalog/routes/catalog.routes";
import { errorHandler } from "../../src/shared/middleware/error-handler";

export function createTestApp(): Express {
  const app = express();

  app.use(express.json());

  /**
   * En NODE_ENV=test, les middlewares `authenticate` et
   * `requirePermission` détectent automatiquement le header
   * `X-Test-User-Id` et court-circuitent la vraie auth.
   *
   * Rien à faire ici : la logique est dans les middlewares.
   */

  app.use("/api/v1/catalog", catalogRoutes);

  app.use(errorHandler);

  return app;
}