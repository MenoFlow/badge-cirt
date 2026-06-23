import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma.js";
import { getSettings } from "./settings.js";

const typeLabel = {
  PARTICIPANT: "Participant",
  COACH: "Coach",
  JURY: "Jury",
  ORGANIZER: "Organisation",
  GUEST: "Invité",
} as const;

function hex(hexColor: string) {
  const value = hexColor.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  const right = x + width;
  const top = y + height;
  const c = r * 0.5522847498;
  return [
    `M ${x + r} ${y}`,
    `L ${right - r} ${y}`,
    `C ${right - r + c} ${y} ${right} ${y + r - c} ${right} ${y + r}`,
    `L ${right} ${top - r}`,
    `C ${right} ${top - r + c} ${right - r + c} ${top} ${right - r} ${top}`,
    `L ${x + r} ${top}`,
    `C ${x + r - c} ${top} ${x} ${top - r + c} ${x} ${top - r}`,
    `L ${x} ${y + r}`,
    `C ${x} ${y + r - c} ${x + r - c} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

function circlePath(cx: number, cy: number, radius: number) {
  const c = radius * 0.5522847498;
  return [
    `M ${cx + radius} ${cy}`,
    `C ${cx + radius} ${cy + c} ${cx + c} ${cy + radius} ${cx} ${cy + radius}`,
    `C ${cx - c} ${cy + radius} ${cx - radius} ${cy + c} ${cx - radius} ${cy}`,
    `C ${cx - radius} ${cy - c} ${cx - c} ${cy - radius} ${cx} ${cy - radius}`,
    `C ${cx + c} ${cy - radius} ${cx + radius} ${cy - c} ${cx + radius} ${cy}`,
    "Z",
  ].join(" ");
}

function drawCenteredText(
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: x + Math.max(0, (maxWidth - width) / 2), y, size, font, color });
}

function mixColor(from: [number, number, number], to: [number, number, number], ratio: number) {
  return rgb(
    (from[0] + (to[0] - from[0]) * ratio) / 255,
    (from[1] + (to[1] - from[1]) * ratio) / 255,
    (from[2] + (to[2] - from[2]) * ratio) / 255,
  );
}

function drawVerticalGradient(page: any, width: number, height: number) {
  const top: [number, number, number] = [83, 59, 174];
  const middle: [number, number, number] = [55, 31, 121];
  const bottom: [number, number, number] = [38, 18, 93];
  const steps = 80;
  const stepHeight = height / steps;

  for (let index = 0; index < steps; index += 1) {
    const ratio = index / (steps - 1);
    const color =
      ratio < 0.5
        ? mixColor(bottom, middle, ratio / 0.5)
        : mixColor(middle, top, (ratio - 0.5) / 0.5);
    page.drawRectangle({ x: 0, y: index * stepHeight, width, height: stepHeight + 1, color });
  }
}

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
      .flatMap((word) =>
        font.widthOfTextAtSize(word, fontSize) > maxWidth
          ? splitLongWord(word, maxWidth, fontSize, font)
          : [word],
      );
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
    .flatMap((word) =>
      font.widthOfTextAtSize(word, fontSize) > maxWidth
        ? splitLongWord(word, maxWidth, fontSize, font)
        : [word],
    );
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
    while (last && font.widthOfTextAtSize(`${last}…`, fontSize) > maxWidth)
      last = last.slice(0, -1);
    lines[lines.length - 1] = `${last || normalized.slice(0, 1)}…`;
  }
  return { lines, fontSize, overflows: true };
}

async function drawBadgePage(pdf: PDFDocument, participantId: string) {
  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant) return;

  const settings = await getSettings();
  const page = pdf.addPage([344, 528]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrUrl = `${settings.publicBaseUrl.replace(/\/$/, "")}/p/${participant.qrToken}`;
  const qrPng = await QRCode.toBuffer(qrUrl, {
    type: "png",
    width: 190,
    margin: 1,
    color: { dark: "#17004B", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
  const qr = await pdf.embedPng(qrPng);
  const pageWidth = 344;
  const deepPurple = hex("#17004B");
  const lime = hex("#dfff59");
  const mutedWhite = rgb(1, 1, 1);
  const softWhite = rgb(0.74, 0.68, 0.88);
  const initials = participant.fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const organizationLine = [participant.teamName ?? participant.groupName, participant.organization]
    .filter(Boolean)
    .join(" · ");

  drawVerticalGradient(page, 344, 528);
  page.drawRectangle({ x: 0, y: 0, width: 344, height: 528, color: hex("#6b5ce7"), opacity: 0.08 });

  page.drawText("CIRT", { x: 10, y: 502, size: 15, font, color: mutedWhite });
  const eventLabel = (settings.eventName || "CIRT Cybersecurity Days").toUpperCase();
  page.drawText(eventLabel, {
    x: Math.max(170, pageWidth - 10 - font.widthOfTextAtSize(eventLabel, 9)),
    y: 503,
    size: 9,
    font,
    color: softWhite,
  });

  page.drawSvgPath(circlePath(172, 431, 47), { color: rgb(1, 1, 1), opacity: 0.1 });
  page.drawSvgPath(circlePath(172, 431, 47), {
    borderColor: rgb(1, 1, 1),
    borderWidth: 2,
    opacity: 0.45,
  });
  drawCenteredText(page, initials || "CB", 125, 421, 94, 23, bold, rgb(1, 1, 1));

  const nameLayout = calculateNameLayout(participant.fullName, 300, bold, 2);
  const nameStartY = nameLayout.lines.length > 1 ? 361 : 366;
  nameLayout.lines.forEach((line, index) => {
    drawCenteredText(
      page,
      line,
      22,
      nameStartY - index * (nameLayout.fontSize + 4),
      300,
      nameLayout.fontSize,
      bold,
      rgb(1, 1, 1),
    );
  });

  const roleLine = `${typeLabel[participant.participantType].toUpperCase()} · ${(participant.sourceCategory ?? "-").toUpperCase()}`;
  drawCenteredText(page, roleLine, 22, 327, 300, 12, bold, lime);
  if (organizationLine) {
    drawCenteredText(page, organizationLine, 22, 309, 300, 10.5, font, softWhite);
  }

  drawCenteredText(page, "BADGE ID", 10, 258, 324, 9, font, rgb(0.5, 0.39, 0.7));
  drawCenteredText(page, participant.badgeCode, 10, 234, 324, 22, font, rgb(1, 1, 1));
  drawCenteredText(page, "scan or saisir", 10, 215, 324, 9, font, rgb(0.7, 0.62, 0.84));
  page.drawImage(qr, { x: 77, y: 37, width: 190, height: 190 });
}

export async function createBadgePdf(participantIds: string[]) {
  const pdf = await PDFDocument.create();
  for (const participantId of participantIds) await drawBadgePage(pdf, participantId);
  return Buffer.from(await pdf.save());
}
