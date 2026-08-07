import { describe, expect, it } from "vitest";
import { uuid } from "../_shared/fake";
import {
  InMemoryReservationsModule,
  ManualReservationAnalyzer,
  analyzeReservationImport,
  validateImportSource,
} from "./module";

const tripId = uuid("00000000-0000-4000-8000-000000000001");

describe("reservation import", () => {
  it("returns a draft and never confirms during analysis", async () => {
    const result = await analyzeReservationImport(new ManualReservationAnalyzer(), {
      uri: "text:type=flight\ntitle=Vol Paris Athènes\nprovider=Aegean\nreference=AB123",
      kind: "text",
    });
    expect(result.state).toBe("needs-confirmation");
    if (result.state !== "needs-confirmation") return;
    expect(result.draft.title).toBe("Vol Paris Athènes");
    expect(result.draft.fieldsRequiringConfirmation).toContain("reference");
  });

  it("rejects unsupported or oversized sources", () => {
    expect(() => validateImportSource({ uri: "file:///x", kind: "pdf", sizeBytes: 26 * 1024 * 1024 })).toThrow("25 MB");
    expect(() => validateImportSource({ uri: "file:///x", kind: "pdf" })).not.toThrow();
  });

  it("does not save until every extracted field is confirmed", async () => {
    const module = new InMemoryReservationsModule();
    const draft = {
      confidence: "medium" as const,
      fieldsRequiringConfirmation: ["type", "title"],
      type: "hotel" as never,
      title: "Athens Hotel",
    };
    await expect(module.confirm({ tripId, draft, confirmedFields: ["title"] })).rejects.toThrow("type");
    expect(await module.list(tripId)).toHaveLength(0);
  });

  it("detects duplicates before creating a second reservation", async () => {
    const module = new InMemoryReservationsModule();
    const draft = {
      confidence: "high" as const,
      fieldsRequiringConfirmation: [],
      type: "flight" as const,
      title: "Vol Paris Athènes",
      provider: "Aegean",
      reference: "AB123",
    };
    await module.confirm({ tripId, draft, confirmedFields: [] });
    await expect(module.confirm({ tripId, draft, confirmedFields: [] })).rejects.toThrow("already imported");
    expect(await module.list(tripId)).toHaveLength(1);
  });

  it("keeps incomplete imports in draft state instead of persisting them", async () => {
    const result = await analyzeReservationImport(new ManualReservationAnalyzer(), {
      uri: "text:title=Missing type",
      kind: "text",
    });
    expect(result.state).toBe("needs-confirmation");
    if (result.state !== "needs-confirmation") return;
    const module = new InMemoryReservationsModule();
    await expect(
      module.confirm({
        tripId,
        draft: result.draft,
        confirmedFields: result.draft.fieldsRequiringConfirmation,
      }),
    ).rejects.toThrow("Reservation type is required");
    expect(await module.list(tripId)).toHaveLength(0);
  });
});
