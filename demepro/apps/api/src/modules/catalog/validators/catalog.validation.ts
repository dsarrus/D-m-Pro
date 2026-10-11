/**
 * apps/api/src/modules/catalog/validators/catalog.validation.ts
 */

import { z } from 'zod';

/**
 * Validateurs transverses du module Catalog.
 * À utiliser dans les controllers / routes.
 */

export const UuidParam = z.object({
  id: z.string().uuid(),
});

export const SlugParam = z.object({
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
});

export const IdParam = UuidParam; // alias

/**
 * Exemple d'utilisation :
 *
 *   const parsed = UuidParam.safeParse(req.params);
 *   if (!parsed.success) throw new ValidationError(parsed.error);
 */
