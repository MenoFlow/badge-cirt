import { API_BASE_URL } from "./client";
import type { GateName, ScanResult } from "@/lib/types";

export async function scanByCode(badgeCode: string, gateName: GateName = "Entrée principale"): Promise<ScanResult> {
  const res = await fetch(`${API_BASE_URL}/scan/code`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ badgeCode, gateName }),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) as ScanResult : null;
  if (data && typeof data.ok === "boolean") return data;
  throw new Error(text || `Erreur HTTP ${res.status}`);
}

export async function scanByQrToken(qrToken: string, gateName: GateName = "Entrée principale"): Promise<ScanResult> {
  return scanByCode(qrToken, gateName);
}
