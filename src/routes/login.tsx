import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, ScanLine } from "lucide-react";
import { DEFAULT_ROUTE_BY_ROLE } from "@/services/api/auth";
import { motion } from "framer-motion";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion · CIRT Badge Check" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@cirt.sn");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const u = await login(email, password);
      if (u.mustChangePassword) {
        navigate({ to: "/bootstrap", search: { email: u.email } as any });
        return;
      }
      toast.success(`Bienvenue ${u.name}`);
      navigate({ to: DEFAULT_ROUTE_BY_ROLE[u.role] });
    } catch (e: any) {
      setErr(e?.message ?? "Identifiants invalides");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex bg-deep text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-iris animate-iris" />
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
          className="relative z-10 p-12 flex flex-col w-full"
        >
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-white/10 grid place-items-center backdrop-blur">
              <ShieldCheck className="size-6 text-iris-lime" />
            </div>
            <div>
              <div className="font-turret text-2xl tracking-widest">CIRT BADGE</div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">Check &amp; Control</div>
            </div>
          </div>
          <div className="mt-auto">
            <h1 className="text-5xl font-display font-bold leading-tight">
              Contrôle d'accès <span className="text-iris">sans friction</span>.
            </h1>
            <p className="mt-4 text-white/70 max-w-md">
              Badges QR, saisie manuelle, listes papier de secours, suivi temps réel des entrées et sorties pour les évènements CIRT.
            </p>
            <div className="mt-8 flex items-center gap-3 text-white/60 text-sm">
              <ScanLine className="size-4 text-iris-lime" />
              <span>Hackathon · CTF · Coachs · Organisation · Invités</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <motion.form
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          onSubmit={onSubmit}
          className="w-full max-w-sm space-y-6"
        >
          <div className="lg:hidden flex items-center gap-2">
            <div className="size-9 rounded-xl bg-deep grid place-items-center text-white font-black">CB</div>
            <div>
              <div className="font-turret text-lg tracking-wider">CIRT BADGE</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Check &amp; Control</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold">Connexion</h2>
            <p className="text-sm text-muted-foreground mt-1">Accès réservé aux agents autorisés.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {err && (
            <div className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2">{err}</div>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-deep hover:opacity-90">
            {loading ? "Connexion…" : "Se connecter"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Utilisez le compte administrateur configuré dans le fichier .env.
          </p>
        </motion.form>
      </div>
    </div>
  );
}
