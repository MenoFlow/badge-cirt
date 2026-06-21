import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, httpError, serializeParticipant } from "../lib/api.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBadgePdf } from "../services/badges.js";
import { describeMailError, sendMailWithAttachments } from "../services/mailer.js";

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

badgesRouter.post("/email/group/:groupName", asyncHandler(async (req, res) => {
  const participants = await prisma.participant.findMany({
    where: { isActive: true, groupName: req.params.groupName },
    orderBy: { badgeCode: "asc" },
  });
  const results = [];
  for (const participant of participants) {
    results.push(await sendParticipantBadge(participant.id, { skipAlreadySent: req.query.force !== "true" }));
  }
  res.json({
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  });
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

badgesRouter.post("/:participantId/email", asyncHandler(async (req, res) => {
  res.json(await sendParticipantBadge(req.params.participantId, { skipAlreadySent: req.query.force !== "true" }));
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

async function sendParticipantBadge(participantId: string, options: { skipAlreadySent: boolean }) {
  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant) throw httpError(404, "Participant introuvable");
  if (!participant.email) {
    return { ok: false, participantId, badgeCode: participant.badgeCode, fullName: participant.fullName, error: "Aucun email renseigné" };
  }

  const existingDelivery = await prisma.badgeEmailDelivery.findUnique({ where: { participantId } });
  if (options.skipAlreadySent && existingDelivery?.status === "SENT") {
    return {
      ok: true,
      skipped: true,
      participantId,
      badgeCode: participant.badgeCode,
      fullName: participant.fullName,
      email: participant.email,
      sentAt: existingDelivery.sentAt?.toISOString(),
      message: "Badge déjà envoyé",
    };
  }

  try {
    const pdf = await createBadgePdf([participant.id]);
    const eventTitle = "CTF / Hackathon";
    const subject = `[CTF / Hackathon 2026] Votre badge de participant`;
    const { messageId } = await sendMailWithAttachments({
      to: participant.email,
      subject,
      text: [
        `Bonjour ${participant.fullName},`,
        "",
        `Félicitations pour votre sélection au ${eventTitle} !`,
        "",
        "Vous trouverez votre badge de participant en pièce jointe. Merci de le présenter à l’entrée (sur votre téléphone ou imprimé) accompagné d'une pièce d'identité.",
        "",
        "Rappel des informations clés :",
        "",
        "Lieu : Novotel Convention & Spa, Antananarivo",
        "",
        "Dates : Lundi 22 et mardi 23 juin 2026",
        "Heures: 08 heures",
        "",
        "À très vite,",
        "",
        "L’équipe d’organisation",
      ].filter(Boolean).join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;color:#1f1733;line-height:1.5">
          <p>Bonjour <strong>${escapeHtml(participant.fullName)}</strong>,</p>
          <p>Félicitations pour votre sélection au <strong>${escapeHtml(eventTitle)}</strong> !</p>
          <p>Vous trouverez votre badge de participant en pièce jointe. Merci de le présenter à l’entrée (sur votre téléphone ou imprimé) accompagné d'une pièce d'identité.</p>
          <p><strong>Rappel des informations clés :</strong></p>
          <p><strong>Lieu :</strong> Novotel Convention &amp; Spa, Antananarivo</p>
          <p><strong>Dates :</strong> Lundi 22 et mardi 23 juin 2026<br><strong>Heures:</strong> 08 heures</p>
          <p>À très vite,</p>
          <p>L’équipe d’organisation</p>
        </div>
      `,
      attachments: [{
        filename: `${participant.badgeCode}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      }],
    });

    await prisma.badgeEmailDelivery.upsert({
      where: { participantId },
      create: {
        participantId,
        recipientEmail: participant.email,
        status: "SENT",
        messageId,
        sentAt: new Date(),
      },
      update: {
        recipientEmail: participant.email,
        status: "SENT",
        messageId,
        errorMessage: null,
        sentAt: new Date(),
      },
    });

    return { ok: true, skipped: false, participantId, badgeCode: participant.badgeCode, fullName: participant.fullName, email: participant.email, messageId };
  } catch (error) {
    const errorMessage = describeMailError(error);
    await prisma.badgeEmailDelivery.upsert({
      where: { participantId },
      create: {
        participantId,
        recipientEmail: participant.email,
        status: "FAILED",
        errorMessage,
      },
      update: {
        recipientEmail: participant.email,
        status: "FAILED",
        errorMessage,
      },
    });

    return { ok: false, participantId, badgeCode: participant.badgeCode, fullName: participant.fullName, email: participant.email, error: errorMessage };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
