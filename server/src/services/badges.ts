import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma.js";
import { getSettings } from "./settings.js";

function splitLongWord(word: string, maxWidth: number, fontSize: number, font: PDFFont) {
  const parts: string[] = [];
  let part = "";
  for (const char of Array.from(word)) {
    const next = `${part}${char}`;
    if (part && font.widthOfTextAtSize(`${next}-`, fontSize) > maxWidth) {
      parts.push(`${part}-`);
      part = char;
    } else {
      part = next;
    }
  }
  if (part) parts.push(part);
  return parts;
}

function calculateNameLayout(text: string, maxWidth: number, font: PDFFont, maxLines = 3) {
  const normalized = text.trim().replace(/\s+/g, " ");
  const sizes = [22, 21, 20, 19, 18, 17, 16, 15, 14];

  for (const fontSize of sizes) {
    const words = normalized
      .split(" ")
      .flatMap((word) => font.widthOfTextAtSize(word, fontSize) > maxWidth ? splitLongWord(word, maxWidth, fontSize, font) : [word]);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, fontSize) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);

    if (lines.length <= maxLines) return { lines, fontSize, overflows: false };
  }

  const fontSize = sizes[sizes.length - 1];
  const words = normalized
    .split(" ")
    .flatMap((word) => font.widthOfTextAtSize(word, fontSize) > maxWidth ? splitLongWord(word, maxWidth, fontSize, font) : [word]);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, fontSize) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    let last = lines[lines.length - 1] ?? "";
    while (last && font.widthOfTextAtSize(`${last}…`, fontSize) > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last || normalized.slice(0, 1)}…`;
  }
  return { lines, fontSize, overflows: true };
}

async function drawBadgePage(pdf: PDFDocument, participantId: string) {
  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant) return;

  const settings = await getSettings();
  const page = pdf.addPage([360, 540]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrUrl = `${settings.publicBaseUrl.replace(/\/$/, "")}/p/${participant.qrToken}`;
  const qrPng = await QRCode.toBuffer(qrUrl, { type: "png", width: 180, margin: 1 });
  const qr = await pdf.embedPng(qrPng);

  page.drawRectangle({ x: 0, y: 0, width: 360, height: 540, color: rgb(0.12, 0.05, 0.28) });
  page.drawRectangle({ x: 22, y: 22, width: 316, height: 496, color: rgb(1, 1, 1), opacity: 0.96 });
  page.drawText(settings.eventName, { x: 42, y: 478, size: 13, font: bold, color: rgb(0.12, 0.05, 0.28) });
  page.drawText("CIRT BADGE CHECK", { x: 42, y: 454, size: 10, font, color: rgb(0.45, 0.4, 0.55) });
  const nameLayout = calculateNameLayout(participant.fullName, 276, bold, 3);
  nameLayout.lines.forEach((line, index) => {
    page.drawText(line, { x: 42, y: 400 - index * (nameLayout.fontSize + 5), size: nameLayout.fontSize, font: bold, color: rgb(0.08, 0.07, 0.12) });
  });
  page.drawText(participant.participantType, { x: 42, y: 316, size: 12, font: bold, color: rgb(0.38, 0.19, 0.72) });
  page.drawText(participant.sourceCategory ?? "Categorie non renseignee", { x: 42, y: 294, size: 11, font, color: rgb(0.26, 0.24, 0.3) });
  page.drawText(participant.teamName ?? participant.groupName ?? participant.organization ?? "-", { x: 42, y: 272, size: 11, font, color: rgb(0.26, 0.24, 0.3) });
  page.drawText("Badge ID", { x: 150, y: 230, size: 9, font, color: rgb(0.45, 0.4, 0.55) });
  page.drawText(participant.badgeCode, { x: 104, y: 204, size: 24, font: bold, color: rgb(0.08, 0.07, 0.12) });
  page.drawText("scan or saisir", { x: 146, y: 188, size: 9, font, color: rgb(0.45, 0.4, 0.55) });
  page.drawImage(qr, { x: 105, y: 48, width: 150, height: 150 });
}

export async function createBadgePdf(participantIds: string[]) {
  const pdf = await PDFDocument.create();
  for (const participantId of participantIds) await drawBadgePage(pdf, participantId);
  return Buffer.from(await pdf.save());
}
