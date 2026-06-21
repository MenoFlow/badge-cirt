import { prisma } from "../lib/prisma.js";

export async function getSettings() {
  const existing = await prisma.setting.findFirst();
  if (existing) return existing;
  return prisma.setting.create({
    data: {
      eventName: process.env.EVENT_NAME ?? "CIRT Event",
      publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
      exitWarningMinutes: Number(process.env.EXIT_WARNING_MINUTES ?? 30),
      exitCriticalMinutes: Number(process.env.EXIT_CRITICAL_MINUTES ?? 60),
      duplicateScanWindowSeconds: Number(process.env.DUPLICATE_SCAN_WINDOW_SECONDS ?? 30),
      allowSelfPhotoUpload: true,
      requirePhotoValidation: false,
    },
  });
}
