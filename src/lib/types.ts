export type ParticipantType = "PARTICIPANT" | "COACH" | "ORGANIZER" | "GUEST";
export type SourceCategory = "Hackathon" | "CTF" | "Coach" | "Organisation" | "Invité" | "Autre";
export type ExpectedPresence = "MONDAY" | "TUESDAY" | "BOTH_DAYS" | "UNKNOWN";
export type MovementType = "ENTRY" | "EXIT";
export type ScanMethod =
  | "QR_SCAN"
  | "MANUAL_BADGE_CODE"
  | "MANUAL_SEARCH"
  | "ADMIN_CORRECTION";
export type GateName =
  | "Entrée principale"
  | "Sortie principale"
  | "Bureau de contrôle";
export type UserRole = "ADMIN" | "SUPERVISOR" | "SCAN_AGENT" | "REPORT_AGENT";
export type PresenceStatus = "ON_SITE" | "OFF_SITE" | "NOT_ARRIVED";

export interface Participant {
  id: string;
  participantType: ParticipantType;
  sourceCategory: SourceCategory | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  school: string | null;
  organization: string | null;
  groupName: string | null;
  teamName: string | null;
  roleLabel: string | null;
  competitionMode: string | null;
  memberCount: number | null;
  competitionLevel: string | null;
  competitionCategories: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  city: string | null;
  statusLabel: string | null;
  badgeCode: string;
  qrToken: string;
  photoPath: string | null;
  hasSmartphone: boolean | null;
  expectedPresence: ExpectedPresence;
  isLastMinute: boolean;
  isActive: boolean;
  sourceReference: string | null;
  notes: string | null;
  currentStatus: PresenceStatus;
  lastPassageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Passage {
  id: string;
  participantId: string;
  participant?: Pick<Participant, "fullName" | "badgeCode" | "photoPath" | "sourceCategory" | "groupName" | "teamName" | "organization">;
  movementType: MovementType;
  scannedAt: string;
  scannedByUserId: string;
  scannedByName?: string;
  passageStatus?: "Arrivé" | "Rentré" | "Hors site" | "Pas arrivé";
  scanMethod: ScanMethod;
  gateName: GateName | null;
  deviceName: string | null;
  note: string | null;
  isCancelled: boolean;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface AlertItem {
  participant: Participant;
  exitedAt: string;
  minutesOut: number;
  severity: "warning" | "critical";
  responsible?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  totalRegistered: number;
  participants: number;
  coaches: number;
  organizers: number;
  guests: number;
  onSite: number;
  offSite: number;
  notArrived: number;
  longExits: number;
  criticalExits: number;
}

export interface Settings {
  eventName: string;
  publicBaseUrl: string;
  exitWarningMinutes: number;
  exitCriticalMinutes: number;
  duplicateScanWindowSeconds: number;
  allowSelfPhotoUpload: boolean;
  requirePhotoValidation: boolean;
  bootstrapCompleted: boolean;
}

export interface ScanResult {
  ok: boolean;
  verificationOnly?: boolean;
  movementType?: MovementType;
  participant?: Participant;
  scannedAt?: string;
  gateName?: GateName | null;
  agentName?: string;
  duplicateIgnored?: boolean;
  message: string;
  currentStatus?: PresenceStatus;
}
