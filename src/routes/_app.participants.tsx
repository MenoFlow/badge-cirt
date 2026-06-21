import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteAllParticipants, deleteParticipant, listParticipants } from "@/services/api/participants";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, IdCard, ChevronLeft, ChevronRight, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/permissions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/participants")({
  head: () => ({ meta: [{ title: "Participants · CIRT" }] }),
  component: ParticipantsPage,
});

function ParticipantsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [type, setType] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["participants", { search, category, type, status, page }],
    queryFn: () => listParticipants({ search, category: category as any, type: type as any, status: status as any, page, pageSize: 5 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteParticipant,
    onSuccess: async () => {
      toast.success("Participant supprimé");
      if ((q.data?.items.length ?? 0) <= 1 && page > 1) setPage((current) => current - 1);
      await queryClient.invalidateQueries({ queryKey: ["participants"] });
      await queryClient.invalidateQueries({ queryKey: ["participants-badges"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Suppression impossible"),
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllParticipants,
    onSuccess: async (result) => {
      toast.success(`${result.deleted} participant(s) supprimé(s)`);
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["participants"] });
      await queryClient.invalidateQueries({ queryKey: ["participants-badges"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Suppression impossible"),
  });

  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;
  const canCreateLastMinute = canAccess(user?.role, "participants.createLastMinute");
  const canDeleteParticipants = canAccess(user?.role, "participants.delete");
  const canViewBadges = canAccess(user?.role, "badges.view");
  const canUseParticipantActions = canViewBadges || canDeleteParticipants;
  const rowGridClass = canUseParticipantActions
    ? "md:grid-cols-[1.2fr_2fr_1fr_1fr_1.4fr_1fr_1fr_auto]"
    : "md:grid-cols-[1.2fr_2fr_1fr_1fr_1.4fr_1fr_1fr]";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Annuaire</div>
          <h1 className="font-display text-3xl font-bold mt-1">Participants</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDeleteParticipants && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive" disabled={!q.data?.total || deleteAllMutation.isPending}>
                  <Trash2 className="size-4 mr-2" />Tout supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer tous les participants ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Les {q.data?.total ?? 0} participant(s), leurs passages, alertes associées et photos seront supprimés définitivement.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteAllMutation.isPending}
                    onClick={() => deleteAllMutation.mutate()}
                  >
                    Supprimer tout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canCreateLastMinute && (
            <Link to="/quick-add">
              <Button className="bg-deep">+ Ajout minute</Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Nom, badge, email, téléphone, équipe…"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes catégories</SelectItem>
            {["Hackathon", "CTF", "Coach", "Organisation", "Invité", "Autre"].map((c) =>
              <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous types</SelectItem>
            <SelectItem value="PARTICIPANT">Participant</SelectItem>
            <SelectItem value="COACH">Coach</SelectItem>
            <SelectItem value="ORGANIZER">Organisation</SelectItem>
            <SelectItem value="GUEST">Invité</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous statuts</SelectItem>
            <SelectItem value="ON_SITE">Sur site</SelectItem>
            <SelectItem value="OFF_SITE">Hors site</SelectItem>
            <SelectItem value="NOT_ARRIVED">Pas arrivé</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className={cn("hidden md:grid gap-3 px-5 py-3 text-xs uppercase tracking-widest text-muted-foreground border-b", rowGridClass)}>
          <div>Badge</div><div>Nom</div><div>Type</div><div>Catégorie</div><div>Groupe / Équipe</div><div>Téléphone</div><div>Statut</div>
          {canUseParticipantActions && <div className="text-right">Action</div>}
        </div>
        <div className="divide-y">
          {q.data?.items.map((p) => (
            <div key={p.id} className={cn("px-5 py-3 grid gap-2 md:gap-3 items-center", rowGridClass)}>
              <div className="font-turret text-sm">{p.badgeCode}</div>
              <div className="min-w-0">
                <div className="font-medium truncate">{p.fullName}</div>
                <div className="text-xs text-muted-foreground truncate">{p.organization ?? "—"}</div>
              </div>
              <div className="text-sm">{labelType(p.participantType)}</div>
              <div className="text-sm">{p.sourceCategory ?? "—"}</div>
              <div className="text-sm truncate">{p.teamName ?? p.groupName ?? "—"}</div>
              <div className="text-sm truncate">{p.phone ?? "—"}</div>
              <div>
                <span className={cn(
                  "inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-bold",
                  p.currentStatus === "ON_SITE" ? "bg-iris-lime/40 text-primary-deep"
                    : p.currentStatus === "OFF_SITE" ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground"
                )}>
                  {p.currentStatus === "ON_SITE" ? "Sur site" : p.currentStatus === "OFF_SITE" ? "Hors site" : "Pas arrivé"}
                </span>
              </div>
              {canUseParticipantActions && (
                <div className="md:flex md:justify-end">
                  <AlertDialog>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreHorizontal className="size-4 mr-1" />Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canViewBadges && (
                          <DropdownMenuItem asChild>
                            <Link to="/badges" search={{ id: p.id } as any}>
                              <IdCard className="size-4 mr-2" />Badge
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {canDeleteParticipants && (
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(event) => event.preventDefault()}>
                              <Trash2 className="size-4 mr-2" />Supprimer
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {canDeleteParticipants && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce participant ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {p.fullName} et son historique de passages associé seront supprimés définitivement.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(p.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    )}
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
          {!q.data?.items.length && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Aucun participant ne correspond.</div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground">
          <div>{q.data?.total ?? 0} résultat(s)</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
            <span>Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function labelType(t: string) {
  switch (t) {
    case "PARTICIPANT": return "Participant";
    case "COACH": return "Coach";
    case "ORGANIZER": return "Organisation";
    case "GUEST": return "Invité";
    default: return t;
  }
}
