import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, httpError, parseBody, serializeParticipant } from "../lib/api.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { recordScan } from "../services/scan.js";

export const scanRouter = Router();
scanRouter.use(rateLimit({ windowMs: 60_000, max: 50 }));
scanRouter.use(requireAuth, requireRole("ADMIN", "SUPERVISOR", "SCAN_AGENT"));

const bodySchema = z.object({ badgeCode: z.string().min(1), gateName: z.string().optional() });

scanRouter.post("/code", asyncHandler<AuthedRequest>(async (req, res) => {
  const input = parseBody(bodySchema, req.body);
  const result = await recordScan(input.badgeCode, input.gateName, "MANUAL_BADGE_CODE", req.user!.id);
  if (!result.ok) return res.status(result.status ?? 400).json(result);
  res.json(result);
}));

scanRouter.post("/qr/:qrToken", asyncHandler<AuthedRequest>(async (req, res) => {
  const result = await recordScan(req.params.qrToken, String(req.body?.gateName ?? "Entrée principale"), "QR_SCAN", req.user!.id);
  if (!result.ok) return res.status(result.status ?? 400).json(result);
  res.json(result);
}));

scanRouter.get("/preview/:code", asyncHandler(async (req, res) => {
  const participant = await prisma.participant.findFirst({
    where: { OR: [{ qrToken: req.params.code }, { badgeCode: req.params.code }] },
    include: { passages: { where: { isCancelled: false }, orderBy: { scannedAt: "desc" }, take: 1 } },
  });
  if (!participant) throw httpError(404, "Badge introuvable");
  res.json(serializeParticipant(participant));
}));
