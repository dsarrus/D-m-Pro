import { z } from "zod";

export const adjustInventorySchema = z.object({
  delta: z
    .number()
    .int()
    .refine(
      (value) => value !== 0,
      "L'ajustement ne peut pas être égal à zéro.",
    ),
});

export type AdjustInventoryDto = z.infer<typeof adjustInventorySchema>;
