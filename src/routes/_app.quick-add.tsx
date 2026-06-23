import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quickAdd, type QuickAddInput } from "@/services/api/participants";
import { downloadFile } from "@/services/api/client";
import { toast } from "sonner";
import type { ExpectedPresence, ParticipantType, SourceCategory } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/quick-add")({
  head: () => ({ meta: [{ title: "Ajout minute · CIRT" }] }),
  component: QuickAddPage,
});

type Member = {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  school: string;
  roleLabel: string;
};

const emptyMember = (): Member => ({
  fullName: "",
  email: "",
  phone: "",
  organization: "",
  school: "",
  roleLabel: "",
});

function QuickAddPage() {
  const navigate = useNavigate();
  const [participantType, setParticipantType] = useState<ParticipantType>("PARTICIPANT");
  const [sourceCategory, setSourceCategory] = useState<SourceCategory>("Hackathon");
  const [competitionMode, setCompetitionMode] = useState<"solo" | "equipe">("solo");
  const [memberCount, setMemberCount] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [competitionLevel, setCompetitionLevel] = useState("");
  const [competitionCategories, setCompetitionCategories] = useState("");
  const [expectedPresence, setExpectedPresence] = useState<ExpectedPresence>("BOTH_DAYS");
  const [members, setMembers] = useState<Member[]>([emptyMember()]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const isCompetition = sourceCategory === "Hackathon" || sourceCategory === "CTF";
  const effectiveCount = isCompetition && competitionMode === "equipe" ? memberCount : 1;

  useEffect(() => {
    setMembers((current) => {
      const next = [...current];
      while (next.length < effectiveCount) next.push(emptyMember());
      return next.slice(0, effectiveCount);
    });
  }, [effectiveCount]);

  useEffect(() => {
    setCurrentMemberIndex((current) => Math.min(current, effectiveCount - 1));
  }, [effectiveCount]);

  useEffect(() => {
    if (!isCompetition) {
      setCompetitionMode("solo");
      setMemberCount(1);
      setTeamName("");
      setCompetitionLevel("");
      setCompetitionCategories("");
    }
  }, [isCompetition]);

  const submitLabel = useMemo(
    () => (effectiveCount > 1 ? `Créer ${effectiveCount} membres` : "Créer"),
    [effectiveCount],
  );
  const currentMember = members[currentMemberIndex] ?? members[0] ?? emptyMember();

  function updateMember(index: number, patch: Partial<Member>) {
    setMembers((current) =>
      current.map((member, i) => (i === index ? { ...member, ...patch } : member)),
    );
  }

  async function submit(then?: "badge" | "pdf") {
    const invalid = members.findIndex((member) => !member.fullName.trim());
    if (invalid >= 0) {
      setCurrentMemberIndex(invalid);
      return toast.error(`Le nom complet du membre ${invalid + 1} est requis`);
    }
    if (isCompetition && competitionMode === "equipe" && !teamName.trim())
      return toast.error("Le nom d'équipe est requis");
    setBusy(true);
    try {
      const payloads: QuickAddInput[] = members.map((member) => ({
        participantType,
        sourceCategory,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        organization: member.organization,
        school: member.school,
        roleLabel: member.roleLabel,
        groupName: groupName || teamName,
        teamName,
        competitionMode: isCompetition ? competitionMode : undefined,
        memberCount: effectiveCount,
        competitionLevel,
        competitionCategories,
        expectedPresence,
      }));
      const result = await quickAdd(
        payloads.length === 1 ? payloads[0] : { participants: payloads },
      );
      const created = "items" in result ? result.items : [result];
      toast.success(`${created.length} participant(s) créé(s)`);
      if (then === "badge") navigate({ to: "/badges", search: { id: created[0].id } as any });
      else if (then === "pdf")
        await downloadFile(`/badges/${created[0].id}/pdf`, `${created[0].badgeCode}.pdf`);
      else navigate({ to: "/participants" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la création");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Création express
        </div>
        <h1 className="font-display text-3xl font-bold mt-1">Ajout minute</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Les champs suivent le modèle fusionné Hackathon / CTF.
        </p>
      </div>

      <Card className="p-5 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type">
            <Select
              value={participantType}
              onValueChange={(v) => setParticipantType(v as ParticipantType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTICIPANT">Participant</SelectItem>
                <SelectItem value="COACH">Coach</SelectItem>
                <SelectItem value="JURY">Jury</SelectItem>
                <SelectItem value="ORGANIZER">Organisation</SelectItem>
                <SelectItem value="GUEST">Invité</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Catégorie">
            <Select
              value={sourceCategory}
              onValueChange={(v) => setSourceCategory(v as SourceCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Hackathon", "CTF", "Coach", "Jury", "Organisation", "Invité", "Autre"].map(
                  (c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {isCompetition && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Mode">
              <Select
                value={competitionMode}
                onValueChange={(v) => setCompetitionMode(v as "solo" | "equipe")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="equipe">Équipe</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {competitionMode === "equipe" && (
              <Field label="Nombre de membres">
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={memberCount}
                  onChange={(e) =>
                    setMemberCount(Math.max(2, Math.min(20, Number(e.target.value) || 2)))
                  }
                />
              </Field>
            )}
          </div>
        )}

        {competitionMode === "equipe" && isCompetition && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Équipe *">
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            </Field>
            <Field label="Groupe">
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </Field>
          </div>
        )}

        {isCompetition && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={sourceCategory === "Hackathon" ? "Thématique" : "Niveau"}>
              <Input
                value={competitionLevel}
                onChange={(e) => setCompetitionLevel(e.target.value)}
              />
            </Field>
            <Field label="Catégories / Spécialités">
              <Input
                value={competitionCategories}
                onChange={(e) => setCompetitionCategories(e.target.value)}
              />
            </Field>
          </div>
        )}

        <Field label="Présence prévue">
          <Select
            value={expectedPresence}
            onValueChange={(v) => setExpectedPresence(v as ExpectedPresence)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BOTH_DAYS">Les deux jours</SelectItem>
              <SelectItem value="MONDAY">Lundi</SelectItem>
              <SelectItem value="TUESDAY">Mardi</SelectItem>
              <SelectItem value="UNKNOWN">Inconnu</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Membre {currentMemberIndex + 1}</div>
              <div className="text-xs text-muted-foreground">
                {currentMemberIndex + 1} / {effectiveCount}
              </div>
            </div>
            {effectiveCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentMemberIndex === 0}
                  onClick={() => setCurrentMemberIndex((index) => Math.max(0, index - 1))}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentMemberIndex >= effectiveCount - 1}
                  onClick={() =>
                    setCurrentMemberIndex((index) => Math.min(effectiveCount - 1, index + 1))
                  }
                >
                  Suivant
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            )}
          </div>

          <Field label="Nom complet *">
            <Input
              value={currentMember.fullName}
              onChange={(e) => updateMember(currentMemberIndex, { fullName: e.target.value })}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Email">
              <Input
                type="email"
                value={currentMember.email}
                onChange={(e) => updateMember(currentMemberIndex, { email: e.target.value })}
              />
            </Field>
            <Field label="Téléphone">
              <Input
                value={currentMember.phone}
                onChange={(e) => updateMember(currentMemberIndex, { phone: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Organisation / Établissement">
              <Input
                value={currentMember.organization}
                onChange={(e) => updateMember(currentMemberIndex, { organization: e.target.value })}
              />
            </Field>
            <Field label="Formation">
              <Input
                value={currentMember.school}
                onChange={(e) => updateMember(currentMemberIndex, { school: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Rôle">
            <Input
              value={currentMember.roleLabel}
              onChange={(e) => updateMember(currentMemberIndex, { roleLabel: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button disabled={busy} onClick={() => submit()} className="bg-deep">
            {submitLabel}
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => submit("badge")}>
            Créer + ouvrir badge
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => submit("pdf")}>
            Créer + PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
