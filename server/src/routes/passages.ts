import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody } from "../lib/api.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

export const passagesRouter = Router();
passagesRouter.use(requireAuth, requireRole("ADMIN", "SUPERVISOR", "SCAN_AGENT"));

passagesRouter.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(5, Math.max(1, Number(req.query.pageSize ?? 5)));
  const search = String(req.query.search ?? "").trim();
  const movementType = String(req.query.movementType ?? "ALL");
  const where = {
    isCancelled: false,
    ...(movementType !== "ALL" ? { movementType: movementType as never } : {}),
    ...(req.query.gateName ? { gateName: String(req.query.gateName) } : {}),
    ...(req.query.participantId ? { participantId: String(req.query.participantId) } : {}),
    ...(search ? {
      OR: [
        { gateName: { contains: search } },
        { participant: {
          OR: [
            { fullName: { contains: search } },
            { badgeCode: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { teamName: { contains: search } },
            { groupName: { contains: search } },
          ],
        } },
      ],
    } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.passage.count({ where }),
    prisma.passage.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { participant: true, scannedBy: true },
    }),
  ]);
  const itemsWithStatus = await Promise.all(items.map(async ({ scannedBy, ...passage }) => {
    const previousEntries = passage.movementType === "ENTRY"
      ? await prisma.passage.count({
        where: {
          participantId: passage.participantId,
          movementType: "ENTRY",
          isCancelled: false,
          scannedAt: { lt: passage.scannedAt },
        },
      })
      : 0;
    return {
      ...passage,
      scannedByName: scannedBy.name,
      passageStatus: passage.movementType === "EXIT" ? "Hors site" : previousEntries > 0 ? "Rentré" : "Arrivé",
    };
  }));

  res.json({
    items: itemsWithStatus,
    total,
    page,
    pageSize,
  });
}));

passagesRouter.post("/:id/cancel", requireRole("ADMIN", "SUPERVISOR"), asyncHandler<AuthedRequest>(async (req, res) => {
  const input = parseBody(z.object({ reason: z.string().min(2) }), req.body);
  const passage = await prisma.passage.update({
    where: { id: req.params.id },
    data: { isCancelled: true, cancelledAt: new Date(), cancelledByUserId: req.user!.id, cancelReason: input.reason },
  });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "PASSAGE_CANCEL", entityType: "Passage", entityId: passage.id, detailsJson: input } });
  res.json(passage);
}));

passagesRouter.post("/manual-correction", requireRole("ADMIN"), asyncHandler<AuthedRequest>(async (req, res) => {
  const input = parseBody(z.object({
    participantId: z.string().min(1),
    movementType: z.enum(["ENTRY", "EXIT"]),
    gateName: z.string().optional(),
    note: z.string().optional(),
  }), req.body);
  const passage = await prisma.passage.create({
    data: { ...input, scannedByUserId: req.user!.id, scanMethod: "ADMIN_CORRECTION" },
  });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "PASSAGE_CORRECTION", entityType: "Passage", entityId: passage.id, detailsJson: input } });
  res.status(201).json(passage);
}));
