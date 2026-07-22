export type Permission = "calendar_view" | "calendar_book" | "gantt_view" | "gantt_edit" | "admin" | "lab_view" | "lab_create" | "lab_engineer";

export type Role = string;

export type UserRole = {
  name: string;
  permissions: Permission[];
};

export type User = {
  id: number;
  username: string;
  role: Role;
  firstName: string;
  lastName: string;
  badgeId: string;
  email: string;
  permissions?: Permission[];
};

export type SessionUser = Pick<User, "id" | "username" | "role"> & { permissions?: Permission[] };

export type Equipment = {
  id: number;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  imageDataUrl: string | null;
};

export type Booking = {
  id: number;
  equipmentId: number;
  userId: number;
  dateStart: string;
  dateEnd: string;
  ecrRef: string;
  notes: string;
  createdAt: string;
  userName: string;
  userFirstName: string;
  userLastName: string;
  userBadgeId: string;
  userEmail: string;
  equipmentName: string;
};

export type CalendarPayload = {
  equipment: Equipment[];
  bookings: Booking[];
};
import type { DurationUnit } from "./schedule";

/** Reprezentarea unui test în UI (serializabilă din DB). */
export interface TestRow {
  id: string;
  projectId: string;
  order: number;
  name: string;
  description: string | null;
  durationVal: number;
  durationUnit: DurationUnit;
  note: string | null;
  status: string;
  equipment: string | null;
  parallel: boolean;
}

/** Câmpurile editabile ale unui test (folosit la persistare). */
export type TestPatch = Partial<
  Pick<
    TestRow,
    | "name"
    | "description"
    | "durationVal"
    | "durationUnit"
    | "note"
    | "status"
    | "equipment"
    | "parallel"
  >
>;

export const STATUSES = ["Planned", "Running", "Done", "Blocked"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  Planned: "Planificat",
  Running: "În derulare",
  Done: "Finalizat",
  Blocked: "Blocat",
};

export const STATUS_COLORS: Record<string, string> = {
  Planned: "#94a3b8", // slate
  Running: "#3b82f6", // blue
  Done: "#22c55e", // green
  Blocked: "#ef4444", // red
};

/** Paletă stabilă pentru colorarea barelor după echipament. */
const EQUIPMENT_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#7c3aed",
  "#ea580c",
];

export function colorForEquipment(equipment: string | null | undefined): string {
  const key = (equipment ?? "").trim();
  if (!key) return "#64748b"; // slate-500 pentru „fără echipament"
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return EQUIPMENT_PALETTE[hash % EQUIPMENT_PALETTE.length];
}
