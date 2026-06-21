import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listParticipants } from "@/services/api/participants";
import { downloadFile, http } from "@/services/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BadgePreview } from "@/components/BadgePreview";
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/permissions";
import { Search, Download, UploadCloud, Layers } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";

const search = z.object({ id: z.string().optional() });

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

  const selected = useMemo(() => {
    if (!list.data) return null;
    return list.data.items.find((p) => p.id === id) ?? list.data.items[0] ?? null;
  }, [list.data, id]);
  const canConfigureBadges = canAccess(user?.role, "badges.configure");

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
              <Button variant="outline" onClick={() => templateInputRef.current?.click()}><UploadCloud className="size-4 mr-2" />Gabarit</Button>
              <Button variant="outline" onClick={() => logosInputRef.current?.click()}><UploadCloud className="size-4 mr-2" />Logos</Button>
            </>
          )}
          <Button className="bg-deep" onClick={() => download("/badges/batch/pdf", "badges-cirt.pdf")}><Layers className="size-4 mr-2" />Tous les badges</Button>
        </div>
      </div>

      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-6 items-start">
        <Card className="overflow-hidden min-w-0">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un participant…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
            </div>
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
                <Button variant="outline" disabled={!selected.groupName} onClick={() => selected.groupName && download(`/badges/batch/group/${encodeURIComponent(selected.groupName)}/pdf`, `badges-${selected.groupName}.pdf`)}>
                  PDF du groupe
                </Button>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">Sélectionnez un participant.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
