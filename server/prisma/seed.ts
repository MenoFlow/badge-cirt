import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin CIRT";
  if (!email || !password) throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash, role: "ADMIN", isActive: true },
  });

  // Settings par défaut
  const existing = await prisma.setting.findFirst();
  if (!existing) {
    await prisma.setting.create({
      data: {
        eventName: process.env.EVENT_NAME ?? "CIRT Event",
        publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
        exitWarningMinutes: Number(process.env.EXIT_WARNING_MINUTES ?? 30),
        exitCriticalMinutes: Number(process.env.EXIT_CRITICAL_MINUTES ?? 60),
        duplicateScanWindowSeconds: Number(process.env.DUPLICATE_SCAN_WINDOW_SECONDS ?? 30),
      },
    });
  }
  console.log("Seed terminé : admin créé.");
}

main().finally(() => prisma.$disconnect());
