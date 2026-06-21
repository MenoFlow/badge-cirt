import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { generateBadgeCode, generateQrToken } from "../lib/qrToken.js";
import { asyncHandler, httpError, nullableString, parseBody, serializeParticipant } from "../lib/api.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

export const participantsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.UPLOAD_MAX_MB ?? 8) * 1024 * 1024 },
});

const participantSchema = z.object({
  participantType: z.enum(["PARTICIPANT", "COACH", "ORGANIZER", "GUEST"]).optional(),
  sourceCategory: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  fullName: z.string().min(1),
  school: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  groupName: z.string().optional().nullable(),
  teamName: z.string().optional().nullable(),
  roleLabel: z.string().optional().nullable(),
  competitionMode: z.enum(["solo", "equipe", "team"]).optional().nullable(),
  memberCount: z.number().int().min(1).max(20).optional().nullable(),
  competitionLevel: z.string().optional().nullable(),
  competitionCategories: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  statusLabel: z.string().optional().nullable(),
  hasSmartphone: z.boolean().optional().nullable(),
  expectedPresence: z.enum(["MONDAY", "TUESDAY", "BOTH_DAYS", "UNKNOWN"]).optional(),
  sourceReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function nextBadgeCode() {
  const last = await prisma.participant.findFirst({ orderBy: { badgeCode: "desc" }, select: { badgeCode: true } });
  const next = Number(last?.badgeCode.replace(/\D/g, "") || "0") + 1;
  return generateBadgeCode(next);
}

function cleanParticipantInput(input: Partial<z.infer<typeof participantSchema>>) {
  return {
    ...input,
    email: nullableString(input.email)?.toLowerCase(),
    phone: nullableString(input.phone),
    sourceCategory: nullableString(input.sourceCategory),
    firstName: nullableString(input.firstName),
    lastName: nullableString(input.lastName),
    school: nullableString(input.school),
    organization: nullableString(input.organization),
    groupName: nullableString(input.groupName),
    teamName: nullableString(input.teamName),
    roleLabel: nullableString(input.roleLabel),
    competitionMode: nullableString(input.competitionMode),
    competitionLevel: nullableString(input.competitionLevel),
    competitionCategories: nullableString(input.competitionCategories),
    gender: nullableString(input.gender),
    city: nullableString(input.city),
    statusLabel: nullableString(input.statusLabel),
    sourceReference: nullableString(input.sourceReference),
    notes: nullableString(input.notes),
  };
}

const TEMPLATE_HEADERS = [
  "Source", "Référence", "Mode", "Équipe", "Nombre membres", "Thématique / Niveau", "Catégories / Spécialités",
  "Chef / Capitaine", "Rôle", "Nom complet", "Email", "Téléphone", "Genre", "Ville", "Statut",
  "Organisation / Établissement", "Formation", "Job dating", "Présence prévue", "Observation",
];

function cellText(row: ExcelJS.Row, headerMap: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const index = headerMap.get(alias.toLowerCase());
    if (index) {
      const value = row.getCell(index).text;
      if (value != null && String(value).trim()) return String(value).trim();
    }
  }
  return "";
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email || null;
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim() || null;
}

function validateImportRow(data: Record<string, any>, rowNumber: number) {
  const errors: string[] = [];
  if (!data.fullName) errors.push(`Ligne ${rowNumber}: le nom complet est obligatoire.`);
  if (data.phone && data.phone.replace(/[^\d+]/g, "").length < 7) errors.push(`Ligne ${rowNumber}: téléphone invalide (${data.phone}).`);
  if (["Hackathon", "CTF"].includes(data.sourceCategory)) {
    if (!data.competitionMode) errors.push(`Ligne ${rowNumber}: le mode solo/equipe est obligatoire pour ${data.sourceCategory}.`);
    if (data.competitionMode === "equipe" && !data.teamName) errors.push(`Ligne ${rowNumber}: le nom d'équipe est obligatoire en mode équipe.`);
  }
  return errors;
}

participantsRouter.use(requireAuth);

participantsRouter.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const search = String(req.query.search ?? "").trim();
  const where: Prisma.ParticipantWhereInput = {};
  const category = String(req.query.category ?? "ALL");
  const type = String(req.query.type ?? "ALL");

  if (category !== "ALL") where.sourceCategory = category;
  if (type !== "ALL") where.participantType = type as never;
  if (req.query.groupName) where.groupName = String(req.query.groupName);
  if (req.query.teamName) where.teamName = String(req.query.teamName);
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { badgeCode: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { teamName: { contains: search } },
      { groupName: { contains: search } },
    ];
  }

  const [totalRaw, rowsRaw] = await Promise.all([
    prisma.participant.count({ where }),
    prisma.participant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { passages: { where: { isCancelled: false }, orderBy: { scannedAt: "desc" }, take: 1 } },
    }),
  ]);
  const status = String(req.query.status ?? "ALL");
  const rows = rowsRaw.map(serializeParticipant).filter((p) => status === "ALL" || p.currentStatus === status);
  res.json({ items: rows, total: status === "ALL" ? totalRaw : rows.length, page, pageSize });
}));

