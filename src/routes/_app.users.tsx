import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, listUsers, toggleUser } from "@/services/api/users";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { UserRole } from "@/lib/types";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Utilisateurs · CIRT" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "SCAN_AGENT" as UserRole });
  const [page, setPage] = useState(1);
  const users = list.data ?? [];
  const totalPages = Math.max(1, Math.ceil(users.length / 5));
  const pageUsers = useMemo(() => users.slice((page - 1) * 5, page * 5), [users, page]);

  async function create() {
    if (!form.name || !form.email || !form.password) return toast.error("Tous les champs sont requis");
    await createUser(form);
    qc.invalidateQueries({ queryKey: ["users"] });
    setForm({ name: "", email: "", password: "", role: "SCAN_AGENT" });
    toast.success("Utilisateur créé");
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Sécurité</div>
        <h1 className="font-display text-3xl font-bold mt-1">Utilisateurs</h1>
      </div>

      <Card className="p-5 grid lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
        <Field label="Nom"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Mot de passe"><PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Rôle">
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="SUPERVISOR">Superviseur</SelectItem>
              <SelectItem value="SCAN_AGENT">Agent de scan</SelectItem>
              <SelectItem value="REPORT_AGENT">Agent rapports</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Button onClick={create} className="bg-deep"><Plus className="size-4 mr-1" />Créer</Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs uppercase tracking-widest text-muted-foreground border-b">
          <div>Nom</div><div>Email</div><div>Rôle</div><div>Actif</div><div></div>
        </div>
        <div className="divide-y">
          {pageUsers.map((u) => (
            <div key={u.id} className="px-5 py-3 grid md:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 items-center">
              <div className="font-medium truncate">{u.name}</div>
              <div className="text-sm text-muted-foreground truncate">{u.email}</div>
              <div className="text-xs uppercase tracking-widest">{u.role}</div>
              <Switch
                checked={u.isActive}
                onCheckedChange={async (v) => { await toggleUser(u.id, v); qc.invalidateQueries({ queryKey: ["users"] }); }}
              />
              <div></div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 p-4 border-t text-sm text-muted-foreground">
          <span>{users.length} utilisateur(s)</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Préc.</Button>
            <span>{page}/{totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suiv.</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
