import { prisma } from "../lib/prisma.js";
import { getSettings } from "./settings.js";

type ReportParticipant = Awaited<ReturnType<typeof prisma.participant.findMany>>[number] & {
  passages: Array<{ movementType: string; scannedAt: Date }>;
};

function hasEntryBeforeLatestExit(passages: ReportParticipant["passages"]) {
  const latest = passages[0];
  if (!latest || latest.movementType !== "EXIT") return false;
  return passages.slice(1).some((passage) => passage.movementType === "ENTRY" && passage.scannedAt <= latest.scannedAt);
}

function statusFromLatestPassage(passage?: ReportParticipant["passages"][number]) {
  if (passage?.movementType === "ENTRY") return "on-site";
  if (passage?.movementType === "EXIT") return "off-site";
  return "not-arrived";
}

export async function participantReportRows(kind: string) {
  const base = await prisma.participant.findMany({
    where: {
      isActive: true,
      ...(kind === "last-minute" ? { isLastMinute: true } : {}),
    },
    include: {
      passages: {
        where: { isCancelled: false },
        orderBy: { scannedAt: "desc" },
        ...(kind === "long-exits" ? {} : { take: 1 }),
      },
    },
    orderBy: [{ sourceCategory: "asc" }, { groupName: "asc" }, { badgeCode: "asc" }],
  });

  if (kind === "long-exits") {
    const settings = await getSettings();
    return base.filter((participant) => {
      if (!hasEntryBeforeLatestExit(participant.passages)) return false;
      const latest = participant.passages[0];
      const minutesOut = Math.round((Date.now() - latest.scannedAt.getTime()) / 60000);
      return minutesOut >= settings.exitWarningMinutes;
    });
  }

  return base.filter((participant) => {
    const status = statusFromLatestPassage(participant.passages[0]);
    if (["on-site", "off-site", "not-arrived"].includes(kind)) return kind === status;
    return true;
  });
}
