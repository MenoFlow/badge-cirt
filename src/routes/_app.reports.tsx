import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/services/api/client";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Rapports · CIRT" }] }),
  component: ReportsPage,
});

const REPORTS = [
  { key: "participants", label: "Liste intégrale des participants" },
  { key: "by-group", label: "Liste par groupe / équipe" },
  { key: "by-category", label: "Liste par catégorie" },
  { key: "on-site", label: "Présents sur site" },
  { key: "off-site", label: "Sortis du site" },
  { key: "not-arrived", label: "Pas encore arrivés" },
  { key: "long-exits", label: "Sorties longues" },
  { key: "passages", label: "Historique des passages" },
  { key: "incidents", label: "Feuille incidents" },
  { key: "last-minute", label: "Ajouts de dernière minute" },
  { key: "paper-checklist", label: "Liste papier de secours" },
];

function ReportsPage() {
  async function download(path: string, fileName: string) {
    try {
      await downloadFile(path, fileName);
    } catch (e: any) {
      toast.error(e?.message ?? "Téléchargement impossible");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Production</div>
        <h1 className="font-display text-3xl font-bold mt-1">Rapports</h1>
        <p className="text-sm text-muted-foreground mt-1">Exports PDF imprimables et Excel pour la post-analyse.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <Card key={r.key} className="p-5 flex items-start gap-3">
            <div className="size-10 rounded-lg bg-deep grid place-items-center text-white shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{r.label}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => download(`/reports/${r.key}.pdf`, `${r.key}.pdf`)}>
                  <Download className="size-3.5 mr-1" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => download(`/exports/${r.key}.xlsx`, `${r.key}.xlsx`)}>
                  <FileSpreadsheet className="size-3.5 mr-1" /> Excel
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
