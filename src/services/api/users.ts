import { http } from "./client";
import type { User, UserRole } from "@/lib/types";

export async function listUsers(): Promise<User[]> {
  return http<User[]>("/users");
}
export async function createUser(input: { name: string; email: string; role: UserRole; password: string }): Promise<User> {
  return http<User>("/users", { method: "POST", body: JSON.stringify(input) });
}
export async function toggleUser(id: string, isActive: boolean): Promise<User> {
  return http<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) });
}
