import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrap, changePassword, login } from "@/services/api/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/bootstrap")({
  component: BootstrapPage,
});

function BootstrapPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    bootstrap()
      .then((result) => setCredentials({ email: result.email, password: result.password }))
      .catch(() => setCredentials(null));
  }, []);

  async function finish() {
    if (!credentials) return;
    if (newPassword.length < 10) return toast.error("Le nouveau mot de passe doit contenir au moins 10 caractères");
    setBusy(true);
    try {
      await login(credentials.email, credentials.password);
      await changePassword(newPassword);
      toast.success("Bootstrap terminé. Connectez-vous avec le nouveau mot de passe.");
      await navigate({ to: "/login", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Bootstrap impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface-muted p-6">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Initialisation</div>
          <h1 className="font-display text-2xl font-bold mt-1">Bootstrap administrateur</h1>
        </div>
        {credentials ? (
          <>
            <div className="rounded-lg border p-3 text-sm">
              <div><span className="text-muted-foreground">Email temporaire :</span> <span className="font-medium">{credentials.email}</span></div>
              <div><span className="text-muted-foreground">Mot de passe temporaire :</span> <span className="font-mono">{credentials.password}</span></div>
            </div>
            <div className="space-y-1.5">
              <Label>Nouveau mot de passe administrateur</Label>
              <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <Button disabled={busy} className="w-full bg-deep" onClick={finish}>Clôturer le bootstrap</Button>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Bootstrap déjà terminé ou indisponible.</div>
        )}
      </Card>
    </div>
  );
}
