import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { scanByCode } from "@/services/api/scan";
import type { GateName, ScanResult } from "@/lib/types";
import { ScanLine, CheckCircle2, XCircle, AlertCircle, ArrowRight, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { QrScanner } from "@/components/QrScanner";

export const Route = createFileRoute("/_app/scan")({
  head: () => ({ meta: [{ title: "Scan rapide · CIRT" }] }),
  component: ScanPage,
});

const GATES: GateName[] = ["Entrée principale", "Sortie principale", "Bureau de contrôle", "Zone coach", "Autre"];

function movementHint(gate: GateName) {
  const normalized = gate.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (normalized.includes("entree")) return { label: "Ce point enregistrera une entrée.", className: "bg-iris-lime/20 text-primary-deep" };
  if (normalized.includes("sortie")) return { label: "Ce point enregistrera une sortie.", className: "bg-amber-100 text-amber-700" };
  return { label: "Ce point alterne selon le dernier passage enregistré.", className: "bg-muted text-muted-foreground" };
}

function extractCode(text: string): string {
  const trimmed = text.trim();
  // If URL like .../p/<token>, extract token; else return as is
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("p");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      return parts[parts.length - 1] ?? trimmed;
    }
  } catch { /* noop */ }
  return trimmed;
}

function ScanPage() {
  const [code, setCode] = useState("");
  const [gate, setGate] = useState<GateName>("Entrée principale");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const hint = movementHint(gate);

  const handleScan = useCallback(async (raw: string) => {
    const value = extractCode(raw);
    if (!value || busy) return;
    setBusy(true);
    try {
      const r = await scanByCode(value, gate);
      setResult(r);
      if (r.ok) {
        toast.success(r.message, { description: r.participant?.fullName });
      } else {
        toast.error(r.message, {
          description: r.participant
            ? `${r.participant.fullName} · ${statusLabel(r.currentStatus)}`
            : "Aucun passage n'a été enregistré.",
        });
      }
      setCode("");
    } catch (e: any) {
      toast.error("Scan impossible", { description: e?.message ?? "Veuillez réessayer." });
    } finally { setBusy(false); }
  }, [busy, gate]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!code.trim()) return;
    handleScan(code);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Contrôle d'accès</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">Scan rapide</h1>
        <p className="text-sm text-muted-foreground mt-1">Scannez un QR code via la caméra ou saisissez un Badge ID (ex. <span className="font-turret">CIRT-000001</span>).</p>
      </div>

      <Card className="p-4 sm:p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gate">Point de contrôle</Label>
            <Select value={gate} onValueChange={(v) => setGate(v as GateName)}>
              <SelectTrigger id="gate"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GATES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className={cn("inline-flex rounded px-2 py-1 text-xs font-medium", hint.className)}>
              {hint.label}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code">Badge ID ou QR</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <ScanLine className="size-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CIRT-000001"
                  className="pl-10 h-14 text-lg font-turret tracking-wider"
                />
              </div>
              <Button type="submit" disabled={busy} className="h-14 px-6 bg-deep">
                Valider <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant={cameraOpen ? "secondary" : "outline"}
            className="w-full h-12"
            onClick={() => setCameraOpen((v) => !v)}
          >
            <Camera className="size-4 mr-2" />
            {cameraOpen ? "Fermer la caméra" : "Scanner avec la caméra"}
          </Button>

          <AnimatePresence>
            {cameraOpen && (
              <QrScanner
                onDetected={(text) => { handleScan(text); }}
                onClose={() => setCameraOpen(false)}
              />
            )}
          </AnimatePresence>
        </form>
      </Card>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.message + (result.participant?.id ?? "")}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <ResultCard result={result} onReset={() => setResult(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultCard({ result, onReset }: { result: ScanResult; onReset: () => void }) {
  const ok = result.ok;
  const dup = result.duplicateIgnored;
  const p = result.participant;
  const status = statusLabel(result.currentStatus ?? p?.currentStatus);

  return (
    <Card
      className={cn(
        "p-4 sm:p-6 border-2 transition-all",
        dup
          ? "border-amber-300 bg-amber-50"
          : ok
          ? result.movementType === "ENTRY"
            ? "border-iris-lime bg-iris-lime/10"
            : "border-amber-400 bg-amber-50"
          : "border-destructive bg-destructive/5"
      )}
    >
      <div className="flex items-center gap-3">
        {dup ? (
          <AlertCircle className="size-7 sm:size-8 text-amber-500 shrink-0" />
        ) : ok ? (
          <CheckCircle2 className="size-7 sm:size-8 text-green-600 shrink-0" />
        ) : (
          <XCircle className="size-7 sm:size-8 text-destructive shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-lg sm:text-2xl font-display font-bold truncate">{result.message}</div>
          {p && (
            <div className="text-xs sm:text-sm text-muted-foreground truncate">
              {[result.gateName, result.agentName, status].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onReset} className="shrink-0">Nouveau</Button>
      </div>

      {p && (
        <div className="mt-5 grid sm:grid-cols-[auto_1fr] gap-4 items-center">
          <div className="size-16 sm:size-20 rounded-2xl bg-deep grid place-items-center text-white text-xl sm:text-2xl font-black shrink-0">
            {p.photoPath
              ? <img src={p.photoPath} className="w-full h-full rounded-2xl object-cover" alt={p.fullName} />
              : p.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg sm:text-xl font-bold truncate">{p.fullName}</div>
            <div className="text-sm text-muted-foreground">
              <span className="font-turret text-base text-foreground">{p.badgeCode}</span> · {p.sourceCategory ?? "—"}
            </div>
            {(p.teamName || p.groupName) && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {p.teamName ?? p.groupName} · {p.organization ?? "—"}
              </div>
            )}
            <div className="mt-2">
              <span className={cn(
                "inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 rounded",
                (result.currentStatus ?? p.currentStatus) === "ON_SITE"
                  ? "bg-iris-lime text-primary-deep"
                  : (result.currentStatus ?? p.currentStatus) === "OFF_SITE"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-muted text-muted-foreground"
              )}>
                {status}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "ON_SITE": return "Sur site";
    case "OFF_SITE": return "Hors site";
    case "NOT_ARRIVED": return "Pas arrivé";
    default: return "";
  }
}
