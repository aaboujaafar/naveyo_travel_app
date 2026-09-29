import type { PendingReservationImport } from "./interface";

export function selectPendingImport(
  items: PendingReservationImport[],
  pendingId?: string,
): PendingReservationImport | undefined {
  if (pendingId) return items.find((item) => item.id === pendingId);
  return items.find((item) => item.status !== "confirmed");
}
