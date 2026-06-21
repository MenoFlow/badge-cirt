import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, ScanLine, Users, ArrowRightLeft, UserPlus, FileSpreadsheet,
  IdCard, FileText, Settings as SettingsIcon, Shield, LogOut, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccess, canAccessPath, DEFAULT_ROUTE_BY_ROLE, type Permission } from "@/lib/permissions";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, permission: "dashboard.view" },
  { to: "/scan", label: "Scan rapide", icon: ScanLine, permission: "scan.use" },
  { to: "/alerts", label: "Entrées / Sorties", icon: ArrowRightLeft, permission: "movements.view" },
  { to: "/participants", label: "Participants", icon: Users, permission: "participants.view" },
  { to: "/quick-add", label: "Ajout minute", icon: UserPlus, permission: "participants.createLastMinute" },
  { to: "/import", label: "Import", icon: FileSpreadsheet, permission: "participants.import" },
  { to: "/badges", label: "Badges", icon: IdCard, permission: "badges.view" },
  { to: "/reports", label: "Rapports", icon: FileText, permission: "reports.view" },
  { to: "/settings", label: "Paramètres", icon: SettingsIcon, permission: "settings.manage" },
  { to: "/users", label: "Utilisateurs", icon: Shield, permission: "users.manage" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading || !user) return;
    if (!canAccessPath(user.role, pathname)) navigate({ to: DEFAULT_ROUTE_BY_ROLE[user.role], replace: true });
  }, [pathname, user, loading, navigate]);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setOpen(false);
      await navigate({ to: "/login", replace: true });
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-deep text-white">
        <div className="text-sm opacity-80">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted text-foreground">
      {/* Top bar mobile */}
      <header className="lg:hidden sticky top-0 z-[90] flex items-center justify-between px-4 h-14 bg-nav-deep text-nav-deep-foreground border-b border-white/10">
        <button onClick={() => setOpen((v) => !v)} className="p-2 -ml-2" aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <div className="font-turret text-lg tracking-wider">CIRT<span className="text-iris-lime">.</span>BADGE</div>
        <div className="size-8 rounded-full bg-iris grid place-items-center text-xs font-bold text-primary-deep">
          {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
      </header>

      <div className="lg:pl-[260px]">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 bottom-0 z-[100] h-[100dvh] max-h-[100dvh] w-72 lg:w-[260px] overflow-hidden bg-nav-deep text-nav-deep-foreground transition-transform duration-200 lg:translate-x-0 flex flex-col will-change-transform",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-iris grid place-items-center text-primary-deep font-black">CB</div>
              <div>
                <div className="font-turret text-lg leading-none tracking-wider">CIRT BADGE</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Check &amp; Control</div>
              </div>
            </Link>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="lg:hidden p-2 -mr-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
            {NAV.filter((item) => canAccess(user.role, item.permission as Permission)).map((item) => {
              const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-white/10 text-white shadow-soft"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active && "text-iris-lime")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="px-3 py-4 border-t border-white/10 space-y-2">
            <div className="px-3 py-2 rounded-lg bg-white/5">
              <div className="text-xs text-white/60">Connecté</div>
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-iris-lime mt-0.5">{user.role}</div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/5"
              onClick={handleLogout}
            >
              <LogOut className="size-4 mr-2" /> Déconnexion
            </Button>
          </div>
        </aside>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40 lg:hidden"
              onClick={() => setOpen(false)}
            />
          )}
        </AnimatePresence>

        <main className="min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1400px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
