import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/services/api/settings";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { Settings as S } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Paramètres · CIRT" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [form, setForm] = useState<S | null>(null);
  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  if (!form) return <div className="text-sm text-muted-foreground">Chargement…</div>;

  async function save() {
    if (!form) return;
    await updateSettings(form);
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Paramètres enregistrés");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Configuration</div>
        <h1 className="font-display text-3xl font-bold mt-1">Paramètres</h1>
      </div>

      <Card className="p-5 sm:p-6 space-y-4">
        <Field label="Nom de l'évènement">
          <Input value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} />
        </Field>
        <Field label="URL publique des badges">
          <Input value={form.publicBaseUrl} onChange={(e) => setForm({ ...form, publicBaseUrl: e.target.value })} />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Seuil sortie longue (min)">
            <Input type="number" value={form.exitWarningMinutes} onChange={(e) => setForm({ ...form, exitWarningMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Seuil sortie critique (min)">
            <Input type="number" value={form.exitCriticalMinutes} onChange={(e) => setForm({ ...form, exitCriticalMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Fenêtre anti-doublon (s)">
            <Input type="number" value={form.duplicateScanWindowSeconds} onChange={(e) => setForm({ ...form, duplicateScanWindowSeconds: Number(e.target.value) })} />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium text-sm">Upload de photo public</div>
            <div className="text-xs text-muted-foreground">Autoriser le participant à ajouter sa photo via lien sécurisé.</div>
          </div>
          <Switch checked={form.allowSelfPhotoUpload} onCheckedChange={(v) => setForm({ ...form, allowSelfPhotoUpload: v })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="font-medium text-sm">Validation de photo obligatoire</div>
            <div className="text-xs text-muted-foreground">La photo n'apparaît qu'après validation par un admin.</div>
          </div>
          <Switch checked={form.requirePhotoValidation} onCheckedChange={(v) => setForm({ ...form, requirePhotoValidation: v })} />
        </div>

        <div className="pt-2">
          <Button onClick={save} className="bg-deep">Enregistrer</Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}