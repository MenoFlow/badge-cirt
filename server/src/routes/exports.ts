import { Router } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/api.js";
import { requireAuth } from "../middleware/auth.js";
import { participantReportRows } from "../services/reportRows.js";

export const exportsRouter = Router();
exportsRouter.use(requireAuth);

exportsRouter.get("/:kind.xlsx", asyncHandler(async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(req.params.kind);
  if (req.params.kind === "passages") {
    sheet.addRow(["Date", "Participant", "Badge", "Mouvement", "Porte", "Agent"]);
    const rows = await prisma.passage.findMany({ take: 5000, orderBy: { scannedAt: "desc" }, include: { participant: true, scannedBy: true } });
    rows.forEach((p) => sheet.addRow([p.scannedAt, p.participant.fullName, p.participant.badgeCode, p.movementType, p.gateName, p.scannedBy.name]));
  } else {
    sheet.addRow(["Badge", "Nom", "Type", "Catégorie", "Groupe", "Équipe", "Téléphone", "Email"]);
    const rows = await participantReportRows(req.params.kind);
    rows.forEach((p) => sheet.addRow([p.badgeCode, p.fullName, p.participantType, p.sourceCategory, p.groupName, p.teamName, p.phone, p.email]));
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${req.params.kind}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}));
