import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, httpError, serializeParticipant } from "../lib/api.js";
import { getSettings } from "../services/settings.js";

export const publicRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(process.env.UPLOAD_MAX_MB ?? 8) * 1024 * 1024 } });

publicRouter.get("/badge/:qrToken", asyncHandler(async (req, res) => {
  const participant = await prisma.participant.findUnique({
    where: { qrToken: req.params.qrToken },
    include: { passages: { where: { isCancelled: false }, orderBy: { scannedAt: "desc" }, take: 1 } },
  });
  if (!participant || !participant.isActive) throw httpError(404, "Badge introuvable");
  res.json(serializeParticipant(participant));
}));

publicRouter.post("/badge/:qrToken/photo", rateLimit({ windowMs: 60_000, max: 5 }), upload.single("photo"), asyncHandler(async (req, res) => {
  const settings = await getSettings();
  if (!settings.allowSelfPhotoUpload) throw httpError(403, "Upload photo désactivé");
  if (!req.file) throw httpError(400, "Photo requise");
  const meta = await sharp(req.file.buffer).metadata().catch(() => null);
  if (!meta?.format || !["jpeg", "png", "webp"].includes(meta.format)) throw httpError(400, "Format photo invalide");
  const participant = await prisma.participant.findUnique({ where: { qrToken: req.params.qrToken } });
  if (!participant || !participant.isActive) throw httpError(404, "Badge introuvable");
  const dir = path.resolve(process.cwd(), "uploads/photos");
  await fs.mkdir(dir, { recursive: true });
  const ext = meta.format === "jpeg" ? "jpg" : meta.format;
  const fileName = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  await sharp(req.file.buffer).resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).toFile(path.join(dir, fileName));
  const updated = await prisma.participant.update({ where: { id: participant.id }, data: { photoPath: `/uploads/photos/${fileName}` } });
  res.json(serializeParticipant(updated));
}));
