import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, httpError, serializeParticipant } from "../lib/api.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBadgePdf } from "../services/badges.js";

export const badgesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

badgesRouter.use(requireAuth, requireRole("ADMIN", "SUPERVISOR", "REPORT_AGENT"));

badgesRouter.get("/batch/pdf", asyncHandler(async (_req, res) => {
  const participants = await prisma.participant.findMany({ where: { isActive: true }, select: { id: true }, orderBy: { badgeCode: "asc" } });
  const pdf = await createBadgePdf(participants.map((p) => p.id));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=badges-cirt.pdf");
  res.send(pdf);
}));

badgesRouter.get("/batch/category/:category/pdf", asyncHandler(async (req, res) => {
  const participants = await prisma.participant.findMany({ where: { isActive: true, sourceCategory: req.params.category }, select: { id: true } });
  const pdf = await createBadgePdf(participants.map((p) => p.id));
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdf);
}));

badgesRouter.get("/batch/group/:groupName/pdf", asyncHandler(async (req, res) => {
  const participants = await prisma.participant.findMany({ where: { isActive: true, groupName: req.params.groupName }, select: { id: true } });
  const pdf = await createBadgePdf(participants.map((p) => p.id));
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdf);
}));

badgesRouter.get("/:participantId", asyncHandler(async (req, res) => {
  const participant = await prisma.participant.findUnique({
    where: { id: req.params.participantId },
    include: { passages: { where: { isCancelled: false }, orderBy: { scannedAt: "desc" }, take: 1 } },
  });
  if (!participant) throw httpError(404, "Participant introuvable");
  res.json(serializeParticipant(participant));
}));

badgesRouter.get("/:participantId/pdf", asyncHandler(async (req, res) => {
  const pdf = await createBadgePdf([req.params.participantId]);
  if (pdf.length < 1000) throw httpError(404, "Participant introuvable");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=badge-cirt.pdf");
  res.send(pdf);
}));

badgesRouter.get("/preview/:participantId", asyncHandler(async (req, res) => {
  const pdf = await createBadgePdf([req.params.participantId]);
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdf);
}));

async function storeUpload(reqFile: Express.Multer.File, folder: string) {
  const dir = path.resolve(process.cwd(), "uploads", folder);
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(reqFile.originalname).toLowerCase() || ".bin";
  const fileName = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  await fs.writeFile(path.join(dir, fileName), reqFile.buffer, { mode: 0o600 });
  return `/uploads/${folder}/${fileName}`;
}

badgesRouter.post("/template", requireRole("ADMIN"), upload.single("template"), asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, "Fichier requis");
  const templatePath = await storeUpload(req.file, "templates");
  const template = await prisma.badgeTemplate.create({ data: { name: req.file.originalname, templatePath, isDefault: true } });
  res.status(201).json(template);
}));

badgesRouter.post("/logos", requireRole("ADMIN"), upload.array("logos", 3), asyncHandler(async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  const paths = [];
  for (const file of files) paths.push(await storeUpload(file, "logos"));
  res.json({ paths });
}));
