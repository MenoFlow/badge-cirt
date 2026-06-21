import { http } from "./client";
import type { AlertItem, DashboardSummary, Passage } from "@/lib/types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return http<DashboardSummary>("/dashboard/summary");
}
export async function getRecentPassages(limit = 5): Promise<Passage[]> {
  return http<Passage[]>(`/dashboard/recent-passages?limit=${limit}`);
}
export async function getAlerts(): Promise<AlertItem[]> {
  return http<AlertItem[]>("/dashboard/alerts");
}
