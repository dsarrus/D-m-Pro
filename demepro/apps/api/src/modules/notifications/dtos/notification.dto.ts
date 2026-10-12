// apps/api/src/modules/notifications/dtos/notification.dto.ts

import { z } from "zod";

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().uuid().optional(),
});