import crypto from "crypto";

export function generateQrToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateBadgeCode(sequence: number): string {
  return `CIRT-${String(sequence).padStart(6, "0")}`;
}
