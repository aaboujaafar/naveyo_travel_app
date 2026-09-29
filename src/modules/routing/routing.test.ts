import { describe, expect, it, vi } from "vitest";
import type { Coordinates, UUID } from "../_shared/model";
import { Routing } from "./module";

describe("routing module", () => {
  it("does not call the provider when fewer than two coordinates remain", async () => {
    const calculate = vi.fn(async () => null);
    const routing = new Routing({ calculate });

    await expect(
      routing.calculate({
        tripId: "00000000-0000-4000-8000-000000000001" as UUID,
        coordinates: [{ latitude: 48.8566, longitude: 2.3522 }],
      }),
    ).resolves.toBeNull();
    expect(calculate).not.toHaveBeenCalled();
  });

  it("deduplicates consecutive and repeated waypoints before routing", async () => {
    const calculate = vi.fn(async (input: { coordinates: Coordinates[] }) => ({
      geometry: input.coordinates,
    }));
    const routing = new Routing({ calculate });
    const paris = { latitude: 48.8566, longitude: 2.3522 };

    await routing.calculate({
      tripId: "00000000-0000-4000-8000-000000000001" as UUID,
      coordinates: [
        paris,
        paris,
        { latitude: 48.8584, longitude: 2.2945 },
        paris,
      ],
    });

    expect(calculate).toHaveBeenCalledWith({
      tripId: "00000000-0000-4000-8000-000000000001",
      coordinates: [
        paris,
        { latitude: 48.8584, longitude: 2.2945 },
      ],
    });
  });
});
