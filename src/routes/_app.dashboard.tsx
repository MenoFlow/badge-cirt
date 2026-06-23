import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { getAlerts, getDashboardSummary, getRecentPassages } from "@/services/api/dashboard";
import { Card } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  AlertTriangle,
  ShieldAlert,
  Activity,
  GraduationCap,
  Briefcase,
  UserCog,
  Crown,
  ChevronDown,
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord · CIRT" }] }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  index = 0,
}: {
  label: string;
  value: number | string;
  icon: any;
  accent?: string;
  index?: number;
}) {
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
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground truncate">
              {label}
            </div>
            <div className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-display font-bold">
              {value}
            </div>
          </div>
          <div
            className={cn(
              "size-10 sm:size-11 rounded-xl grid place-items-center shrink-0",
              accent ?? "bg-muted text-foreground",
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function KpiAccordionSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow transition-shadow hover:shadow-card sm:px-5"
      >
        <div className="min-w-0">
          <div className="font-display text-base font-semibold">{title}</div>
          <div className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{summary}</div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="pt-3">{children}</div>}
    </section>
  );
}

function DashboardPage() {
  const summary = useQuery({ queryKey: ["dashboard-summary"], queryFn: getDashboardSummary });
  const alerts = useQuery({ queryKey: ["dashboard-alerts"], queryFn: getAlerts });
  const passages = useQuery({
    queryKey: ["dashboard-passages", 5],
    queryFn: () => getRecentPassages(5),
  });
  const [alertPage, setAlertPage] = useState(1);

  const s = summary.data;
  const alertsList = alerts.data ?? [];
  const alertsPerPage = 5;
  const totalAlertPages = Math.ceil(alertsList.length / alertsPerPage) || 1;
  const currentAlertPage = Math.min(alertPage, totalAlertPages);
  const paginatedAlerts = alertsList.slice(
    (currentAlertPage - 1) * alertsPerPage,
    currentAlertPage * alertsPerPage,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Vue d'ensemble
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1 truncate">
            Tableau de bord
          </h1>
        </div>
        <div className="shrink-0 text-sm text-muted-foreground hidden sm:block">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      <div className="space-y-3">
        <KpiAccordionSection
          title="Inscriptions"
          summary={`${s?.totalRegistered ?? "—"} inscrits · ${s?.participants ?? "—"} participants`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
            <StatCard
              index={0}
              label="Inscrits"
              value={s?.totalRegistered ?? "—"}
              icon={Users}
              accent="bg-deep text-white"
            />
            <StatCard
              index={1}
              label="Participants"
              value={s?.participants ?? "—"}
              icon={GraduationCap}
              accent="bg-accent-soft text-primary-deep"
            />
            <StatCard
              index={2}
              label="Coachs"
              value={s?.coaches ?? "—"}
              icon={UserCog}
              accent="bg-accent-soft text-primary-deep"
            />
            <StatCard
              index={3}
              label="Jury"
              value={s?.juries ?? "—"}
              icon={Gavel}
              accent="bg-accent-soft text-primary-deep"
            />
            <StatCard
              index={4}
              label="Organisation"
              value={s?.organizers ?? "—"}
              icon={Briefcase}
              accent="bg-accent-soft text-primary-deep"
            />
            <StatCard
              index={5}
              label="Invités"
              value={s?.guests ?? "—"}
              icon={Crown}
              accent="bg-accent-soft text-primary-deep"
            />
          </div>
        </KpiAccordionSection>

        <KpiAccordionSection
          title="Présence"
          summary={`${s?.onSite ?? "—"} sur site · ${s?.offSite ?? "—"} hors site · ${s?.notArrived ?? "—"} pas arrivés`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
            <StatCard
              index={5}
              label="Sur site"
              value={s?.onSite ?? "—"}
              icon={UserCheck}
              accent="bg-iris-lime/30 text-primary-deep"
            />
            <StatCard
              index={6}
              label="Hors site"
              value={s?.offSite ?? "—"}
              icon={UserX}
              accent="bg-muted text-foreground"
            />
            <StatCard
              index={7}
              label="Pas arrivés"
              value={s?.notArrived ?? "—"}
              icon={UserMinus}
              accent="bg-muted text-foreground"
            />
            <StatCard
              index={8}
              label="Sorties longues"
              value={s?.longExits ?? "—"}
              icon={AlertTriangle}
              accent="bg-amber-100 text-amber-700"
            />
            <StatCard
              index={9}
              label="Sorties critiques"
              value={s?.criticalExits ?? "—"}
              icon={ShieldAlert}
              accent="bg-destructive/15 text-destructive"
            />
          </div>
        </KpiAccordionSection>
      </div>

      <div className="grid min-w-0 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="min-w-0 overflow-hidden p-4 sm:p-5 lg:col-span-2">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Derniers passages</h2>
            <Link to="/participants" className="shrink-0 text-xs text-primary hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {(passages.data ?? []).map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <div
                  className={cn(
                    "row-span-2 size-9 rounded-lg grid place-items-center text-xs font-bold shrink-0 sm:row-span-1",
                    p.movementType === "ENTRY"
                      ? "bg-iris-lime/30 text-primary-deep"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  <Activity className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.participant?.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.participant?.badgeCode} · {p.gateName} · {p.scannedByName}
                  </div>
                </div>
                <div className="col-start-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:col-start-auto sm:block sm:shrink-0 sm:text-right">
                  <span>{p.movementType === "ENTRY" ? "Entrée" : "Sortie"}</span>
                  <span className="text-muted-foreground/60 sm:hidden">·</span>
                  <span>
                    {new Date(p.scannedAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
            {!passages.data?.length && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucun passage enregistré.
              </div>
            )}
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Alertes</h2>
            <Link to="/alerts" className="shrink-0 text-xs text-primary hover:underline">
              Gérer
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {paginatedAlerts.map((a) => (
              <div
                key={a.participant.id}
                className={cn(
                  "min-w-0 rounded-xl p-3 border",
                  a.severity === "critical"
                    ? "bg-destructive/5 border-destructive/30"
                    : "bg-amber-50 border-amber-200",
                )}
              >
                <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <div className="min-w-0 text-sm font-semibold leading-snug break-words sm:truncate">
                    {a.participant.fullName}
                  </div>
                  <span
                    className={cn(
                      "w-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest font-bold",
                      a.severity === "critical"
                        ? "bg-destructive text-white"
                        : "bg-amber-500 text-white",
                    )}
                  >
                    {a.severity === "critical" ? "Critique" : "Long"}
                  </span>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground break-words">
                  Sorti depuis{" "}
                  <span className="font-medium text-foreground">{a.minutesOut} min</span> ·{" "}
                  {a.participant.badgeCode}
                </div>
              </div>
            ))}
            {!alertsList.length && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucune alerte active.
              </div>
            )}
            {totalAlertPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border mt-3">
                <div className="text-xs text-muted-foreground">
                  Page {currentAlertPage} sur {totalAlertPages}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={currentAlertPage === 1}
                    onClick={() => setAlertPage((p) => Math.max(1, p - 1))}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={currentAlertPage === totalAlertPages}
                    onClick={() => setAlertPage((p) => Math.min(totalAlertPages, p + 1))}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
