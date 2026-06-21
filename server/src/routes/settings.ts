import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody } from "../lib/api.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { getSettings } from "../services/settings.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const patchSchema = z.object({
  eventName: z.string().min(1).optional(),
  publicBaseUrl: z.string().url().optional(),
  exitWarningMinutes: z.number().int().min(1).optional(),
  exitCriticalMinutes: z.number().int().min(1).optional(),
  duplicateScanWindowSeconds: z.number().int().min(1).optional(),
  allowSelfPhotoUpload: z.boolean().optional(),
  requirePhotoValidation: z.boolean().optional(),
  bootstrapCompleted: z.boolean().optional(),
});

settingsRouter.get("/", asyncHandler(async (_req, res) => {
  res.json(await getSettings());
}));

settingsRouter.patch("/", requireRole("ADMIN"), asyncHandler<AuthedRequest>(async (req, res) => {
  const input = parseBody(patchSchema, req.body);
  const current = await getSettings();
  const updated = await prisma.setting.update({ where: { id: current.id }, data: input });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "SETTINGS_UPDATE", entityType: "Setting", entityId: updated.id, detailsJson: input } });
  res.json(updated);
}));
