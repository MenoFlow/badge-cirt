import type { UserRole } from "./types";

export type Permission =
  | "dashboard.view"
  | "scan.use"
  | "movements.view"
  | "participants.view"
  | "participants.createLastMinute"
  | "participants.delete"
  | "participants.import"
  | "badges.view"
  | "badges.configure"
  | "reports.view"
  | "settings.manage"
  | "users.manage";

const PERMISSIONS: Record<Permission, UserRole[]> = {
  "dashboard.view": ["ADMIN", "SUPERVISOR"],
  "scan.use": ["ADMIN", "SUPERVISOR", "SCAN_AGENT"],
  "movements.view": ["ADMIN", "SUPERVISOR"],
  "participants.view": ["ADMIN", "SUPERVISOR", "SCAN_AGENT"],
  "participants.createLastMinute": ["ADMIN", "SUPERVISOR", "SCAN_AGENT"],
  "participants.delete": ["ADMIN", "SUPERVISOR"],
  "participants.import": ["ADMIN", "SUPERVISOR"],
  "badges.view": ["ADMIN", "SUPERVISOR", "REPORT_AGENT"],
  "badges.configure": ["ADMIN"],
  "reports.view": ["ADMIN", "SUPERVISOR", "REPORT_AGENT"],
  "settings.manage": ["ADMIN"],
  "users.manage": ["ADMIN"],
};

const ROUTE_PERMISSIONS: Array<{ path: string; permission: Permission }> = [
  { path: "/dashboard", permission: "dashboard.view" },
  { path: "/scan", permission: "scan.use" },
  { path: "/alerts", permission: "movements.view" },
  { path: "/participants", permission: "participants.view" },
  { path: "/quick-add", permission: "participants.createLastMinute" },
  { path: "/import", permission: "participants.import" },
  { path: "/badges", permission: "badges.view" },
  { path: "/reports", permission: "reports.view" },
  { path: "/settings", permission: "settings.manage" },
  { path: "/users", permission: "users.manage" },
];

export const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  ADMIN: "/dashboard",
  SUPERVISOR: "/dashboard",
  SCAN_AGENT: "/scan",
  REPORT_AGENT: "/reports",
};

export function canAccess(role: UserRole | undefined, permission: Permission) {
  return Boolean(role && PERMISSIONS[permission].includes(role));
}

export function canAccessPath(role: UserRole | undefined, pathname: string) {
  const route = ROUTE_PERMISSIONS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return route ? canAccess(role, route.permission) : false;
}
