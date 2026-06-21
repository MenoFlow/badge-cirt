import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listPassages } from "@/services/api/passages";
import type { MovementType } from "@/lib/types";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({ meta: [{ title: "Entrées / Sorties · CIRT" }] }),
  component: MovementsPage,
});

function MovementsPage() {
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState<MovementType | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["passages", { search, movementType, page }],
    queryFn: () => listPassages({ search, movementType, page, pageSize: 5 }),
  });
  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Journal</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">Entrées / Sorties</h1>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Nom, badge, téléphone, équipe, point de contrôle…"
            className="pl-9"
          />
        </div>
        <Select value={movementType} onValueChange={(value) => { setMovementType(value as MovementType | "ALL"); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Mouvement" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les mouvements</SelectItem>
            <SelectItem value="ENTRY">Entrées</SelectItem>
            <SelectItem value="EXIT">Sorties</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs uppercase tracking-widest text-muted-foreground border-b">
          <div>Participant</div><div>Badge</div><div>Mouvement</div><div>Point</div><div>Agent</div><div>Date</div>
        </div>
        <div className="divide-y">
          {q.data?.items.map((passage) => {
            const isEntry = passage.movementType === "ENTRY";
            return (
              <div key={passage.id} className="px-5 py-4 grid md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-2 md:gap-4 items-center">
                <div className="min-w-0">
                  <div className="font-medium truncate">{passage.participant?.fullName ?? "Participant supprimé"}</div>
                  <div className="text-xs text-muted-foreground truncate">{passage.participant?.sourceCategory ?? "—"} · {passage.participant?.organization ?? "—"}</div>
                </div>
                <div className="font-turret text-sm">{passage.participant?.badgeCode ?? "—"}</div>
                <div>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-1 rounded font-bold",
                    isEntry ? "bg-iris-lime/40 text-primary-deep" : "bg-amber-100 text-amber-700",
                  )}>
                    {isEntry ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
                    {isEntry ? "Entrée" : "Sortie"}
                  </span>
                </div>
                <div className="text-sm truncate">{passage.gateName ?? "—"}</div>
                <div className="text-sm truncate">{passage.scannedByName ?? "—"}</div>
                <div className="text-sm text-muted-foreground">{new Date(passage.scannedAt).toLocaleString()}</div>
              </div>
            );
          })}
          {!q.data?.items.length && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Aucun mouvement ne correspond.</div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 p-4 border-t text-sm text-muted-foreground">
          <span>{q.data?.total ?? 0} enregistrement(s)</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
            <span>{page}/{totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
