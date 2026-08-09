import { describe, expect, it } from "vitest";
import type { PendingShareImport } from "../../src/adapters/apple-document-analysis";
import { selectPendingImport } from "../../src/modules/reservations/import-selection";

const pending = (id: string, status: PendingShareImport["status"] = "seen"): PendingShareImport => ({
  id,
  kind: "text",
  uri: `share://${id}`,
  text: `title=${id}`,
  createdAt: "2026-08-09T10:00:00.000Z",
  status,
});

describe("reservation import selection", () => {
  it("selects the explicitly requested share instead of the first pending share", () => {
    const first = pending("first");
    const second = pending("second");

    expect(selectPendingImport([first, second], second.id)).toBe(second);
  });

  it("falls back to the first unconfirmed share when no id is supplied", () => {
    const confirmed = pending("confirmed", "confirmed");
    const next = pending("next");

    expect(selectPendingImport([confirmed, next])).toBe(next);
  });
});
