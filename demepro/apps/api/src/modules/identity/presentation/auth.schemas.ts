/**
 * apps/api/src/modules/identity/presentation/auth.schemas.ts
 */

import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email().optional(),

    phone: z.string().min(8).max(30).optional(),

    password: z.string().min(8).max(128),

    firstName: z.string().trim().min(2).max(100),

    lastName: z.string().trim().min(2).max(100),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Email ou téléphone obligatoire",
  });

export const loginSchema = z.object({
  identifier: z.string().min(3),

  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
