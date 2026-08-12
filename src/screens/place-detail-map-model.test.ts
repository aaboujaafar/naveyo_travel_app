import { beforeAll, describe, expect, it, vi } from "vitest";
import type { PlaceCandidate, UUID } from "../modules/_shared/model";

vi.mock("react-native", () => ({
  Image: "Image",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (styles: unknown) => styles },
  Platform: { select: (values: { default?: string }) => values.default },
  View: "View",
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  Rect: "Rect",
  Stop: "Stop",
}));
vi.mock("expo-maps", () => ({ AppleMaps: {} }));
vi.mock("../adapters/map/expo-maps-view", () => ({ ExpoMapsView: "ExpoMapsView" }));
vi.mock("../ui", () => ({
  AppText: "AppText",
  Badge: "Badge",
  BottomSheet: "BottomSheet",
  Button: "Button",
  Icon: "Icon",
  InlineMessage: "InlineMessage",
  SectionTitle: "SectionTitle",
  Skeleton: "Skeleton",
  Toast: "Toast",
}));

let buildPlaceMapPresentation: typeof import("./PlaceDetailScreen")["buildPlaceMapPresentation"];

beforeAll(async () => {
  ({ buildPlaceMapPresentation } = await import("./PlaceDetailScreen"));
});

const place = (coordinates: PlaceCandidate["coordinates"]): PlaceCandidate => ({
  id: "00000000-0000-4000-8000-000000000201" as UUID,
  provider: "geoapify",
  name: "Tour Eiffel",
  address: "Champ de Mars, Paris",
  countryCode: "FR",
  coordinates,
});

describe("place detail map presentation", () => {
  it("builds a centered single-marker model from the verified place coordinates", () => {
    const presentation = buildPlaceMapPresentation(
      place({ latitude: 48.8584, longitude: 2.2945 }),
    );

    expect(presentation.coordinateLabel).toBe("48.8584, 2.2945");
    expect(presentation.model).toEqual({
      points: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          label: "Tour Eiffel",
          coordinates: { latitude: 48.8584, longitude: 2.2945 },
        },
      ],
    });
  });

  it("does not expose a map model for missing or invalid coordinates", () => {
    expect(
      buildPlaceMapPresentation(
        place(undefined as unknown as PlaceCandidate["coordinates"]),
      ),
    ).toEqual({ model: null, coordinateLabel: null });

    expect(
      buildPlaceMapPresentation(
        place(null as unknown as PlaceCandidate["coordinates"]),
      ),
    ).toEqual({ model: null, coordinateLabel: null });

    expect(
      buildPlaceMapPresentation(place({ latitude: 91, longitude: 2.2945 })),
    ).toEqual({ model: null, coordinateLabel: null });
  });
});
