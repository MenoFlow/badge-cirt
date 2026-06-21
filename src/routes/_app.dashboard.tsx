import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAlerts, getDashboardSummary, getRecentPassages } from "@/services/api/dashboard";
import { Card } from "@/components/ui/card";
import {
  Users, UserCheck, UserX, UserMinus, AlertTriangle, ShieldAlert,
  Activity, GraduationCap, Briefcase, UserCog, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord · CIRT" }] }),
  component: DashboardPage,
});

function StatCard({ label, value, icon: Icon, accent, index = 0 }: { label: string; value: number | string; icon: any; accent?: string; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      whileHover={{ y: -2 }}
    >
      <Card className="p-4 sm:p-5 hover:shadow-card transition-shadow h-full">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground truncate">{label}</div>
            <div className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-display font-bold">{value}</div>
          </div>
          <div className={cn("size-10 sm:size-11 rounded-xl grid place-items-center shrink-0", accent ?? "bg-muted text-foreground")}>
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function DashboardPage() {
  const summary = useQuery({ queryKey: ["dashboard-summary"], queryFn: getDashboardSummary });
  const alerts = useQuery({ queryKey: ["dashboard-alerts"], queryFn: getAlerts });
  const passages = useQuery({ queryKey: ["dashboard-passages", 5], queryFn: () => getRecentPassages(5) });

  const s = summary.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Vue d'ensemble</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1 truncate">Tableau de bord</h1>
        </div>
        <div className="shrink-0 text-sm text-muted-foreground hidden sm:block">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
        <StatCard index={0} label="Inscrits" value={s?.totalRegistered ?? "—"} icon={Users} accent="bg-deep text-white" />
        <StatCard index={1} label="Participants" value={s?.participants ?? "—"} icon={GraduationCap} accent="bg-accent-soft text-primary-deep" />
        <StatCard index={2} label="Coachs" value={s?.coaches ?? "—"} icon={UserCog} accent="bg-accent-soft text-primary-deep" />
        <StatCard index={3} label="Organisation" value={s?.organizers ?? "—"} icon={Briefcase} accent="bg-accent-soft text-primary-deep" />
        <StatCard index={4} label="Invités" value={s?.guests ?? "—"} icon={Crown} accent="bg-accent-soft text-primary-deep" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
        <StatCard index={5} label="Sur site" value={s?.onSite ?? "—"} icon={UserCheck} accent="bg-iris-lime/30 text-primary-deep" />
        <StatCard index={6} label="Hors site" value={s?.offSite ?? "—"} icon={UserX} accent="bg-muted text-foreground" />
        <StatCard index={7} label="Pas arrivés" value={s?.notArrived ?? "—"} icon={UserMinus} accent="bg-muted text-foreground" />
        <StatCard index={8} label="Sorties longues" value={s?.longExits ?? "—"} icon={AlertTriangle} accent="bg-amber-100 text-amber-700" />
        <StatCard index={9} label="Sorties critiques" value={s?.criticalExits ?? "—"} icon={ShieldAlert} accent="bg-destructive/15 text-destructive" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Derniers passages</h2>
            <Link to="/participants" className="text-xs text-primary hover:underline">Voir tout</Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {(passages.data ?? []).map((p) => (
              <div key={p.id} className="py-3 flex items-center gap-3">
                <div className={cn(
                  "size-9 rounded-lg grid place-items-center text-xs font-bold shrink-0",
                  p.movementType === "ENTRY" ? "bg-iris-lime/30 text-primary-deep" : "bg-amber-100 text-amber-700"
                )}>
                  <Activity className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.participant?.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.participant?.badgeCode} · {p.gateName} · {p.scannedByName}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {p.movementType === "ENTRY" ? "Entrée" : "Sortie"}
                  <div className="text-right">{new Date(p.scannedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
            {!passages.data?.length && (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucun passage enregistré.</div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Alertes</h2>
            <Link to="/alerts" className="text-xs text-primary hover:underline">Gérer</Link>
          </div>
          <div className="mt-4 space-y-3">
            {(alerts.data ?? []).map((a) => (
              <div key={a.participant.id} className={cn(
                "rounded-xl p-3 border",
                a.severity === "critical" ? "bg-destructive/5 border-destructive/30" : "bg-amber-50 border-amber-200"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold truncate">{a.participant.fullName}</div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-widest font-bold shrink-0 px-1.5 py-0.5 rounded",
                    a.severity === "critical" ? "bg-destructive text-white" : "bg-amber-500 text-white"
                  )}>{a.severity === "critical" ? "Critique" : "Long"}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Sorti depuis <span className="font-medium text-foreground">{a.minutesOut} min</span> · {a.participant.badgeCode}
                </div>
              </div>
            ))}
            {!alerts.data?.length && (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucune alerte active.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
