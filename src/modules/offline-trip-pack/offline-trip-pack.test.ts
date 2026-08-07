import { describe, expect, it } from "vitest";
import { InMemoryTripPackFileStore } from "../../adapters/sqlite/in-memory-file-store";
import { InMemoryTripPackStore } from "../../adapters/sqlite/in-memory-trip-pack-store";
import { tripPack, tripId } from "../__fixtures__/domain";
import { OfflineTripPack } from "./module";

const createModule = () => {
  const store = new InMemoryTripPackStore();
  const files = new InMemoryTripPackFileStore();
  files.put("file:///documents/flight.pdf", "sha256:fixture");
  return { module: new OfflineTripPack(store, files), files };
};

describe("OFF-001 offline trip pack", () => {
  it("starts with an explicit empty cache state", async () => {
    const { module } = createModule();
    expect(await module.load(tripId)).toMatchObject({
      state: "empty",
      pack: null,
      manifest: null,
    });
    expect(await module.get(tripId)).toBeNull();
  });

  it("validates, stages, and atomically activates a complete pack", async () => {
    const { module } = createModule();
    await module.replace(tripPack);
    expect(await module.get(tripId)).toEqual(tripPack);
    expect((await module.manifest(tripId))?.serverRevision).toBe("42");
  });

  it("keeps the previous complete pack when a refresh is incomplete", async () => {
    const { module } = createModule();
    await module.replace(tripPack);
    const incomplete = {
      ...tripPack,
      manifest: {
        ...tripPack.manifest,
        serverRevision: "43",
        files: [
          ...tripPack.manifest.files,
          {
            path: "file:///documents/hotel.pdf",
            checksum: "sha256:missing",
            state: "ready" as const,
          },
        ],
      },
    };

    await expect(module.replace(incomplete)).rejects.toThrow(/missing/);
    expect(await module.get(tripId)).toEqual(tripPack);
  });

  it("reports a missing file without exposing the incomplete pack", async () => {
    const { module, files } = createModule();
    files.remove("file:///documents/flight.pdf");
    await expect(module.replace(tripPack)).rejects.toThrow(/missing/);
    expect(await module.load(tripId)).toMatchObject({ state: "empty" });
  });

  it("rejects an incompatible schema before changing the active pack", async () => {
    const { module } = createModule();
    await module.replace(tripPack);
    const incompatible = {
      ...tripPack,
      manifest: { ...tripPack.manifest, schemaVersion: 99 },
    };
    await expect(module.replace(incompatible)).rejects.toThrow(
      /unsupported schema/,
    );
    expect((await module.manifest(tripId))?.schemaVersion).toBe(1);
  });

  it("supports offline startup followed by a later network refresh", async () => {
    const { module } = createModule();
    await module.replace(tripPack);
    const startupPack = await module.get(tripId);
    expect(startupPack?.trip.id).toBe(tripId);

    const refreshed = {
      ...tripPack,
      manifest: { ...tripPack.manifest, serverRevision: "43" },
    };
    await module.replace(refreshed);
    expect((await module.manifest(tripId))?.serverRevision).toBe("43");
  });
});