participantsRouter.get("/template.xlsx", asyncHandler(async (_req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Participants");
  sheet.addRow(TEMPLATE_HEADERS);
  sheet.addRow(["Hackathon", "HACK-2026-XXXXXX", "equipe", "Nom equipe", 4, "IA-05", "", "oui", "Développeur", "Nom Participant", "email@example.com", "+261...", "M", "Antananarivo", "etudiant", "Université / Entreprise", "Formation", "oui", "BOTH_DAYS", ""]);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=modele-participants.xlsx");
  await workbook.xlsx.write(res);
  res.end();
}));

participantsRouter.get("/:id", asyncHandler(async (req, res) => {
  const participant = await prisma.participant.findUnique({
    where: { id: req.params.id },
    include: { passages: { where: { isCancelled: false }, orderBy: { scannedAt: "desc" }, take: 1 } },
  });
  if (!participant) throw httpError(404, "Participant introuvable");
  res.json(serializeParticipant(participant));
}));

participantsRouter.patch("/:id", requireRole("ADMIN", "SUPERVISOR"), asyncHandler(async (req, res) => {
  const input = cleanParticipantInput(parseBody(participantSchema.partial(), req.body));
  const participant = await prisma.participant.update({ where: { id: req.params.id }, data: input });
  res.json(serializeParticipant(participant));
}));

participantsRouter.delete("/all", requireRole("ADMIN", "SUPERVISOR"), asyncHandler<AuthedRequest>(async (req, res) => {
  const participants = await prisma.participant.findMany({ select: { id: true, photoPath: true } });
  const count = participants.length;

  await prisma.$transaction(async (tx) => {
    await tx.participant.deleteMany({});
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "PARTICIPANT_DELETE_ALL",
        entityType: "Participant",
        detailsJson: { count },
      },
    });
  });

  await Promise.all(participants.map((participant) => {
    if (!participant.photoPath?.startsWith("/uploads/photos/")) return Promise.resolve();
    const photoPath = path.resolve(process.cwd(), participant.photoPath.replace(/^\//, ""));
    return fs.unlink(photoPath).catch(() => undefined);
  }));

  res.json({ deleted: count });
}));

participantsRouter.delete("/:id", requireRole("ADMIN", "SUPERVISOR"), asyncHandler<AuthedRequest>(async (req, res) => {
  const participant = await prisma.participant.findUnique({ where: { id: req.params.id } });
  if (!participant) throw httpError(404, "Participant introuvable");

  await prisma.$transaction(async (tx) => {
    await tx.participant.delete({ where: { id: participant.id } });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "PARTICIPANT_DELETE",
        entityType: "Participant",
        entityId: participant.id,
        detailsJson: { fullName: participant.fullName, badgeCode: participant.badgeCode },
      },
    });
  });

  if (participant.photoPath?.startsWith("/uploads/photos/")) {
    const photoPath = path.resolve(process.cwd(), participant.photoPath.replace(/^\//, ""));
    await fs.unlink(photoPath).catch(() => undefined);
  }

  res.status(204).end();
}));

participantsRouter.post("/quick-add", requireRole("ADMIN", "SUPERVISOR", "SCAN_AGENT"), asyncHandler(async (req, res) => {
  const schema = z.object({ participants: z.array(participantSchema).min(1).optional() }).and(participantSchema.partial());
  const body = parseBody(schema, req.body);
  const rows = body.participants?.length ? body.participants : [body as z.infer<typeof participantSchema>];
  const created = [];
  for (const row of rows) {
    const input = cleanParticipantInput(row);
    const participant = await prisma.participant.create({
      data: {
        ...input,
        fullName: input.fullName!,
        participantType: input.participantType ?? "PARTICIPANT",
        expectedPresence: input.expectedPresence ?? "UNKNOWN",
        badgeCode: await nextBadgeCode(),
        qrToken: generateQrToken(),
        isLastMinute: true,
      },
    });
    created.push(serializeParticipant(participant));
  }
  res.status(201).json(created.length === 1 ? created[0] : { items: created });
}));

