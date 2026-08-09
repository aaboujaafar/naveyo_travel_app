import type { PendingShareImport } from "../../../src/adapters/apple-document-analysis";

export function selectPendingImport(
  items: PendingShareImport[],
  pendingId?: string,
): PendingShareImport | undefined {
  if (pendingId) return items.find((item) => item.id === pendingId);
  return items.find((item) => item.status !== "confirmed");
}
