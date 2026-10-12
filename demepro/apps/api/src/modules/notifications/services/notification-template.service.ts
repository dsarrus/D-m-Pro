// apps/api/src/modules/notifications/services/notification-template.service.ts

import { NotificationError, NotificationErrorCode } from "../errors/notification.error";

/* ================================================================
 * TYPES
 * ================================================================ */

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export type SmsTemplate = {
  body: string;
};

export type InAppTemplate = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/* ================================================================
 * SERVICE
 * ================================================================ */

export class NotificationTemplateService {
  /* ================================================================
   * EMAIL
   * ================================================================ */

  renderOrderCreatedEmail(params: {
    orderId: string;
    customerName: string;
    totalAmount: number;
    currency: string;
    itemCount: number;
  }): EmailTemplate {
    const orderShort = params.orderId.slice(0, 8);

    return {
      subject: `Votre commande #${orderShort} est confirmée`,
      html: `
        <h2>Merci ${params.customerName} !</h2>
        <p>Votre commande <strong>#${orderShort}</strong> a bien été enregistrée.</p>
        <p>${params.itemCount} article(s) - Total : <strong>${params.totalAmount} ${params.currency}</strong></p>
        <p>Nous vous préviendrons dès que votre commande sera expédiée.</p>
      `,
      text: `Merci ${params.customerName} ! Commande #${orderShort} confirmée. Total : ${params.totalAmount} ${params.currency}.`,
    };
  }

  renderOrderPaidEmail(params: {
    orderId: string;
    customerName: string;
    totalAmount: number;
    currency: string;
  }): EmailTemplate {
    const orderShort = params.orderId.slice(0, 8);

    return {
      subject: `Paiement confirmé - Commande #${orderShort}`,
      html: `
        <h2>Paiement reçu !</h2>
        <p>Nous avons bien reçu votre paiement de <strong>${params.totalAmount} ${params.currency}</strong>.</p>
        <p>Votre commande <strong>#${orderShort}</strong> est maintenant en préparation.</p>
      `,
      text: `Paiement confirmé. Commande #${orderShort}, ${params.totalAmount} ${params.currency}.`,
    };
  }

  renderOrderShippedEmail(params: {
    orderId: string;
    customerName: string;
    trackingNumber?: string | null;
  }): EmailTemplate {
    const orderShort = params.orderId.slice(0, 8);

    return {
      subject: `Votre commande #${orderShort} est expédiée`,
      html: `
        <h2>Bonne nouvelle !</h2>
        <p>Votre commande <strong>#${orderShort}</strong> a été expédiée.</p>
        ${
          params.trackingNumber
            ? `<p>Numéro de suivi : <code>${params.trackingNumber}</code></p>`
            : ""
        }
        <p>Vous la recevrez très bientôt.</p>
      `,
      text: `Commande #${orderShort} expédiée.${
        params.trackingNumber ? ` Suivi : ${params.trackingNumber}` : ""
      }`,
    };
  }

  renderOrderDeliveredEmail(params: {
    orderId: string;
    customerName: string;
  }): EmailTemplate {
    const orderShort = params.orderId.slice(0, 8);

    return {
      subject: `Votre commande #${orderShort} est livrée`,
      html: `
        <h2>Colis livré !</h2>
        <p>Votre commande <strong>#${orderShort}</strong> a été livrée.</p>
        <p>N'hésitez pas à laisser un avis sur votre achat.</p>
      `,
      text: `Commande #${orderShort} livrée. Laissez un avis !`,
    };
  }

  /* ================================================================
   * SMS
   * ================================================================ */

  renderOrderCreatedSms(params: {
    orderId: string;
    totalAmount: number;
    currency: string;
  }): SmsTemplate {
    const orderShort = params.orderId.slice(0, 8);
    return {
      body: `DɛmɛPro: Commande #${orderShort} confirmée. Total: ${params.totalAmount} ${params.currency}.`,
    };
  }

  renderOrderPaidSms(params: {
    orderId: string;
    totalAmount: number;
    currency: string;
  }): SmsTemplate {
    const orderShort = params.orderId.slice(0, 8);
    return {
      body: `DɛmɛPro: Paiement reçu pour #${orderShort}. ${params.totalAmount} ${params.currency}.`,
    };
  }

  renderOrderShippedSms(params: {
    orderId: string;
  }): SmsTemplate {
    const orderShort = params.orderId.slice(0, 8);
    return {
      body: `DɛmɛPro: Commande #${orderShort} expédiée. Vous la recevrez bientôt.`,
    };
  }

  renderOrderDeliveredSms(params: {
    orderId: string;
  }): SmsTemplate {
    const orderShort = params.orderId.slice(0, 8);
    return {
      body: `DɛmɛPro: Commande #${orderShort} livrée. Merci !`,
    };
  }

  /* ================================================================
   * IN-APP
   * ================================================================ */

  renderOrderCreatedInApp(params: {
    orderId: string;
  }): InAppTemplate {
    const orderShort = params.orderId.slice(0, 8);
    return {
      title: "Commande confirmée",
      body: `Votre commande #${orderShort} a bien été enregistrée.`,
      data: { orderId: params.orderId, type: "ORDER_CREATED" },
    };
  }

  renderOrderPaidInApp(params: {
    orderId: string;
  }): InAppTemplate {
    const orderShort = params.orderId.slice(0, 8);
    return {
      title: "Paiement confirmé",
      body: `Paiement reçu pour la commande #${orderShort}.`,
      data: { orderId: params.orderId, type: "ORDER_PAID" },
    };
  }

  renderOrderShippedInApp(params: {
    orderId: string;
  }): InAppTemplate {
    const orderShort = params.orderId.slice(0, 8);
    return {
      title: "Commande expédiée",
      body: `Votre commande #${orderShort} est en route.`,
      data: { orderId: params.orderId, type: "ORDER_SHIPPED" },
    };
  }

  renderOrderDeliveredInApp(params: {
    orderId: string;
  }): InAppTemplate {
    const orderShort = params.orderId.slice(0, 8);
    return {
      title: "Commande livrée",
      body: `Votre commande #${orderShort} a été livrée.`,
      data: { orderId: params.orderId, type: "ORDER_DELIVERED" },
    };
  }

  renderReviewReceivedInApp(params: {
    reviewId: string;
    rating: number;
  }): InAppTemplate {
    return {
      title: "Nouvel avis reçu",
      body: `Vous avez reçu un avis ${params.rating}/5 étoiles.`,
      data: { reviewId: params.reviewId, type: "REVIEW_RECEIVED" },
    };
  }
}