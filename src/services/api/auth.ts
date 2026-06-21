import { http } from "./client";
import type { User, UserRole } from "@/lib/types";

export const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  ADMIN: "/dashboard",
  SUPERVISOR: "/dashboard",
  SCAN_AGENT: "/scan",
  REPORT_AGENT: "/reports",
};

export async function login(email: string, password: string): Promise<User> {
  return http<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function logout(): Promise<void> {
  await http<void>("/auth/logout", { method: "POST" });
}

export async function bootstrap(): Promise<{ email: string; password: string; mustChangePassword: boolean; alreadyCreated?: boolean }> {
  return http("/auth/bootstrap");
}

export async function changePassword(password: string): Promise<User> {
  return http<User>("/auth/change-password", { method: "POST", body: JSON.stringify({ password }) });
}

export async function me(): Promise<User | null> {
  try { return await http<User>("/auth/me"); } catch { return null; }
}
