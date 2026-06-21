import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listParticipants, sendGroupBadgeEmails, sendParticipantBadgeEmail, type BadgeEmailResult } from "@/services/api/participants";
import { downloadFile, http } from "@/services/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BadgePreview } from "@/components/BadgePreview";
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/permissions";
import { Search, Download, UploadCloud, Layers, Mail, Send, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import type { Participant } from "@/lib/types";

const search = z.object({ id: z.string().optional() });
const MAIL_RESUME_KEY = "cirt.badge.email.results.v1";
const INVALID_EMAILS_KEY = "cirt.badge.email.invalid.v1";

type InvalidEmailRecord = {
  participantId: string;
  badgeCode: string;
  sourceReference: string;
  fullName: string;
  email: string;
  phone: string;
  sourceCategory: string;
  groupName: string;
  teamName: string;
  organization: string;
  reason: string;
  detectedAt: string;
};

export const Route = createFileRoute("/_app/badges")({
  head: () => ({ meta: [{ title: "Badges · CIRT" }] }),
  validateSearch: (s) => search.parse(s),
  component: BadgesPage,
});

function BadgesPage() {
  const { user } = useAuth();
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/badges" } as any);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [mailProgress, setMailProgress] = useState({ done: 0, total: 0, sent: 0, skipped: 0, failed: 0 });
  const [mailResults, setMailResults] = useState<BadgeEmailResult[]>([]);
  const [mailSending, setMailSending] = useState(false);
  const [invalidEmailCount, setInvalidEmailCount] = useState(() => readSavedInvalidEmails().length);
  const templateInputRef = useRef<HTMLInputElement | null>(null);
  const logosInputRef = useRef<HTMLInputElement | null>(null);
  const list = useQuery({ queryKey: ["participants-badges", q, page], queryFn: () => listParticipants({ search: q, page, pageSize: 5 }) });
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  async function download(path: string, fileName: string) {
    try {
      await downloadFile(path, fileName);
    } catch (e: any) {
      toast.error(e?.message ?? "Téléchargement impossible");
    }
  }

  async function uploadTemplate(file: File | null | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("template", file);
    try {
      await http("/badges/template", { method: "POST", body: form });
      toast.success("Gabarit envoyé");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload impossible");
    } finally {
      if (templateInputRef.current) templateInputRef.current.value = "";
    }
  }

  async function uploadLogos(files: FileList | null | undefined) {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files).slice(0, 3).forEach((file) => form.append("logos", file));
    try {
      await http("/badges/logos", { method: "POST", body: form });
      toast.success("Logos envoyés");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload impossible");
    } finally {
      if (logosInputRef.current) logosInputRef.current.value = "";
    }
  }

  async function loadAllParticipants() {
    const all = [];
    let currentPage = 1;
    let totalPages = 1;
    do {
      const pageResult = await listParticipants({ page: currentPage, pageSize: 100 });
      all.push(...pageResult.items);
      totalPages = Math.max(1, Math.ceil(pageResult.total / pageResult.pageSize));
      currentPage += 1;
    } while (currentPage <= totalPages);
    return all;
  }

  function readSavedMailResults() {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(localStorage.getItem(MAIL_RESUME_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed as BadgeEmailResult[] : [];
    } catch {
      return [];
    }
  }

  function saveMailResults(results: BadgeEmailResult[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(MAIL_RESUME_KEY, JSON.stringify(results));
  }

  function resetSavedMailResults() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(MAIL_RESUME_KEY);
  }

  function readSavedInvalidEmails() {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(localStorage.getItem(INVALID_EMAILS_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed as InvalidEmailRecord[] : [];
    } catch {
      return [];
    }
  }

  function saveInvalidEmails(records: InvalidEmailRecord[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(INVALID_EMAILS_KEY, JSON.stringify(records));
    setInvalidEmailCount(records.length);
  }

  function resetInvalidEmails() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(INVALID_EMAILS_KEY);
    setInvalidEmailCount(0);
  }

  function saveInvalidEmail(participant: Participant, reason: string) {
    const records = readSavedInvalidEmails();
    const nextRecord: InvalidEmailRecord = {
      participantId: participant.id,
      badgeCode: participant.badgeCode,
      sourceReference: participant.sourceReference ?? "",
      fullName: participant.fullName,
      email: participant.email ?? "",
      phone: participant.phone ?? "",
      sourceCategory: participant.sourceCategory ?? "",
      groupName: participant.groupName ?? "",
      teamName: participant.teamName ?? "",
      organization: participant.organization ?? "",
      reason,
      detectedAt: new Date().toISOString(),
    };
    const deduped = records.filter((record) => record.participantId !== participant.id);
    saveInvalidEmails([...deduped, nextRecord]);
    return nextRecord;
  }

  function downloadInvalidEmails() {
    const records = readSavedInvalidEmails();
    if (!records.length) {
      toast.info("Aucun email invalide enregistré");
      return;
    }
    const columns: Array<keyof InvalidEmailRecord> = [
      "badgeCode",
      "participantId",
      "sourceReference",
      "fullName",
      "email",
      "phone",
      "sourceCategory",
      "groupName",
      "teamName",
      "organization",
      "reason",
      "detectedAt",
    ];
    const header = [
      "Numero badge",
      "ID",
      "Reference",
      "Nom",
      "Email",
      "Telephone",
      "Categorie",
      "Groupe",
      "Equipe",
      "Organisation",
      "Raison",
      "Detecte le",
    ];
    const escapeCsv = (value: string) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
    const rows = records.map((record) => columns.map((column) => escapeCsv(record[column])).join(","));
    const blob = new Blob([`\uFEFF${[header.map(escapeCsv).join(","), ...rows].join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `emails-invalides-badges-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function sendAllBadgesByEmail({ resume = false }: { resume?: boolean } = {}) {
    setMailDialogOpen(true);
    setMailSending(true);
    const savedResults = resume ? readSavedMailResults().filter((result) => result.ok) : [];
    const savedInvalids = resume ? readSavedInvalidEmails() : [];
    if (!resume) {
      resetSavedMailResults();
      resetInvalidEmails();
    }
    const results: BadgeEmailResult[] = [...savedResults];
    const successfulIds = new Set(savedResults.filter((result) => result.ok).map((result) => result.participantId));
    const invalidIds = new Set(savedInvalids.map((record) => record.participantId));
    setMailResults(results);
    setMailProgress({
      done: savedResults.length,
      total: list.data?.total ?? 0,
      sent: savedResults.filter((result) => result.ok && !result.skipped).length,
      skipped: savedResults.filter((result) => result.ok && result.skipped).length,
      failed: savedResults.filter((result) => !result.ok).length,
    });
    try {
      const participants = await loadAllParticipants();
      const pending = participants.filter((participant) => !successfulIds.has(participant.id) && !invalidIds.has(participant.id));
      setMailProgress((current) => ({
        ...current,
        done: savedResults.length + savedInvalids.length,
        total: participants.length,
        failed: current.failed + savedInvalids.length,
      }));

      for (const participant of pending) {
        if (!isValidEmail(participant.email)) {
          const reason = participant.email?.trim() ? "Format email invalide" : "Email manquant";
          saveInvalidEmail(participant, reason);
          results.push({
            ok: false,
            participantId: participant.id,
            badgeCode: participant.badgeCode,
            fullName: participant.fullName,
            email: participant.email ?? undefined,
            error: reason,
          });
          saveMailResults(results);
          setMailProgress((current) => ({
            ...current,
            done: current.done + 1,
            failed: current.failed + 1,
          }));
          setMailResults([...results]);
          continue;
        }
        try {
          const result = await sendParticipantBadgeEmail(participant.id, { force: !resume });
          if (!result.ok && isInvalidEmailError(result.error)) {
            saveInvalidEmail(participant, result.error ?? "Email invalide");
          }
          results.push(result);
          saveMailResults(results);
          setMailProgress((current) => ({
            done: current.done + 1,
            total: current.total,
            sent: current.sent + (result.ok && !result.skipped ? 1 : 0),
            skipped: current.skipped + (result.ok && result.skipped ? 1 : 0),
            failed: current.failed + (result.ok ? 0 : 1),
          }));
        } catch (error: any) {
          if (isInvalidEmailError(error?.message)) {
            saveInvalidEmail(participant, error.message);
          }
          results.push({
            ok: false,
            participantId: participant.id,
            badgeCode: participant.badgeCode,
            fullName: participant.fullName,
            email: participant.email ?? undefined,
            error: error?.message ?? "Envoi impossible",
          });
          saveMailResults(results);
          setMailProgress((current) => ({
            ...current,
            done: current.done + 1,
            failed: current.failed + 1,
          }));
        }
        setMailResults([...results]);
      }

      if (results.some((result) => !result.ok)) {
        toast.error("Envoi terminé avec erreurs", { description: `${results.filter((result) => result.ok && !result.skipped).length} envoyé(s), ${results.filter((result) => result.ok && result.skipped).length} déjà envoyé(s), ${results.filter((result) => !result.ok).length} échec(s)` });
      } else {
        toast.success("Tous les badges ont été envoyés");
      }
    } catch (error: any) {
      toast.error("Envoi global impossible", { description: error?.message ?? "Vérifiez la configuration email." });
    } finally {
      setMailSending(false);
    }
  }

  async function sendGroupBadgesByEmail(groupName: string) {
    try {
      const result = await sendGroupBadgeEmails(groupName, { force: true });
      if (result.failed) toast.error("Envoi groupe terminé avec erreurs", { description: `${result.sent} envoyé(s), ${result.failed} échec(s)` });
      else toast.success("Badges du groupe envoyés", { description: `${result.sent} email(s)` });
    } catch (error: any) {
      toast.error("Envoi groupe impossible", { description: error?.message ?? "Vérifiez la configuration email." });
    }
  }

  const selected = useMemo(() => {
    if (!list.data) return null;
    return list.data.items.find((p) => p.id === id) ?? list.data.items[0] ?? null;
  }, [list.data, id]);
  const canConfigureBadges = canAccess(user?.role, "badges.configure");
  const canSendBadgeEmails = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Identité</div>
          <h1 className="font-display text-3xl font-bold mt-1">Badges</h1>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          {canConfigureBadges && (
            <>
              <input ref={templateInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => uploadTemplate(event.target.files?.[0])} />
              <input ref={logosInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" multiple className="hidden" onChange={(event) => uploadLogos(event.target.files)} />
              {/* <Button variant="outline" onClick={() => templateInputRef.current?.click()}><UploadCloud className="size-4 mr-2" />Gabarit</Button> */}
              {/* <Button variant="outline" onClick={() => logosInputRef.current?.click()}><UploadCloud className="size-4 mr-2" />Logos</Button> */}
            </>
          )}
          <Button className="bg-deep" onClick={() => download("/badges/batch/pdf", "badges-cirt.pdf")}><Layers className="size-4 mr-2" />Tous les badges</Button>
        </div>
      </div>

      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-6 items-start">
        <Card className="overflow-hidden min-w-0">
          <div className="grid gap-2 border-b p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un participant…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            {canSendBadgeEmails && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={!list.data?.total || mailSending}>
                    <Send className="size-4 mr-2" />Envoyer tous
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Envoyer tous les badges par email ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Les badges seront envoyés aux participants qui ont une adresse email renseignée, même si un badge a déjà été envoyé auparavant. Pour reprendre après une coupure sans doublons, utilisez plutôt Continuer l'envoi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => sendAllBadgesByEmail()}>Confirmer l'envoi</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {canSendBadgeEmails && (
              <Button variant="outline" disabled={!invalidEmailCount} onClick={downloadInvalidEmails}>
                <Download className="size-4 mr-2" />Invalides {invalidEmailCount ? `(${invalidEmailCount})` : ""}
              </Button>
            )}
            {canSendBadgeEmails && readSavedMailResults().some((result) => result.ok) && (
              <Button variant="secondary" disabled={mailSending} onClick={() => sendAllBadgesByEmail({ resume: true })}>
                Continuer l'envoi
              </Button>
            )}
          </div>
          <div className="divide-y max-h-[360px] lg:max-h-[640px] overflow-y-auto">
            {list.data?.items.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.3) }}
                onClick={() => navigate({ search: { id: p.id } } as any)}
                className="w-full min-w-0 text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
              >
                <div className="size-10 rounded-lg bg-deep grid place-items-center text-white text-xs font-bold shrink-0">
                  {p.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{p.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.badgeCode} · {p.sourceCategory ?? "—"}</div>
                </div>
                {selected?.id === p.id && <span className="text-[10px] uppercase tracking-widest text-iris-violet shrink-0">Sélectionné</span>}
              </motion.button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t text-sm text-muted-foreground">
            <span>{list.data?.total ?? 0} résultat(s)</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Préc.</Button>
              <span>{page}/{totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suiv.</Button>
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-4">
          {selected ? (
            <>
              <BadgePreview participant={selected} />
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-center">
                <Button className="bg-deep" onClick={() => download(`/badges/${selected.id}/pdf`, `${selected.badgeCode}.pdf`)}>
                  <Download className="size-4 mr-2" /> PDF individuel
                </Button>
                {canSendBadgeEmails && (
                  <Button variant="outline" disabled={!selected.groupName} onClick={() => selected.groupName && sendGroupBadgesByEmail(selected.groupName)}>
                    <Mail className="size-4 mr-2" /> Envoi badge
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">Sélectionnez un participant.</Card>
          )}
        </div>
      </div>

      {mailDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
          <div className="relative w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
            {!mailSending && (
              <button
                type="button"
                className="absolute right-4 top-4 rounded-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMailDialogOpen(false)}
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold leading-none tracking-tight">Envoi des badges</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mailSending ? "Envoi en cours, participant par participant." : "Envoi terminé."}
              </p>
            </div>
            <div className="mt-4 space-y-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${mailProgress.total ? Math.round((mailProgress.done / mailProgress.total) * 100) : 0}%` }}
                />
              </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
              <div className="rounded-lg bg-muted p-2">
                <div className="font-display text-lg font-bold">{mailProgress.done}/{mailProgress.total}</div>
                <div className="text-xs text-muted-foreground">Traités</div>
              </div>
              <div className="rounded-lg bg-iris-lime/30 p-2 text-primary-deep">
                <div className="font-display text-lg font-bold">{mailProgress.sent}</div>
                <div className="text-xs">Envoyés</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="font-display text-lg font-bold">{mailProgress.skipped}</div>
                <div className="text-xs text-muted-foreground">Déjà envoyés</div>
              </div>
              <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                <div className="font-display text-lg font-bold">{mailProgress.failed}</div>
                <div className="text-xs">Échecs</div>
              </div>
            </div>
            {mailResults.some((result) => !result.ok) && (
              <div className="max-h-40 overflow-y-auto rounded-lg border text-xs">
                {mailResults.filter((result) => !result.ok).map((result) => (
                  <div key={result.participantId} className="border-b px-3 py-2 last:border-b-0">
                    <div className="font-medium">{result.fullName} · {result.badgeCode}</div>
                    <div className="text-destructive">{result.error}</div>
                  </div>
                ))}
              </div>
            )}
            {!mailSending && (
              <div className="grid gap-2 sm:grid-cols-2">
                {mailResults.some((result) => !result.ok) && (
                  <Button variant="outline" onClick={() => sendAllBadgesByEmail({ resume: true })}>
                    Continuer l'envoi
                  </Button>
                )}
                <Button className="w-full" onClick={() => setMailDialogOpen(false)}>
                  Fermer
                </Button>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isValidEmail(email: string | null | undefined) {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
}

function isInvalidEmailError(message: string | null | undefined) {
  const text = String(message ?? "").toLowerCase();
  return (
    text.includes("aucun email") ||
    text.includes("adresse email") ||
    text.includes("destinataire invalide") ||
    text.includes("invalid recipient") ||
    text.includes("recipient address rejected")
  );
}
