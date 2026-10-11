import { z } from "zod";

/**
 * UUID Prisma
 */
export const uuidSchema = z.string().uuid();

/**
 * Identifiant Mongo/slug-like si nécessaire
 */
export const slugSchema = z
  .string()
  .trim()
  .min(2, "Le slug doit contenir au moins 2 caractères")
  .max(220, "Le slug ne peut pas dépasser 220 caractères")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets",
  );

/**
 * Montant monétaire.
 *
 * On accepte number côté API.
 * La conversion Prisma Decimal sera faite dans le service/repository.
 */
export const moneySchema = z
  .number()
  .finite()
  .nonnegative("Le montant ne peut pas être négatif");

/**
 * Devise.
 */
export const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

/**
 * Pagination.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Tri.
 */
export const sortOrderSchema = z.enum(["asc", "desc"]);

export const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();
