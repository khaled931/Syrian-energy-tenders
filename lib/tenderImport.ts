import { getTenderDeadlineState, type Tender } from "./types";

/** A feed refresh must not undo a final decision or an administrator's status. */
export function importedTenderStatus(existing: Partial<Tender>, incoming: Partial<Tender>, now = new Date()): string {
  const status = String(existing.status || "").toLowerCase();
  if (["awarded", "cancelled"].includes(status) || existing.status_origin === "manual") return status || "open";
  return getTenderDeadlineState({ ...existing, ...incoming, status: "open" } as Tender, undefined, now).displayStatus;
}

export function importDatePrecision(value: string): "date" | "datetime" {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? "date" : "datetime";
}
