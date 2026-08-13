import { useEffect, useMemo, useRef } from "react";
import { AppleMaps } from "expo-maps";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type {
  MapAdapter,
  MapModel,
  MapPoint,
  MapRegion,
} from "./interface";
import { mapStatusMessage } from "./interface";
import {
  cameraPositionForRegion,
  ExpoMapsAdapter,
} from "./expo-maps-adapter";

type AppleMapsMarker = NonNullable<AppleMaps.MapProps["markers"]>[number];
type AppleMapsPolyline = NonNullable<
  AppleMaps.MapProps["polylines"]
>[number];

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

  if (status !== "ready" || region === null) {
    const displayStatus =
      status === "ready" && region === null ? "empty" : status;
    return (
      <View style={[styles.fallback, style]} testID={testID}>
        <Text style={styles.fallbackText}>
          {mapStatusMessage(displayStatus)}
        </Text>
      </View>
    );
  }

  return (
    <ReadyAppleMap
      adapter={adapter}
      model={model}
      onPointSelected={onPointSelected}
      region={region}
      selectedPointId={selectedPointId}
      style={style}
      testID={testID}
    />
  );
}

interface ReadyAppleMapProps {
  adapter: MapAdapter;
  model: MapModel;
  onPointSelected?: (point: MapPoint) => void;
  region: MapRegion;
  selectedPointId?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function ReadyAppleMap({
  adapter,
  model,
  onPointSelected,
  region,
  selectedPointId,
  style,
  testID,
}: ReadyAppleMapProps) {
  const mapRef = useRef<AppleMaps.MapView>(null);
  const markers = useMemo<AppleMapsMarker[]>(
    () => model.points.map((point) => markerForPoint(point, selectedPointId)),
    [model.points, selectedPointId],
  );
  const polylines = useMemo<AppleMapsPolyline[]>(() => {
    const coordinates = adapter.polyline(model);
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
      <AppleMaps.View
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
              : model.points.find((candidate) => candidate.id === marker.id);
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
