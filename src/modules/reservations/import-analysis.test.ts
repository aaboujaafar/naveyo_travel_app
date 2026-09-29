import { describe, expect, it, vi } from "vitest";
import type { ReservationDraft, UUID } from "../_shared/model";
import { analyzeReservationSource, OnDeviceAnalysisUnavailableError } from "./import-analysis";
import type { OnDeviceReservationAnalyzer } from "./interface";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
const localDraft: ReservationDraft = {
  type: "accommodation",
  title: "Hôtel Lisboa",
  confidence: "high",
  fieldsRequiringConfirmation: ["type", "title"],
};
const remoteDraft: ReservationDraft = { ...localDraft, title: "Hôtel Lisboa (distant)" };

const onDevice = (source: "on-device" | "heuristic", status = "available" as const): OnDeviceReservationAnalyzer => ({
  status: vi.fn(async () => status),
  analyzeFile: vi.fn(async () => ({ draft: localDraft, extractedText: "OCR text", source })),
  analyzeText: vi.fn(async () => ({ draft: localDraft, extractedText: "pasted", source })),
});

describe("analyzeReservationSource", () => {
  it("keeps the analysis on the iPhone when Apple Intelligence produced a draft", async () => {
    const remote = { analyze: vi.fn(async () => remoteDraft) };
    const outcome = await analyzeReservationSource({
      tripId,
      source: { kind: "file", uri: "file:///doc.pdf" },
      allowRemote: true,
      onDevice: onDevice("on-device"),
      remote,
    });
    expect(outcome).toEqual({ draft: localDraft, mode: "on-device" });
    expect(remote.analyze).not.toHaveBeenCalled();
  });

  it("never sends text without consent and explains why", async () => {
    const remote = { analyze: vi.fn(async () => remoteDraft) };
    await expect(
      analyzeReservationSource({
        tripId,
        source: { kind: "text", text: "Réservation" },
        allowRemote: false,
        onDevice: onDevice("heuristic", "appleIntelligenceNotEnabled" as never),
        remote,
      }),
    ).rejects.toMatchObject({ name: "OnDeviceAnalysisUnavailableError", status: "appleIntelligenceNotEnabled" });
    expect(remote.analyze).not.toHaveBeenCalled();
  });

  it("reports an incomplete local draft when the model is available but failed", async () => {
    const error = await analyzeReservationSource({
      tripId,
      source: { kind: "text", text: "???" },
      allowRemote: false,
      onDevice: onDevice("heuristic"),
    }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(OnDeviceAnalysisUnavailableError);
    expect((error as OnDeviceAnalysisUnavailableError).status).toBe("incomplete");
  });

  it("falls back to the remote assistant with the OCR text read once on the iPhone", async () => {
    const remote = { analyze: vi.fn(async () => remoteDraft) };
    const extractor = { extract: vi.fn(async () => "second OCR") };
    const outcome = await analyzeReservationSource({
      tripId,
      source: { kind: "file", uri: "file:///doc.pdf" },
      allowRemote: true,
      onDevice: onDevice("heuristic", "deviceNotEligible" as never),
      extractor,
      remote,
    });
    expect(outcome).toEqual({ draft: remoteDraft, mode: "remote" });
    expect(remote.analyze).toHaveBeenCalledWith({ tripId, extractedText: "OCR text" });
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it("uses the pasted text remotely when the native text analysis is missing", async () => {
    const remote = { analyze: vi.fn(async () => remoteDraft) };
    const analyzer = onDevice("heuristic");
    analyzer.analyzeText = vi.fn(async () => { throw new Error("Native text analysis is unavailable"); });
    await analyzeReservationSource({ tripId, source: { kind: "text", text: "Vol AF123" }, allowRemote: true, onDevice: analyzer, remote });
    expect(remote.analyze).toHaveBeenCalledWith({ tripId, extractedText: "Vol AF123" });
  });
});
