import { downloadFile, http } from "./client";
import type { Participant, ParticipantType, SourceCategory } from "@/lib/types";

export interface ParticipantsQuery {
  search?: string;
  category?: SourceCategory | "ALL";
  type?: ParticipantType | "ALL";
  groupName?: string;
  teamName?: string;
  status?: "ALL" | "ON_SITE" | "OFF_SITE" | "NOT_ARRIVED";
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listParticipants(q: ParticipantsQuery = {}): Promise<PagedResult<Participant>> {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => v != null && params.set(k, String(v)));
  return http<PagedResult<Participant>>(`/participants?${params}`);
}

export async function getParticipant(id: string): Promise<Participant | null> {
  return http<Participant>(`/participants/${id}`);
}

export async function getParticipantByToken(token: string): Promise<Participant | null> {
  return http<Participant>(`/public/badge/${token}`);
}

export interface QuickAddInput {
  participantType: ParticipantType;
  sourceCategory: SourceCategory;
  fullName: string;
  groupName?: string;
  teamName?: string;
  phone?: string;
  email?: string;
  organization?: string;
  school?: string;
  roleLabel?: string;
  competitionMode?: "solo" | "equipe";
  memberCount?: number;
  competitionLevel?: string;
  competitionCategories?: string;
  expectedPresence?: Participant["expectedPresence"];
}

export async function quickAdd(input: QuickAddInput | { participants: QuickAddInput[] }): Promise<Participant | { items: Participant[] }> {
  return http<Participant | { items: Participant[] }>("/participants/quick-add", { method: "POST", body: JSON.stringify(input) });
}

export async function deleteParticipant(id: string): Promise<void> {
  return http<void>(`/participants/${id}`, { method: "DELETE" });
}

export async function deleteAllParticipants(): Promise<{ deleted: number }> {
  return http<{ deleted: number }>("/participants/all", { method: "DELETE" });
}

export interface ImportPreviewRow {
  ok: boolean;
  data?: Partial<Participant> & Record<string, unknown>;
  error?: string;
}

export interface ImportPreview {
  rows: ImportPreviewRow[];
  duplicates: Array<Partial<Participant> & Record<string, unknown>>;
}

export async function downloadParticipantTemplate(): Promise<void> {
  return downloadFile("/participants/template.xlsx", "modele-participants.xlsx");
}

export async function previewParticipantImport(file: File): Promise<ImportPreview> {
  const form = new FormData();
  form.append("file", file);
  return http<ImportPreview>("/participants/import/preview", { method: "POST", body: form });
}

export async function commitParticipantImport(rows: Array<Record<string, unknown>>, sourceCategory: string, fileName: string): Promise<{ importedRows: number }> {
  return http<{ importedRows: number }>("/participants/import/commit", {
    method: "POST",
    body: JSON.stringify({ rows, sourceCategory, fileName }),
  });
}

export async function uploadPublicParticipantPhoto(qrToken: string, file: File): Promise<Participant> {
  const form = new FormData();
  form.append("photo", file);
  return http<Participant>(`/public/badge/${qrToken}/photo`, { method: "POST", body: form });
}

export interface BadgeEmailResult {
  ok: boolean;
  skipped?: boolean;
  participantId: string;
  badgeCode: string;
  fullName: string;
  email?: string;
  error?: string;
  message?: string;
  sentAt?: string;
}

export async function sendParticipantBadgeEmail(id: string, options: { force?: boolean } = {}): Promise<BadgeEmailResult> {
  const suffix = options.force ? "?force=true" : "";
  return http<BadgeEmailResult>(`/badges/${id}/email${suffix}`, { method: "POST" });
}

export async function sendGroupBadgeEmails(groupName: string, options: { force?: boolean } = {}): Promise<{ sent: number; failed: number; results: BadgeEmailResult[] }> {
  const suffix = options.force ? "?force=true" : "";
  return http(`/badges/email/group/${encodeURIComponent(groupName)}${suffix}`, { method: "POST" });
}
