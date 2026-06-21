import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody } from "../lib/api.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

export const alertsRouter = Router();
alertsRouter.use(requireAuth, requireRole("ADMIN", "SUPERVISOR"));

alertsRouter.post("/:participantId/action", requireRole("ADMIN", "SUPERVISOR"), asyncHandler<AuthedRequest>(async (req, res) => {
  const input = parseBody(z.object({
    actionType: z.enum(["CONTACTED", "AUTHORIZED_EXIT", "RETURN_CONFIRMED", "ESCALATED"]),
    note: z.string().optional(),
  }), req.body);
  const action = await prisma.alertAction.create({
    data: { participantId: req.params.participantId, createdByUserId: req.user!.id, ...input },
  });
  res.status(201).json(action);
}));

alertsRouter.get("/actions", asyncHandler(async (req, res) => {
  const actions = await prisma.alertAction.findMany({
    where: { ...(req.query.participantId ? { participantId: String(req.query.participantId) } : {}) },
    orderBy: { createdAt: "desc" },
    include: { participant: true, createdBy: true },
  });
  res.json(actions);
}));
