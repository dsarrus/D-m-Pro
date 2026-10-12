// apps/api/src/modules/address/services/address.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { AddressRepository } from "../repositories/address.repository";
import { AddressError, AddressErrorCode } from "../errors/address.error";

import type {
  CreateAddressDto,
  UpdateAddressDto,
} from "../dtos/address.dto";

/* ================================================================
 * TYPES
 * ================================================================ */

export type AuthContext = {
  userId: string;
  role?: string;
  permissions?: string[];
};

const SERIALIZABLE_MAX_ATTEMPTS = 3;
const TRANSACTION_TIMEOUT_MS = 15000;

/* ================================================================
 * SERVICE
 * ================================================================ */

export class AddressService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: AddressRepository,
  ) {}

  /* ================================================================
   * HELPERS
   * ================================================================ */

  private async withSerializableRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = SERIALIZABLE_MAX_ATTEMPTS,
  ): Promise<T> {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;

        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";

        if (!isSerializationConflict || attempt >= maxAttempts) {
          throw error;
        }

        const delay =
          Math.min(100 * 2 ** attempt, 2000) +
          Math.floor(Math.random() * 100);

        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  /**
   * Charge une adresse et vérifie la propriété.
   */
  private async loadAuthorizedAddress(
    db: Prisma.TransactionClient | PrismaClient,
    addressId: string,
    userId: string,
  ) {
    const address = await this.repository.findById(addressId, db);

    if (!address) {
      throw new AddressError(
        AddressErrorCode.ADDRESS_NOT_FOUND,
        "Adresse introuvable.",
      );
    }

    if (address.userId !== userId) {
      throw new AddressError(
        AddressErrorCode.UNAUTHORIZED_ADDRESS,
        "Vous n'êtes pas autorisé à modifier cette adresse.",
      );
    }

    return address;
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  async createAddress(dto: CreateAddressDto, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            /* Vérifier la limite */
            const count = await this.repository.countByUser(
              ctx.userId,
              tx,
            );

            if (count >= AddressRepository.MAX_ADDRESSES_PER_USER) {
              throw new AddressError(
                AddressErrorCode.ADDRESS_LIMIT_REACHED,
                `Vous ne pouvez pas avoir plus de ${AddressRepository.MAX_ADDRESSES_PER_USER} adresses.`,
              );
            }

            /* Si première adresse, forcer isDefault = true */
            const isFirst = count === 0;
            const shouldBeDefault = dto.isDefault || isFirst;

            /* Si on passe isDefault = true, démarquer les autres */
            if (shouldBeDefault && !isFirst) {
              await this.repository.unsetDefault(ctx.userId, tx);
            }

            return this.repository.create(
              {
                user: { connect: { id: ctx.userId } },
                label: dto.label,
                type: dto.type,
                recipientName: dto.recipientName,
                phone: dto.phone ?? null,
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2 ?? null,
                city: dto.city,
                region: dto.region ?? null,
                countryCode: dto.countryCode,
                latitude:
                  dto.latitude != null
                    ? new Prisma.Decimal(dto.latitude)
                    : null,
                longitude:
                  dto.longitude != null
                    ? new Prisma.Decimal(dto.longitude)
                    : null,
                isDefault: shouldBeDefault,
              },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof AddressError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new AddressError(
            AddressErrorCode.ADDRESS_ALREADY_DEFAULT,
            "Une adresse par défaut existe déjà.",
          );
        }
      }
      throw error;
    }
  }

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  async listMyAddresses(ctx: AuthContext) {
    return this.repository.listByUser(ctx.userId);
  }

  async getAddress(addressId: string, ctx: AuthContext) {
    return this.loadAuthorizedAddress(this.prisma, addressId, ctx.userId);
  }

  async getDefaultAddress(ctx: AuthContext) {
    const address = await this.repository.findDefault(ctx.userId);

    if (!address) {
      throw new AddressError(
        AddressErrorCode.ADDRESS_NOT_FOUND,
        "Aucune adresse par défaut.",
      );
    }

    return address;
  }

  /* ================================================================
   * UPDATE
   * ================================================================ */

  async updateAddress(
    addressId: string,
    dto: UpdateAddressDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const address = await this.loadAuthorizedAddress(
              tx,
              addressId,
              ctx.userId,
            );

            /* ----- Gestion du default ----- */
            if (dto.isDefault === true && !address.isDefault) {
              await this.repository.unsetDefault(ctx.userId, tx);
            }

            /* Refus : retirer le statut default sans en promouvoir une autre */
            if (dto.isDefault === false && address.isDefault) {
              const other = await tx.address.findFirst({
                where: {
                  userId: ctx.userId,
                  NOT: { id: addressId },
                },
                select: { id: true },
              });

              if (!other) {
                throw new AddressError(
                  AddressErrorCode.ADDRESS_IS_DEFAULT,
                  "Impossible de retirer le statut par défaut : aucune autre adresse.",
                );
              }
            }

            /* ----- Construire le patch ----- */
            const data: Prisma.AddressUpdateInput = {};

            if (dto.label !== undefined) data.label = dto.label;
            if (dto.type !== undefined) data.type = dto.type;
            if (dto.recipientName !== undefined) {
              data.recipientName = dto.recipientName;
            }
            if (dto.phone !== undefined) data.phone = dto.phone;
            if (dto.addressLine1 !== undefined) {
              data.addressLine1 = dto.addressLine1;
            }
            if (dto.addressLine2 !== undefined) {
              data.addressLine2 = dto.addressLine2;
            }
            if (dto.city !== undefined) data.city = dto.city;
            if (dto.region !== undefined) data.region = dto.region;
            if (dto.countryCode !== undefined) {
              data.countryCode = dto.countryCode;
            }
            if (dto.latitude !== undefined) {
              data.latitude = dto.latitude != null
                ? new Prisma.Decimal(dto.latitude)
                : null;
            }
            if (dto.longitude !== undefined) {
              data.longitude = dto.longitude != null
                ? new Prisma.Decimal(dto.longitude)
                : null;
            }
            if (dto.isDefault !== undefined) {
              data.isDefault = dto.isDefault;
            }

            return this.repository.update(addressId, data, tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof AddressError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * SET DEFAULT
   * ================================================================ */

  async setDefaultAddress(addressId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const address = await this.loadAuthorizedAddress(
              tx,
              addressId,
              ctx.userId,
            );

            if (address.isDefault) {
              return address;
            }

            await this.repository.unsetDefault(ctx.userId, tx);

            return this.repository.update(
              addressId,
              { isDefault: true },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof AddressError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * DELETE
   * ================================================================ */

  async deleteAddress(addressId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const address = await this.loadAuthorizedAddress(
              tx,
              addressId,
              ctx.userId,
            );

            await this.repository.delete(addressId, tx);

            /* Si c'était l'adresse par défaut, promouvoir la première restante */
            if (address.isDefault) {
              const next = await tx.address.findFirst({
                where: { userId: ctx.userId },
                orderBy: { createdAt: "desc" },
              });

              if (next) {
                await this.repository.update(
                  next.id,
                  { isDefault: true },
                  tx,
                );
              }
            }

            return { id: addressId };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof AddressError) throw error;
      throw error;
    }
  }
}