import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody, serializeUser } from "../lib/api.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("ADMIN"));

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "SUPERVISOR", "SCAN_AGENT", "REPORT_AGENT"]),
  password: z.string().min(8),
});

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "SUPERVISOR", "SCAN_AGENT", "REPORT_AGENT"]).optional(),
  isActive: z.boolean().optional(),
});

usersRouter.get("/", asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users.map(serializeUser));
}));

usersRouter.post("/", asyncHandler<AuthedRequest>(async (req, res) => {
  const input = parseBody(createSchema, req.body);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "USER_CREATE", entityType: "User", entityId: user.id } });
  res.status(201).json(serializeUser(user));
}));

usersRouter.patch("/:id", asyncHandler<AuthedRequest>(async (req, res) => {
  const input = parseBody(patchSchema, req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: input });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "USER_UPDATE", entityType: "User", entityId: user.id, detailsJson: input } });
  res.json(serializeUser(user));
}));

usersRouter.post("/:id/disable", asyncHandler<AuthedRequest>(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "USER_DISABLE", entityType: "User", entityId: user.id } });
  res.json(serializeUser(user));
}));
