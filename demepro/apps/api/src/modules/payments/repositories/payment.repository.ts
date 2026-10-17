// apps/api/src/modules/payment/repositories/payment.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
            storeId: true,
          },
        },
      },
    });
  }

  async findByOrderId(
    orderId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
            storeId: true,
            store: {
              select: {
                professional: { select: { userId: true } },
              },
            },
          },
        },
      },
    });
  }

  async findByProviderRef(
    providerRef: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.payment.findUnique({
      where: { providerRef },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
      },
    });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.PaymentCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.payment.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.PaymentUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.payment.update({
      where: { id },
      data,
    });
  }

  /* ================================================================
 * BOOKING PAYMENTS
 * ================================================================ */

async findByBookingId(
  bookingId: string,
  tx: Prisma.TransactionClient | PrismaClient = this.prisma,
) {
  return tx.payment.findUnique({
    where: { bookingId },
    include: {
      booking: {
        select: {
          id: true,
          userId: true,
          serviceId: true,
          status: true,
          totalAmount: true,
          currency: true,
          quoteId: true,
        },
      },
    },
  });
}

async createForBooking(
  data: {
    bookingId: string;
    amount: Prisma.Decimal;
    currency: string;
    provider: string;
    status: string;
  },
  tx: Prisma.TransactionClient | PrismaClient = this.prisma,
) {
  return tx.payment.create({
    data: {
      booking: { connect: { id: data.bookingId } },
      amount: data.amount,
      currency: data.currency,
      provider: data.provider as any,
      status: data.status as any,
    },
  });
}
}