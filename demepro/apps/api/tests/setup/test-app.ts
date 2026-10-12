// apps/api/tests/setup/test-app.ts

import express, { type Express } from "express";

import catalogRoutes from "../../src/modules/catalog/routes/catalog.routes";
import storeRoutes from "../../src/modules/stores/routes/store.routes";
import categoryRoutes from "../../src/modules/category/routes/category.routes";
import verificationRoutes from "../../src/modules/verification/routes/verification.routes";
import orderRoutes from "../../src/modules/orders/routes/order.routes"; 
import addressRoutes from "../../src/modules/address/routes/address.routes";
import reviewRoutes from "../../src/modules/reviews/routes/review.routes";
import notificationRoutes from "../../src/modules/notifications/routes/notification.routes";
import serviceRoutes from "../../src/modules/services/routes/service.routes";
import {
  paymentOrderRouter,
  paymentWebhookRouter,
} from "../../src/modules/payments/routes/payment.routes";

import { errorHandler } from "../../src/shared/middleware/error-handler";

export function createTestApp(): Express {
  const app = express();

  app.use("/api/v1/webhooks/payment", paymentWebhookRouter);

  app.use(express.json({ limit: "1mb" }));

  /* En NODE_ENV=test, les middlewares `authenticate` et
   * `requirePermission` détectent automatiquement le header
   * `X-Test-User-Id` et court-circuitent la vraie auth. */

  app.use("/api/v1/catalog", catalogRoutes);
  app.use("/api/v1/stores", storeRoutes);
  app.use("/api/v1/categories", categoryRoutes);
  app.use("/api/v1", verificationRoutes);
  app.use("/api/v1/orders", orderRoutes); 
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/services", serviceRoutes);
  /* Payment imbriqué sous orders */
  app.use("/api/v1/orders/:id/payment", paymentOrderRouter);
  app.use(errorHandler);

  return app;
}