participantsRouter.post("/import/preview", requireRole("ADMIN", "SUPERVISOR"), upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, "Fichier requis");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer as any);
  const sheet = workbook.worksheets[0];
  const rows: Array<{ ok: boolean; data?: unknown; error?: string }> = [];
  const duplicates: unknown[] = [];
  const existing = await prisma.participant.findMany({ select: { email: true, phone: true, fullName: true, groupName: true } });
  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => {
    const key = String(cell.text ?? "").trim().toLowerCase();
    if (key) headerMap.set(key, col);
  });

  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const source = cellText(row, headerMap, ["Source", "Catégorie", "sourceCategory"]) || cellText(row, headerMap, ["type"]) || "Hackathon";
    const isCtf = source.toLowerCase().includes("ctf") || cellText(row, headerMap, ["niveau", "categories"]);
    const data = {
      participantType: "PARTICIPANT",
      sourceCategory: isCtf ? "CTF" : source.includes("Hackathon") ? "Hackathon" : source,
      sourceReference: nullableString(cellText(row, headerMap, ["Référence", "reference"])),
      competitionMode: nullableString(cellText(row, headerMap, ["Mode", "type"]))?.replace("team", "equipe").toLowerCase(),
      teamName: nullableString(cellText(row, headerMap, ["Équipe", "Equipe", "equipe"])),
      memberCount: Number(cellText(row, headerMap, ["Nombre membres", "memberCount"]) || 1),
      competitionLevel: nullableString(cellText(row, headerMap, ["Thématique / Niveau", "thematique", "niveau"])),
      competitionCategories: nullableString(cellText(row, headerMap, ["Catégories / Spécialités", "categories", "Catégories"])),
      roleLabel: nullableString(cellText(row, headerMap, ["Rôle", "role"])),
      fullName: cellText(row, headerMap, ["Nom complet", "Name", "nom"]),
      email: normalizeEmail(cellText(row, headerMap, ["Email", "email"])),
      phone: normalizePhone(cellText(row, headerMap, ["Téléphone", "telephone", "phone"])),
      gender: nullableString(cellText(row, headerMap, ["Genre", "genre"])),
      city: nullableString(cellText(row, headerMap, ["Ville", "ville"])),
      statusLabel: nullableString(cellText(row, headerMap, ["Statut", "statut"])),
      organization: nullableString(cellText(row, headerMap, ["Organisation / Établissement", "Organisation", "organisation"])),
      school: nullableString(cellText(row, headerMap, ["Formation", "formation"])),
      groupName: nullableString(cellText(row, headerMap, ["Groupe", "groupName"])),
      expectedPresence: (nullableString(cellText(row, headerMap, ["Présence prévue", "expectedPresence"])) ?? "BOTH_DAYS").toUpperCase(),
      notes: nullableString(cellText(row, headerMap, ["Observation", "notes"])),
    };
    const errors = validateImportRow(data, index);
    if (data.competitionMode === "equipe" && data.teamName) {
      data.groupName = data.groupName ?? data.teamName;
    }
    if (errors.length) rows.push({ ok: false, data, error: errors.join(" ") });
    else rows.push({ ok: true, data });
    if (existing.some((p) => (data.email && p.email === data.email) || (p.fullName === data.fullName && p.groupName === data.groupName))) {
      duplicates.push(data);
    }
  });
  res.json({ rows, duplicates });
}));

participantsRouter.post("/import/commit", requireRole("ADMIN", "SUPERVISOR"), asyncHandler<AuthedRequest>(async (req, res) => {
  const schema = z.object({ rows: z.array(participantSchema), sourceCategory: z.string().default("Import"), fileName: z.string().default("import.xlsx") });
  const input = parseBody(schema, req.body);
  let importedRows = 0;
  const last = await prisma.participant.findFirst({ orderBy: { badgeCode: "desc" }, select: { badgeCode: true } });
  let nextNumber = Number(last?.badgeCode.replace(/\D/g, "") || "0") + 1;
  await prisma.$transaction(async (tx) => {
    for (const row of input.rows) {
      const data = cleanParticipantInput(row);
      const duplicate = await tx.participant.findFirst({
        where: {
          OR: [
            ...(data.email ? [{ email: data.email }] : []),
            { fullName: data.fullName, groupName: data.groupName },
          ],
        },
      });
      if (duplicate) continue;
      await tx.participant.create({
        data: { ...data, fullName: data.fullName!, badgeCode: generateBadgeCode(nextNumber++), qrToken: generateQrToken(), sourceCategory: data.sourceCategory ?? input.sourceCategory },
      });
      importedRows += 1;
    }
    await tx.importBatch.create({
      data: { fileName: input.fileName, sourceCategory: input.sourceCategory, importedByUserId: req.user!.id, totalRows: input.rows.length, importedRows, skippedRows: input.rows.length - importedRows, errorRows: 0 },
    });
  });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "IMPORT_COMMIT", entityType: "ImportBatch", detailsJson: { importedRows } } });
  res.json({ importedRows });
}));

participantsRouter.post("/:id/photo", requireRole("ADMIN", "SUPERVISOR", "SCAN_AGENT"), upload.single("photo"), asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, "Photo requise");
  const meta = await sharp(req.file.buffer).metadata().catch(() => null);
  if (!meta?.format || !["jpeg", "png", "webp"].includes(meta.format)) throw httpError(400, "Format photo invalide");
  const dir = path.resolve(process.cwd(), "uploads/photos");
  await fs.mkdir(dir, { recursive: true });
  const ext = meta.format === "jpeg" ? "jpg" : meta.format;
  const fileName = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  await sharp(req.file.buffer).resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).toFile(path.join(dir, fileName));
  const participant = await prisma.participant.update({ where: { id: req.params.id }, data: { photoPath: `/uploads/photos/${fileName}` } });
  res.json(serializeParticipant(participant));
}));

participantsRouter.delete("/:id/photo", requireRole("ADMIN", "SUPERVISOR"), asyncHandler<AuthedRequest>(async (req, res) => {
  const participant = await prisma.participant.update({ where: { id: req.params.id }, data: { photoPath: null } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "PHOTO_DELETE", entityType: "Participant", entityId: participant.id } });
  res.json(serializeParticipant(participant));
}));
