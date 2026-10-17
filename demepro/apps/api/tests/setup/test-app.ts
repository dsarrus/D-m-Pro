// apps/api/tests/setup/test-app.ts

import express, { type Express } from "express";
import { vi } from "vitest";

import catalogRoutes from "../../src/modules/catalog/routes/catalog.routes";
import storeRoutes from "../../src/modules/stores/routes/store.routes";
import categoryRoutes from "../../src/modules/category/routes/category.routes";
import verificationRoutes from "../../src/modules/verification/routes/verification.routes";
import orderRoutes from "../../src/modules/orders/routes/order.routes";
import addressRoutes from "../../src/modules/address/routes/address.routes";
import reviewRoutes from "../../src/modules/reviews/routes/review.routes";
import notificationRoutes from "../../src/modules/notifications/routes/notification.routes";
import serviceRoutes from "../../src/modules/services/routes/service.routes";
import quoteRoutes from "../../src/modules/quotes/routes/quote.routes";
import bookingRoutes from "../../src/modules/bookings/routes/booking.routes";
import {
  paymentBookingRouter,
  paymentOrderRouter,
  paymentWebhookRouter,
} from "../../src/modules/payments/routes/payment.routes";

import { NotificationService } from "../../src/modules/notifications/services/notification.service";

import { errorHandler } from "../../src/shared/middleware/error-handler";

/* ================================================================
 * MOCK GLOBAL DES NOTIFICATIONS EN TEST
 *
 * Les notifications métier (order.*, booking.*, quote.*, review.*)
 * sont fire-and-forget (`void ... .catch(...)`). En test, elles
 * peuvent :
 *
 *  1. Continuer après la fin du test et provoquer un deadlock
 *     PostgreSQL (40P01) lors du TRUNCATE du test suivant.
 *
 *  2. Échouer bruyamment (P2025 "No 'User' record") parce que le
 *     `truncateAll()` du test suivant a supprimé le User avant que
 *     l'INSERT notification ne soit persisté.
 *
 * On neutralise ces méthodes en test. Les tests dédiés au module
 * notifications peuvent appeler `vi.restoreAllMocks()` pour
 * rétablir les vraies implémentations.
 * ================================================================ */

const noopNotification = () => Promise.resolve();

// Order
vi.spyOn(NotificationService.prototype, "notifyOrderCreated").mockImplementation(noopNotification);
vi.spyOn(NotificationService.prototype, "notifyOrderPaid").mockImplementation(noopNotification);
vi.spyOn(NotificationService.prototype, "notifyOrderShipped").mockImplementation(noopNotification);
vi.spyOn(NotificationService.prototype, "notifyOrderDelivered").mockImplementation(noopNotification);

// Review
vi.spyOn(NotificationService.prototype, "notifyReviewReceived").mockImplementation(noopNotification);

// Quote
vi.spyOn(NotificationService.prototype, "notifyQuoteReceived").mockImplementation(noopNotification);
vi.spyOn(NotificationService.prototype, "notifyQuoteResponded").mockImplementation(noopNotification);
vi.spyOn(NotificationService.prototype, "notifyQuoteAccepted").mockImplementation(noopNotification);

// Booking
vi.spyOn(NotificationService.prototype, "notifyBookingCreated").mockImplementation(noopNotification);
vi.spyOn(NotificationService.prototype, "notifyBookingCompleted").mockImplementation(noopNotification);
vi.spyOn(NotificationService.prototype, "notifyBookingCancelled").mockImplementation(noopNotification);

/* ================================================================
 * APP FACTORY
 * ================================================================ */

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
  app.use("/api/v1/quotes", quoteRoutes);
  app.use("/api/v1/bookings", bookingRoutes);

  /* Payment imbriqué sous orders */
  app.use("/api/v1/orders/:id/payment", paymentOrderRouter);
app.use("/api/v1/bookings/:id/payment", paymentBookingRouter);

  app.use(errorHandler);

  return app;
}