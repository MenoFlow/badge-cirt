import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, serializeParticipant } from "../lib/api.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getSettings } from "../services/settings.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireRole("ADMIN", "SUPERVISOR"));

async function participantsWithStatus() {
  const rows = await prisma.participant.findMany({
    where: { isActive: true },
    include: { passages: { where: { isCancelled: false }, orderBy: { scannedAt: "desc" }, take: 1 } },
  });
  return rows.map(serializeParticipant);
}

async function alerts() {
  const settings = await getSettings();
  return (await participantsWithStatus())
    .filter((p) => p.currentStatus === "OFF_SITE" && p.lastPassageAt)
    .map((p) => {
      const minutesOut = Math.round((Date.now() - new Date(p.lastPassageAt!).getTime()) / 60000);
      return {
        participant: p,
        exitedAt: p.lastPassageAt!,
        minutesOut,
        severity: minutesOut >= settings.exitCriticalMinutes ? "critical" : "warning",
        responsible: null,
      };
    })
    .filter((a) => a.minutesOut >= settings.exitWarningMinutes);
}

dashboardRouter.get("/summary", asyncHandler(async (_req, res) => {
  const rows = await participantsWithStatus();
  const alertRows = await alerts();
  res.json({
    totalRegistered: rows.length,
    participants: rows.filter((p) => p.participantType === "PARTICIPANT").length,
    coaches: rows.filter((p) => p.participantType === "COACH").length,
    organizers: rows.filter((p) => p.participantType === "ORGANIZER").length,
    guests: rows.filter((p) => p.participantType === "GUEST").length,
    onSite: rows.filter((p) => p.currentStatus === "ON_SITE").length,
    offSite: rows.filter((p) => p.currentStatus === "OFF_SITE").length,
    notArrived: rows.filter((p) => p.currentStatus === "NOT_ARRIVED").length,
    longExits: alertRows.filter((a) => a.severity === "warning").length,
    criticalExits: alertRows.filter((a) => a.severity === "critical").length,
  });
}));

dashboardRouter.get("/current-status", asyncHandler(async (_req, res) => {
  const rows = await participantsWithStatus();
  res.json({
    ON_SITE: rows.filter((p) => p.currentStatus === "ON_SITE"),
    OFF_SITE: rows.filter((p) => p.currentStatus === "OFF_SITE"),
    NOT_ARRIVED: rows.filter((p) => p.currentStatus === "NOT_ARRIVED"),
  });
}));

dashboardRouter.get("/recent-passages", asyncHandler(async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit ?? 20));
  const rows = await prisma.passage.findMany({
    where: { isCancelled: false },
    orderBy: { scannedAt: "desc" },
    take: limit,
    include: { participant: true, scannedBy: true },
  });
  res.json(rows.map(({ scannedBy, ...passage }) => ({ ...passage, scannedByName: scannedBy.name })));
}));

dashboardRouter.get("/alerts", asyncHandler(async (_req, res) => {
  res.json(await alerts());
}));
