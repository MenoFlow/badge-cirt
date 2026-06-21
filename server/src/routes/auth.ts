import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, httpError, parseBody, serializeUser } from "../lib/api.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getSettings } from "../services/settings.js";

export const authRouter = Router();
const secureCookie = () => process.env.COOKIE_SECURE === "true" || (process.env.PUBLIC_BASE_URL ?? "").startsWith("https://");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", asyncHandler(async (req, res) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-me") {
    throw httpError(500, "JWT_SECRET doit être configuré");
  }
  const input = parseBody(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.isActive) throw httpError(401, "Identifiants invalides");
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw httpError(401, "Identifiants invalides");

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id } });
  res.json(serializeUser(user));
}));

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: secureCookie(), sameSite: "lax" });
  res.status(204).send();
});

authRouter.get("/me", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json(serializeUser(user));
}));

authRouter.post("/change-password", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const input = parseBody(z.object({ password: z.string().min(10, "Mot de passe: 10 caractères minimum") }), req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash: await bcrypt.hash(input.password, 12), mustChangePassword: false },
  });
  const settings = await getSettings();
  if (!settings.bootstrapCompleted && user.role === "ADMIN") {
    await prisma.setting.update({ where: { id: settings.id }, data: { bootstrapCompleted: true } });
  }
  res.json(serializeUser(user));
}));

authRouter.get("/bootstrap", asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  if (settings.bootstrapCompleted) throw httpError(404, "Bootstrap déjà terminé");
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const password = crypto.randomBytes(9).toString("base64url");
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true, isActive: true },
    });
    res.json({ id: existingAdmin.id, email: existingAdmin.email, password, mustChangePassword: true, alreadyCreated: true });
    return;
  }
  const email = `admin-${crypto.randomBytes(3).toString("hex")}@cirt.local`;
  const user = await prisma.user.create({
    data: {
      name: "Administrateur CIRT",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      isActive: true,
      mustChangePassword: true,
    },
  });
  res.json({ id: user.id, email, password, mustChangePassword: true });
}));
