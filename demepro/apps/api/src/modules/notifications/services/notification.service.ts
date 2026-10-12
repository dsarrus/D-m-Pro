// apps/api/src/modules/notifications/services/notification.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationTemplateService } from "./notification-template.service";
import {
  NotificationError,
  NotificationErrorCode,
} from "../errors/notification.error";

import { getEmailProvider } from "../providers/email-provider.factory";
import { getSmsProvider } from "../providers/sms-provider.factory";

/* ================================================================
 * TYPES
 * ================================================================ */

export type AuthContext = {
  userId: string;
  role?: string;
  permissions?: string[];
};

/* ================================================================
 * SERVICE
 * ================================================================ */

export class NotificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: NotificationRepository,
    private readonly templates: NotificationTemplateService,
  ) {}

  /* ================================================================
   * HELPERS PRIVÉS
   * ================================================================ */

  /**
   * Enregistre une notification in-app.
   */
  private async createInApp(
    userId: string,
    type: string,
    template: { title: string; body: string; data?: Record<string, unknown> },
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return this.repository.create(
      {
        user: { connect: { id: userId } },
        type,
        title: template.title,
        body: template.body,
        data: template.data as Prisma.InputJsonValue,
      },
      tx,
    );
  }

  /**
   * Charge les infos nécessaires pour envoyer les notifications liées à une commande.
   */
  private async loadOrderNotificationContext(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: { select: { id: true } },
        store: {
          select: {
            id: true,
            name: true,
            professional: {
              select: {
                userId: true,
                user: {
                  select: { id: true, firstName: true, email: true, phone: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) return null;
    return order;
  }

  /* ================================================================
   * ENVOI GÉNÉRIQUE
   * ================================================================ */

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; providerRef?: string; error?: string }> {
    try {
      const provider = getEmailProvider();
      const result = await provider.send(params);

      if (result.status === "FAILED") {
        console.warn(`[NotificationService] Email échoué: ${result.error}`);
        return { success: false, error: result.error };
      }

      return { success: true, providerRef: result.providerRef };
    } catch (error) {
      console.warn(
        `[NotificationService] Email exception: ${(error as Error).message}`,
      );
      return { success: false, error: (error as Error).message };
    }
  }

  async sendSms(params: {
    to: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; providerRef?: string; error?: string }> {
    try {
      const provider = getSmsProvider();
      const result = await provider.send(params);

      if (result.status === "FAILED") {
        console.warn(`[NotificationService] SMS échoué: ${result.error}`);
        return { success: false, error: result.error };
      }

      return { success: true, providerRef: result.providerRef };
    } catch (error) {
      console.warn(
        `[NotificationService] SMS exception: ${(error as Error).message}`,
      );
      return { success: false, error: (error as Error).message };
    }
  }

  /* ================================================================
   * NOTIFICATIONS COMMANDE
   * ================================================================ */

  async notifyOrderCreated(orderId: string): Promise<void> {
    const order = await this.loadOrderNotificationContext(orderId);
    if (!order) return;

    const customerName = `${order.user.firstName} ${order.user.lastName}`.trim();

    /* ----- In-app ----- */
    try {
      const inApp = this.templates.renderOrderCreatedInApp({ orderId });
      await this.createInApp(order.user.id, "ORDER_CREATED", inApp);
    } catch (error) {
      console.warn("[notifyOrderCreated] In-app failed:", error);
    }

    /* ----- Email ----- */
    if (order.user.email) {
      const email = this.templates.renderOrderCreatedEmail({
        orderId,
        customerName,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        itemCount: order.items.length,
      });

      await this.sendEmail({
        to: order.user.email,
        ...email,
        metadata: { orderId, type: "ORDER_CREATED" },
      });
    }

    /* ----- SMS ----- */
    if (order.user.phone) {
      const sms = this.templates.renderOrderCreatedSms({
        orderId,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
      });

      await this.sendSms({
        to: order.user.phone,
        ...sms,
        metadata: { orderId, type: "ORDER_CREATED" },
      });
    }

    /* ----- Notifier le pro (in-app) ----- */
    try {
      const proUserId = order.store.professional.user.id;
      await this.createInApp(proUserId, "ORDER_RECEIVED", {
        title: "Nouvelle commande reçue",
        body: `Vous avez reçu une commande #${orderId.slice(0, 8)}.`,
        data: { orderId, type: "ORDER_RECEIVED" },
      });
    } catch (error) {
      console.warn("[notifyOrderCreated] Pro notification failed:", error);
    }
  }

  async notifyOrderPaid(orderId: string): Promise<void> {
    const order = await this.loadOrderNotificationContext(orderId);
    if (!order) return;

    const customerName = `${order.user.firstName} ${order.user.lastName}`.trim();

    try {
      const inApp = this.templates.renderOrderPaidInApp({ orderId });
      await this.createInApp(order.user.id, "ORDER_PAID", inApp);
    } catch (error) {
      console.warn("[notifyOrderPaid] In-app failed:", error);
    }

    if (order.user.email) {
      const email = this.templates.renderOrderPaidEmail({
        orderId,
        customerName,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
      });

      await this.sendEmail({
        to: order.user.email,
        ...email,
        metadata: { orderId, type: "ORDER_PAID" },
      });
    }

    if (order.user.phone) {
      const sms = this.templates.renderOrderPaidSms({
        orderId,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
      });

      await this.sendSms({
        to: order.user.phone,
        ...sms,
        metadata: { orderId, type: "ORDER_PAID" },
      });
    }

    /* ----- Notifier le pro ----- */
    try {
      const proUserId = order.store.professional.user.id;
      await this.createInApp(proUserId, "ORDER_PAID", {
        title: "Commande payée",
        body: `La commande #${orderId.slice(0, 8)} a été payée. Préparez-la.`,
        data: { orderId, type: "ORDER_PAID" },
      });
    } catch (error) {
      console.warn("[notifyOrderPaid] Pro notification failed:", error);
    }
  }

  async notifyOrderShipped(orderId: string): Promise<void> {
    const order = await this.loadOrderNotificationContext(orderId);
    if (!order) return;

    const customerName = `${order.user.firstName} ${order.user.lastName}`.trim();

    try {
      const inApp = this.templates.renderOrderShippedInApp({ orderId });
      await this.createInApp(order.user.id, "ORDER_SHIPPED", inApp);
    } catch (error) {
      console.warn("[notifyOrderShipped] In-app failed:", error);
    }

    if (order.user.email) {
      const email = this.templates.renderOrderShippedEmail({
        orderId,
        customerName,
      });

      await this.sendEmail({
        to: order.user.email,
        ...email,
        metadata: { orderId, type: "ORDER_SHIPPED" },
      });
    }

    if (order.user.phone) {
      const sms = this.templates.renderOrderShippedSms({ orderId });
      await this.sendSms({
        to: order.user.phone,
        ...sms,
        metadata: { orderId, type: "ORDER_SHIPPED" },
      });
    }
  }

  async notifyOrderDelivered(orderId: string): Promise<void> {
    const order = await this.loadOrderNotificationContext(orderId);
    if (!order) return;

    const customerName = `${order.user.firstName} ${order.user.lastName}`.trim();

    try {
      const inApp = this.templates.renderOrderDeliveredInApp({ orderId });
      await this.createInApp(order.user.id, "ORDER_DELIVERED", inApp);
    } catch (error) {
      console.warn("[notifyOrderDelivered] In-app failed:", error);
    }

    if (order.user.email) {
      const email = this.templates.renderOrderDeliveredEmail({
        orderId,
        customerName,
      });

      await this.sendEmail({
        to: order.user.email,
        ...email,
        metadata: { orderId, type: "ORDER_DELIVERED" },
      });
    }

    if (order.user.phone) {
      const sms = this.templates.renderOrderDeliveredSms({ orderId });
      await this.sendSms({
        to: order.user.phone,
        ...sms,
        metadata: { orderId, type: "ORDER_DELIVERED" },
      });
    }
  }

  /* ================================================================
   * NOTIFICATIONS AVIS
   * ================================================================ */

  async notifyReviewReceived(reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        store: {
          select: {
            id: true,
            professional: {
              select: {
                userId: true,
                user: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!review || !review.store) return;

    try {
      const inApp = this.templates.renderReviewReceivedInApp({
        reviewId,
        rating: review.rating,
      });

      await this.createInApp(
        review.store.professional.user.id,
        "REVIEW_RECEIVED",
        inApp,
      );
    } catch (error) {
      console.warn("[notifyReviewReceived] Failed:", error);
    }
  }

  /* ================================================================
   * LECTURE
   * ================================================================ */

  async listMyNotifications(
    ctx: AuthContext,
    options?: { unreadOnly?: boolean; limit?: number; cursor?: string | null },
  ) {
    const results = await this.repository.listByUser(ctx.userId, options);

    const limit = Math.min(options?.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  async getUnreadCount(ctx: AuthContext): Promise<number> {
    return this.repository.countUnread(ctx.userId);
  }

  async markAsRead(notificationId: string, ctx: AuthContext) {
    const notification = await this.repository.findById(notificationId);

    if (!notification) {
      throw new NotificationError(
        NotificationErrorCode.NOTIFICATION_NOT_FOUND,
        "Notification introuvable.",
      );
    }

    if (notification.userId !== ctx.userId) {
      throw new NotificationError(
        NotificationErrorCode.UNAUTHORIZED_NOTIFICATION,
        "Vous n'êtes pas autorisé à modifier cette notification.",
      );
    }

    if (notification.readAt) {
      return notification;
    }

    return this.repository.markAsRead(notificationId);
  }

  async markAllAsRead(ctx: AuthContext) {
    const result = await this.repository.markAllAsRead(ctx.userId);
    return { count: result.count };
  }
}