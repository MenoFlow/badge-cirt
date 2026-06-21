import { http } from "./client";
import type { MovementType, Passage } from "@/lib/types";
import type { PagedResult } from "./participants";

export interface PassagesQuery {
  search?: string;
  movementType?: MovementType | "ALL";
  gateName?: string;
  participantId?: string;
  page?: number;
  pageSize?: number;
}

export async function listPassages(q: PassagesQuery = {}): Promise<PagedResult<Passage>> {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([key, value]) => value != null && params.set(key, String(value)));
  return http<PagedResult<Passage>>(`/passages?${params}`);
}
