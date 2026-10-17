// apps/api/src/app/app.ts

import express, { type Express } from "express";

import catalogRoutes from "../modules/catalog/routes/catalog.routes";
import storeRoutes from "../modules/stores/routes/store.routes";
import categoryRoutes from "../modules/category/routes/category.routes";
import verificationRoutes from "../modules/verification/routes/verification.routes";
import orderRoutes from "../modules/orders/routes/order.routes"; 
import addressRoutes from "../modules/address/routes/address.routes";
import notificationRoutes from "../modules/notifications/routes/notification.routes";
import serviceRoutes from "../modules/services/routes/service.routes";
import quoteRoutes  from "../modules/quotes/routes/quote.routes";
import bookingRoutes from "../modules/bookings/routes/booking.routes";
import {
  paymentBookingRouter,
  paymentOrderRouter,
  paymentWebhookRouter,
} from "../modules/payments/routes/payment.routes"; 

import { errorHandler } from "../shared/middleware/error-handler";

export function createApp(): Express {
  const app = express();

  /* Webhooks AVANT express.json() */
  app.use("/api/v1/webhooks/payment", paymentWebhookRouter);

  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1/catalog", catalogRoutes);
  app.use("/api/v1/stores", storeRoutes);
  app.use("/api/v1/categories", categoryRoutes);
  app.use("/api/v1", verificationRoutes);
  app.use("/api/v1/orders", orderRoutes); 
  app.use("/api/v1/addresses", addressRoutes);
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

export const app = createApp();