// apps/api/tests/helpers/auth.ts

import type { Express } from "express";
import request from "supertest";

export function asUser(app: Express, userId: string, options?: {
  role?: string;
  permissions?: string[];
}) {
  const withHeaders = (r: request.Test) => {
    r.set("X-Test-User-Id", userId);
    if (options?.role) r.set("X-Test-Role", options.role);
    if (options?.permissions) {
      r.set("X-Test-Permissions", options.permissions.join(","));
    }
    return r;
  };

  return {
    get: (url: string) => withHeaders(request(app).get(url)),
    post: (url: string) => withHeaders(request(app).post(url)),
    patch: (url: string) => withHeaders(request(app).patch(url)),
    delete: (url: string) => withHeaders(request(app).delete(url)),
  };
}