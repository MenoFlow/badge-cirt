import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { Participant, Passage, User } from "@prisma/client";

export function asyncHandler<TReq extends Request = Request>(
  handler: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: TReq, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function httpError(status: number, message: string) {
  const err = new Error(message) as Error & { status?: number; expose?: boolean };
  err.status = status;
  err.expose = true;
  return err;
}

export function parseBody<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw httpError(400, parsed.error.issues.map((issue) => issue.message).join(" ; ") || "Entrée invalide");
  return parsed.data;
}

export function serializeUser(user: User) {
  const { passwordHash: _passwordHash, updatedAt: _updatedAt, ...safe } = user;
  return safe;
}

export type ParticipantWithLast = Participant & {
  passages?: Array<Pick<Passage, "movementType" | "scannedAt">>;
};

export function serializeParticipant(participant: ParticipantWithLast) {
  const last = participant.passages?.[0];
  const { passages: _passages, ...data } = participant;
  return {
    ...data,
    currentStatus: last?.movementType === "ENTRY" ? "ON_SITE" : last?.movementType === "EXIT" ? "OFF_SITE" : "NOT_ARRIVED",
    lastPassageAt: last?.scannedAt?.toISOString(),
  };
}

export function nullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
