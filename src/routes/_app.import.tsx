import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  commitParticipantImport,
  downloadParticipantTemplate,
  previewParticipantImport,
  type ImportPreview,
} from "@/services/api/participants";

export const Route = createFileRoute("/_app/import")({
  head: () => ({ meta: [{ title: "Import · CIRT" }] }),
  component: ImportPage,
});

function ImportPage() {
  const [category, setCategory] = useState("Hackathon");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const previewRows = preview?.rows ?? [];
  const previewTotalPages = Math.max(1, Math.ceil(previewRows.length / 5));
  const pageRows = useMemo(() => previewRows.slice((previewPage - 1) * 5, previewPage * 5), [previewRows, previewPage]);

  async function downloadTemplate() {
    try {
      await downloadParticipantTemplate();
    } catch (e: any) {
      toast.error(e?.message ?? "Téléchargement impossible");
    }
  }

  async function previewFile() {
    if (!file) return;
    setBusy(true);
    try {
      const result = await previewParticipantImport(file);
      setPreview(result);
      setPreviewPage(1);
      toast.success(`${result.rows.filter((row) => row.ok).length} ligne(s) valide(s) détectée(s)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Prévisualisation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    if (!preview || !file) return;
    const rows = preview.rows.filter((row) => row.ok && row.data).map((row) => row.data as Record<string, unknown>);
    if (!rows.length) return toast.error("Aucune ligne valide à importer");
    setBusy(true);
    try {
      const result = await commitParticipantImport(rows, category, file.name);
      toast.success(`${result.importedRows} participant(s) importé(s)`);
      setPreview(null);
      setFile(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Import impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Données</div>
          <h1 className="font-display text-3xl font-bold mt-1">Import Excel / CSV</h1>
          <p className="text-sm text-muted-foreground mt-1">Plusieurs fichiers successifs sont supportés. Aucun écrasement sans confirmation.</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="size-4 mr-2" /> Modèle Excel
        </Button>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid sm:grid-cols-[1fr_2fr] gap-4">
          <div className="space-y-1.5">
            <Label>Catégorie source</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Hackathon", "CTF", "Coach", "Organisation", "Invité", "Autre"].map((c) =>
                  <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fichier</Label>
            <label className="block border-2 border-dashed rounded-xl p-6 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setPreview(null);
                  setPreviewPage(1);
                }}
              />
              <div className="flex items-center gap-3">
                <UploadCloud className="size-6 text-muted-foreground" />
                <div className="text-sm">
                  {file ? <span className="font-medium">{file.name}</span> : "Cliquer pour sélectionner un fichier .xlsx, .xls ou .csv"}
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={!file || busy} onClick={previewFile} className="bg-deep">
            <FileSpreadsheet className="size-4 mr-2" /> Prévisualiser
          </Button>
          <Button disabled={!preview || busy} variant="outline" onClick={commitImport}>
            Confirmer l'import
          </Button>
        </div>
      </Card>

      {preview && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b text-sm font-medium">
            Prévisualisation ({preview.rows.length} lignes, {preview.duplicates.length} doublon(s) possible(s))
          </div>
          <div className="divide-y">
            {pageRows.map((row, i) => {
              const data = row.data ?? {};
              return (
              <div key={`${previewPage}-${i}`} className="px-5 py-3 grid grid-cols-[auto_minmax(0,2fr)] sm:grid-cols-[auto_2fr_2fr_1.5fr_1.5fr] gap-3 items-center text-sm">
                {row.ok ? <CheckCircle2 className="size-4 text-green-600" /> : <AlertTriangle className="size-4 text-amber-600" />}
                <div className="min-w-0">
                  <div className="truncate">{String(data.fullName || "") || <span className="text-destructive">Ligne invalide</span>}</div>
                  {row.error && <div className="text-xs text-destructive whitespace-normal">{row.error}</div>}
                </div>
                <div className="hidden sm:block truncate text-muted-foreground">{String(data.email || "—")}</div>
                <div className="hidden sm:block truncate">{String(data.groupName || "—")}</div>
                <div className="hidden sm:block truncate">{String(data.teamName || "—")}</div>
              </div>
            );})}
          </div>
          <div className="flex items-center justify-between gap-2 p-4 border-t text-sm text-muted-foreground">
            <span>{previewRows.length} ligne(s)</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={previewPage <= 1} onClick={() => setPreviewPage((p) => p - 1)}>Préc.</Button>
              <span>{previewPage}/{previewTotalPages}</span>
              <Button size="sm" variant="outline" disabled={previewPage >= previewTotalPages} onClick={() => setPreviewPage((p) => p + 1)}>Suiv.</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
