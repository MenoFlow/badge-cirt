import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import type { Participant } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  participant: Participant;
  publicBaseUrl?: string;
  eventName?: string;
  className?: string;
}

const typeLabel: Record<Participant["participantType"], string> = {
  PARTICIPANT: "Participant",
  COACH: "Coach",
  JURY: "Jury",
  ORGANIZER: "Organisation",
  GUEST: "Invité",
};

const NAME_FONT_SIZES = [18, 17, 16, 15, 14, 13, 12];

function estimateTextWidth(text: string, fontSize: number) {
  return Array.from(text).reduce((total, char) => {
    if (char === " ") return total + fontSize * 0.32;
    if ("MW@#%&".includes(char)) return total + fontSize * 0.9;
    if ("ilI.,'|!".includes(char)) return total + fontSize * 0.3;
    return total + fontSize * 0.56;
  }, 0);
}

function splitLongWord(word: string, maxWidth: number, fontSize: number) {
  const parts: string[] = [];
  let part = "";
  for (const char of Array.from(word)) {
    const next = `${part}${char}`;
    if (part && estimateTextWidth(`${next}-`, fontSize) > maxWidth) {
      parts.push(`${part}-`);
      part = char;
    } else {
      part = next;
    }
  }
  if (part) parts.push(part);
  return parts;
}

export function calculateBadgeNameLayout(name: string, maxWidth: number, maxLines = 3) {
  const normalized = name.trim().replace(/\s+/g, " ");
  for (const fontSize of NAME_FONT_SIZES) {
    const words = normalized
      .split(" ")
      .flatMap((word) => estimateTextWidth(word, fontSize) > maxWidth ? splitLongWord(word, maxWidth, fontSize) : [word]);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && estimateTextWidth(next, fontSize) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);

    if (lines.length <= maxLines) return { lines, fontSize, overflows: false };
  }

  const fontSize = NAME_FONT_SIZES[NAME_FONT_SIZES.length - 1];
  const words = normalized
    .split(" ")
    .flatMap((word) => estimateTextWidth(word, fontSize) > maxWidth ? splitLongWord(word, maxWidth, fontSize) : [word]);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && estimateTextWidth(next, fontSize) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const last = lines[lines.length - 1] ?? "";
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[lines.length - 1] = last.length > 3 ? `${last.slice(0, -1)}…` : "…";
  }
  return { lines, fontSize, overflows: true };
}

export function BadgePreview({
  participant: p,
  publicBaseUrl = "https://badges.cirt.sn",
  eventName = "CIRT Cybersecurity Days",
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nameBoxRef = useRef<HTMLDivElement | null>(null);
  const [nameBoxWidth, setNameBoxWidth] = useState(300);

  useEffect(() => {
    if (!canvasRef.current) return;
    const url = `${publicBaseUrl}/p/${p.qrToken}`;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 180,
      margin: 1,
      color: { dark: "#17004B", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }, [p.qrToken, publicBaseUrl]);

  useEffect(() => {
    if (!nameBoxRef.current) return;
    const element = nameBoxRef.current;
    const update = () => setNameBoxWidth(Math.max(180, element.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const nameLayout = useMemo(
    () => calculateBadgeNameLayout(p.fullName, nameBoxWidth, 2),
    [p.fullName, nameBoxWidth],
  );

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[min(360px,calc(100vw-2rem))] aspect-[2/3.35] sm:aspect-[2/3] rounded-3xl overflow-hidden shadow-card bg-white",
        className
      )}
    >
      <div className="absolute inset-0 bg-deep" />
      <div className="absolute inset-0 opacity-30 bg-iris animate-iris" />

      <div className="relative h-full w-full min-w-0 flex flex-col text-white p-3 sm:p-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="font-turret tracking-widest text-sm shrink-0">CIRT</div>
          <div className="min-w-0 truncate text-right text-[9px] sm:text-[10px] uppercase tracking-widest text-white/70">{eventName}</div>
        </div>

        <div className="mt-3 sm:mt-4 grid place-items-center">
          <div className="size-[clamp(4.5rem,24vw,6rem)] rounded-full overflow-hidden border-2 border-white/40 bg-white/10 grid place-items-center">
            {p.photoPath ? (
              <img src={p.photoPath} alt={p.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl sm:text-2xl font-black text-white/80">
                {p.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </span>
            )}
          </div>
        </div>

        <div ref={nameBoxRef} className="mt-3 sm:mt-4 text-center">
          <div
            className="font-display leading-tight font-bold break-words"
            style={{ fontSize: `${nameLayout.fontSize}px` }}
            title={nameLayout.overflows ? p.fullName : undefined}
          >
            {nameLayout.lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
          </div>
          <div className="text-[11px] sm:text-xs text-iris-lime uppercase tracking-widest mt-1">
            {typeLabel[p.participantType]} · {p.sourceCategory ?? "—"}
          </div>
          {(p.teamName || p.groupName) && (
            <div className="text-[10px] sm:text-xs text-white/70 mt-0.5 truncate">
              {p.teamName ?? p.groupName} {p.organization ? `· ${p.organization}` : ""}
            </div>
          )}
        </div>

        <div className="mt-auto min-h-[14.75rem] sm:min-h-0 min-w-0 rounded-2xl bg-white p-2 sm:p-3 grid grid-rows-[auto_minmax(0,1fr)] place-items-center gap-1 sm:gap-2">
          <div className="min-w-0 text-center">
            <div className="text-[10px] uppercase tracking-widest text-primary-deep/60">Badge ID</div>
            <div className="font-turret text-base sm:text-xl leading-tight text-primary-deep truncate">{p.badgeCode}</div>
            <div className="text-[9px] sm:text-[10px] text-primary-deep/60 mt-0.5 sm:mt-1">
              scan or saisir
            </div>
          </div>
          <div className="grid 
            h-auto w-auto 
            max-h-full max-w-full 
            place-items-center"
          >
            <canvas 
              ref={canvasRef} 
              className="h-[clamp(4.75rem,24vw,6rem)] 
                w-[clamp(4.75rem,24vw,6rem)] 
                shrink-0" 
            />
          </div>

        </div>
      </div>
    </div>
  );
}
