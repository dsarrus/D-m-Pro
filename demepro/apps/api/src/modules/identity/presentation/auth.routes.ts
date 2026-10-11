/**
 * apps/api/src/modules/identity/presentation/auth.routes.ts
 */

import { Router } from "express";

import { AuthService } from "../application/auth.service";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schemas";

const router = Router();
const service = new AuthService();

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const user = await service.register(input);

    return res.status(201).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const result = await service.login(input.identifier, input.password);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const input = refreshSchema.parse(req.body);

    const result = await service.refresh(input.refreshToken);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const input = refreshSchema.parse(req.body);

    await service.logout(input.refreshToken);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  return res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

export default router;
