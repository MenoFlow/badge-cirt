import { Router } from "express";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { asyncHandler } from "../lib/api.js";
import { requireAuth } from "../middleware/auth.js";
import { participantReportRows } from "../services/reportRows.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

const headers = ["Badge", "Nom", "Type", "Catégorie", "Groupe/Équipe", "Téléphone"];
const widths = [70, 170, 75, 80, 105, 80];

function truncate(value: unknown, max = 28) {
  const text = String(value ?? "-");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

reportsRouter.get("/:kind.pdf", asyncHandler(async (req, res) => {
  const rows = await participantReportRows(req.params.kind);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([842, 595]);
  let y = 545;

  function header() {
    page.drawText(`Rapport CIRT - ${req.params.kind}`, { x: 36, y, size: 18, font: bold, color: rgb(0.12, 0.05, 0.28) });
    y -= 34;
    let x = 36;
    headers.forEach((h, i) => {
      page.drawRectangle({ x, y: y - 8, width: widths[i], height: 22, color: rgb(0.12, 0.05, 0.28) });
      page.drawText(h, { x: x + 4, y, size: 9, font: bold, color: rgb(1, 1, 1) });
      x += widths[i];
    });
    y -= 24;
  }

  header();
  rows.forEach((p, index) => {
    if (y < 45) {
      page = pdf.addPage([842, 595]);
      y = 545;
      header();
    }
    const values = [
      p.badgeCode,
      truncate(p.fullName, 34),
      p.participantType,
      p.sourceCategory ?? "-",
      truncate(p.teamName ?? p.groupName ?? p.organization ?? "-", 24),
      p.phone ?? "-",
    ];
    let x = 36;
    const fill = index % 2 === 0 ? rgb(0.97, 0.96, 0.99) : rgb(1, 1, 1);
    values.forEach((v, i) => {
      page.drawRectangle({ x, y: y - 7, width: widths[i], height: 20, color: fill, borderColor: rgb(0.86, 0.84, 0.9), borderWidth: 0.4 });
      page.drawText(String(v), { x: x + 4, y, size: 8.5, font, color: rgb(0.08, 0.07, 0.12) });
      x += widths[i];
    });
    y -= 20;
  });

  if (!rows.length) page.drawText("Aucune donnée pour ce rapport.", { x: 36, y, size: 11, font, color: rgb(0.3, 0.3, 0.35) });

  const bytes = Buffer.from(await pdf.save());
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${req.params.kind}.pdf`);
  res.send(bytes);
}));
