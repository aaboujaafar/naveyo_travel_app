import {
  Component,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type * as ExpoMapsTypes from "expo-maps";
import type {
  MapAdapter,
  MapModel,
  MapPoint,
  MapRegion,
  MapStatus,
} from "./interface";
import {
  isValidCoordinate,
  mapStatusMessage,
  validCoordinates,
  validMapPoints,
} from "./interface";
import {
  cameraPositionForRegion,
  ExpoMapsAdapter,
} from "./expo-maps-adapter";

type ExpoMapsModule = typeof import("expo-maps");
type AppleMapsMarker = NonNullable<
  ExpoMapsTypes.AppleMaps.MapProps["markers"]
>[number];
type AppleMapsPolyline = NonNullable<
  ExpoMapsTypes.AppleMaps.MapProps["polylines"]
>[number];
type AppleMapsViewComponent = typeof import("expo-maps").AppleMaps.View;
type ExpoMapsRequireResult =
  | ExpoMapsModule
  | { default?: ExpoMapsModule }
  | null
  | undefined;

let loadedExpoMaps: ExpoMapsModule | null | undefined;

export function isExpoMapsModule(value: unknown): value is ExpoMapsModule {
  if (value === null || typeof value !== "object") return false;

  const candidate = value as {
    AppleMaps?: { View?: unknown };
  };
  return candidate.AppleMaps?.View !== undefined;
}

function loadExpoMaps(): ExpoMapsModule | null {
  if (loadedExpoMaps !== undefined) return loadedExpoMaps;

  try {
    // Dynamic loading is intentional: expo-maps can throw before rendering when its native view is absent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const required = require("expo-maps") as ExpoMapsRequireResult;
    // Metro can expose an ES module through `default` when it is loaded dynamically.
    // Accept both shapes so a valid native module is not mistaken for an unavailable one.
    const module =
      required !== null &&
      typeof required === "object" &&
      "AppleMaps" in required
        ? required
        : required !== null &&
            typeof required === "object" &&
            required.default !== undefined
          ? required.default
          : null;
    loadedExpoMaps = isExpoMapsModule(module) ? module : null;
  } catch {
    loadedExpoMaps = null;
  }

  return loadedExpoMaps;
}

export interface ExpoMapsViewProps {
  adapter?: MapAdapter;
  model: MapModel;
  onPointSelected?: (point: MapPoint) => void;
  selectedPointId?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ExpoMapsView({
  adapter = new ExpoMapsAdapter(),
  model,
  onPointSelected,
  selectedPointId,
  style,
  testID,
}: ExpoMapsViewProps) {
  const status = adapter.status(model);
  const region = adapter.region(model);
  const expoMaps = loadExpoMaps();

  if (status !== "ready" || region === null || expoMaps === null) {
    const displayStatus: Exclude<MapStatus, "ready"> =
      expoMaps === null
        ? "native-unavailable"
        : status === "ready"
          ? "empty"
          : status;
    return <MapFallback status={displayStatus} style={style} testID={testID} />;
  }

  return (
    <MapRenderBoundary
      fallback={
        <MapFallback
          status="native-unavailable"
          style={style}
          testID={testID}
        />
      }
    >
      <ReadyAppleMap
        adapter={adapter}
        model={model}
        onPointSelected={onPointSelected}
        region={region}
        selectedPointId={selectedPointId}
        style={style}
        testID={testID}
        AppleMapsView={expoMaps.AppleMaps.View}
      />
    </MapRenderBoundary>
  );
}

interface MapFallbackProps {
  status: Exclude<MapStatus, "ready">;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function MapFallback({ status, style, testID }: MapFallbackProps) {
  return (
    <View style={[styles.fallback, style]} testID={testID}>
      <Text style={styles.fallbackText}>{mapStatusMessage(status)}</Text>
    </View>
  );
}

interface MapRenderBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface MapRenderBoundaryState {
  hasError: boolean;
}

class MapRenderBoundary extends Component<
  MapRenderBoundaryProps,
  MapRenderBoundaryState
> {
  override state: MapRenderBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapRenderBoundaryState {
    return { hasError: true };
  }

  override render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

interface ReadyAppleMapProps {
  adapter: MapAdapter;
  model: MapModel;
  onPointSelected?: (point: MapPoint) => void;
  region: MapRegion;
  selectedPointId?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  AppleMapsView: AppleMapsViewComponent;
}

function ReadyAppleMap({
  adapter,
  model,
  onPointSelected,
  region,
  selectedPointId,
  style,
  testID,
  AppleMapsView,
}: ReadyAppleMapProps) {
  const mapRef = useRef<ExpoMapsTypes.AppleMaps.MapView>(null);
  const points = useMemo(() => validMapPoints(model.points), [model.points]);
  const markers = useMemo<AppleMapsMarker[]>(
    () => points.map((point) => markerForPoint(point, selectedPointId)),
    [points, selectedPointId],
  );
  const polylines = useMemo<AppleMapsPolyline[]>(() => {
    const coordinates = validCoordinates(adapter.polyline(model));
    return coordinates.length > 1
      ? [
          {
            id: "trip-route",
            coordinates,
            color: "#111827",
            width: 4,
          },
        ]
      : [];
  }, [adapter, model]);

  useEffect(() => {
    void mapRef.current?.selectMarker(selectedPointId, {
      moveCamera: false,
    });
  }, [selectedPointId]);

  return (
    <View style={[styles.map, style]} testID={testID}>
      <AppleMapsView
        ref={mapRef}
        cameraPosition={cameraPositionForRegion(region)}
        markers={markers}
        polylines={polylines}
        properties={{ selectionEnabled: true }}
        style={styles.map}
        onMarkerClick={(marker) => {
          const point =
            marker.id === undefined
              ? undefined
              : points.find((candidate) => candidate.id === marker.id);
          if (point !== undefined) onPointSelected?.(point);
        }}
      />
    </View>
  );
}

function markerForPoint(
  point: MapPoint,
  selectedPointId: string | undefined,
): AppleMapsMarker {
  if (!isValidCoordinate(point.coordinates)) {
    throw new Error("Invalid map point reached native rendering");
  }

  return {
    id: point.id,
    coordinates: point.coordinates,
    title: point.label,
    tintColor: point.id === selectedPointId ? "#111827" : undefined,
  };
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    minHeight: 160,
    padding: 16,
  },
  fallbackText: {
    color: "#4B5563",
    textAlign: "center",
  },
  map: {
    flex: 1,
    minHeight: 160,
  },
});
