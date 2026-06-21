import type { MovementType, Passage, ScanMethod } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { serializeParticipant } from "../lib/api.js";
import { getSettings } from "./settings.js";

function normalizeGate(gateName?: string) {
  return gateName?.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim() ?? "";
}

function isKnownGate(gateName?: string) {
  return ["entree principale", "sortie principale", "bureau de controle"].includes(normalizeGate(gateName));
}

function expectedMovementFromGate(gateName?: string): MovementType | null {
  const normalized = normalizeGate(gateName);
  if (normalized.includes("entree")) return "ENTRY";
  if (normalized.includes("sortie")) return "EXIT";
  return null;
}

function isIdentityVerificationGate(gateName?: string) {
  return normalizeGate(gateName) === "bureau de controle";
}

function currentStatusFromLast(last?: Pick<Passage, "movementType"> | null) {
  if (last?.movementType === "ENTRY") return "ON_SITE";
  if (last?.movementType === "EXIT") return "OFF_SITE";
  return "NOT_ARRIVED";
}

function validateMovement(expected: MovementType | null, last?: Pick<Passage, "movementType"> | null) {
  const currentStatus = currentStatusFromLast(last);
  if (!expected) return { ok: true as const, movementType: last?.movementType === "ENTRY" ? "EXIT" as const : "ENTRY" as const, currentStatus };

  if (expected === "ENTRY" && currentStatus === "ON_SITE") {
    return {
      ok: false as const,
      status: 409,
      currentStatus,
      message: "Entrée refusée : le participant est déjà sur site.",
    };
  }

  if (expected === "EXIT" && currentStatus !== "ON_SITE") {
    return {
      ok: false as const,
      status: 409,
      currentStatus,
      message: currentStatus === "NOT_ARRIVED"
        ? "Sortie refusée : aucune entrée n'a encore été enregistrée."
        : "Sortie refusée : le participant est déjà hors site.",
    };
  }

  return { ok: true as const, movementType: expected, currentStatus };
}

export async function recordScan(qrTokenOrCode: string, gateName: string | undefined, scanMethod: ScanMethod, agentId: string) {
  const value = qrTokenOrCode.trim();
  if (!isKnownGate(gateName)) {
    return { ok: false, status: 400, message: "Point de contrôle invalide" };
  }

  const participant = await prisma.participant.findFirst({
    where: { OR: [{ qrToken: value }, { badgeCode: value }] },
    include: { passages: { where: { isCancelled: false }, orderBy: { scannedAt: "desc" }, take: 1 } },
  });

  if (!participant) return { ok: false, status: 404, message: "Badge introuvable" };
  if (!participant.isActive) return { ok: false, status: 403, message: "Participant désactivé" };

  const settings = await getSettings();
  const last = participant.passages[0];
  if (isIdentityVerificationGate(gateName)) {
    const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } });
    return {
      ok: true,
      verificationOnly: true,
      participant: serializeParticipant(participant),
      gateName,
      agentName: agent?.name,
      currentStatus: currentStatusFromLast(last),
      message: "Identité vérifiée",
    };
  }

  const expectedMovement = expectedMovementFromGate(gateName);
  const isInsideDuplicateWindow = last && (Date.now() - last.scannedAt.getTime()) / 1000 < settings.duplicateScanWindowSeconds;

  if (isInsideDuplicateWindow && (!expectedMovement || last.movementType === expectedMovement)) {
    return {
      ok: true,
      duplicateIgnored: true,
      message: "Scan ignoré : passage déjà enregistré récemment",
      participant: serializeParticipant(participant),
    };
  }

  const movement = validateMovement(expectedMovement, last);
  if (!movement.ok) {
    return {
      ok: false,
      status: movement.status,
      message: movement.message,
      participant: serializeParticipant(participant),
      gateName,
      currentStatus: movement.currentStatus,
    };
  }

  const movementType = movement.movementType;
  const passage = await prisma.passage.create({
    data: { participantId: participant.id, movementType, scanMethod, gateName, scannedByUserId: agentId },
    include: { scannedBy: true },
  });
  const refreshed = await prisma.participant.findUniqueOrThrow({
    where: { id: participant.id },
    include: { passages: { where: { isCancelled: false }, orderBy: { scannedAt: "desc" }, take: 1 } },
  });

  return {
    ok: true,
    movementType,
    participant: serializeParticipant(refreshed),
    scannedAt: passage.scannedAt,
    gateName,
    agentName: passage.scannedBy.name,
    currentStatus: movementType === "ENTRY" ? "ON_SITE" : "OFF_SITE",
    message: movementType === "ENTRY" ? "Entrée enregistrée" : "Sortie enregistrée",
  };
}
