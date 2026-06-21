import { http } from "./client";
import type { Settings } from "@/lib/types";

export async function getSettings(): Promise<Settings> {
  return http<Settings>("/settings");
}
export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return http<Settings>("/settings", { method: "PATCH", body: JSON.stringify(patch) });
}
