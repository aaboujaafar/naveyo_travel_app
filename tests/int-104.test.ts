import { describe, expect, it } from "vitest";
import type { PendingShareImport } from "../src/adapters/apple-document-analysis";
import { describeAnalysisFailure, recoverPendingImport } from "../app/(app)/imports/import-state";

const pending = (status: PendingShareImport["status"]): PendingShareImport => ({
  id: "share-1",
  kind: "text",
  uri: "file:///share.txt",
  createdAt: "2026-08-09T10:00:00.000Z",
  status,
});

describe("INT-104 import recovery", () => {
  it("makes an interrupted analysis retryable after reopening", () => {
    expect(recoverPendingImport(pending("processing")).status).toBe("seen");
    expect(recoverPendingImport(pending("failed")).status).toBe("failed");
    expect(recoverPendingImport(pending("confirmed")).status).toBe("confirmed");
  });

  it("explains network failures without exposing a technical error", () => {
    const failure = describeAnalysisFailure(new Error("Remote document analysis timed out"));
    expect(failure.isOffline).toBe(true);
    expect(failure.message).toContain("Vérifiez la connexion");
  });

  it("keeps invalid OpenCode drafts retryable and readable", () => {
    const failure = describeAnalysisFailure(new Error("OpenCode returned an invalid reservation draft: missing title"));
    expect(failure.isOffline).toBe(false);
    expect(failure.message).toContain("brouillon incomplet");
  });
});
