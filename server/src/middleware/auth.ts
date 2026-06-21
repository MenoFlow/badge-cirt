import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { roleOrder } from "../lib/api.js";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: UserRole };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token ?? req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ message: "Connexion requise" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as NonNullable<AuthedRequest["user"]>;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user?.isActive) return res.status(401).json({ message: "Utilisateur inactif" });
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ message: "Session invalide" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Vous n'avez pas les droits nécessaires" });
    }
    next();
  };
}

export function requireAtLeast(role: UserRole) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || roleOrder[req.user.role] < roleOrder[role]) {
      return res.status(403).json({ message: "Vous n'avez pas les droits nécessaires" });
    }
    next();
  };
}
