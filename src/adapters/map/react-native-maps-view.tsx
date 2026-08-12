import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { Coordinates } from "../../modules/_shared/model";
import type {
  MapAdapter,
  MapModel,
  MapPoint,
  MapRegion,
} from "./interface";
import { mapStatusMessage } from "./interface";
import { ReactNativeMapsAdapter } from "./react-native-adapter";

interface NativeMapViewProps {
  children?: ReactNode;
  initialRegion?: MapRegion;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface NativeMarkerProps {
  coordinate: Coordinates;
  identifier?: string;
  onPress?: () => void;
  pinColor?: string;
  title?: string;
}

interface NativePolylineProps {
  coordinates: Coordinates[];
  strokeColor?: string;
  strokeWidth?: number;
}

interface NativeMapsModule {
  default: ComponentType<NativeMapViewProps>;
  Marker: ComponentType<NativeMarkerProps>;
  Polyline: ComponentType<NativePolylineProps>;
}

declare const require: (moduleName: string) => unknown;

function loadNativeMaps(): NativeMapsModule {
  const module = require("react-native-maps") as Partial<NativeMapsModule>;
  if (module.default === undefined || module.Marker === undefined) {
    throw new Error("react-native-maps is not available in this build");
  }
  if (module.Polyline === undefined) {
    throw new Error("react-native-maps Polyline is not available in this build");
  }
  return {
    default: module.default,
    Marker: module.Marker,
    Polyline: module.Polyline,
  };
}

export interface ReactNativeMapsViewProps {
  adapter?: MapAdapter;
  model: MapModel;
  onPointSelected?: (point: MapPoint) => void;
  selectedPointId?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ReactNativeMapsView({
  adapter = new ReactNativeMapsAdapter(),
  model,
  onPointSelected,
  selectedPointId,
  style,
  testID,
}: ReactNativeMapsViewProps) {
  const status = adapter.status(model);
  const region = adapter.region(model);

  if (status !== "ready" || region === null) {
    const displayStatus = status === "ready" && region === null ? "empty" : status;
    return (
      <View style={[styles.fallback, style]} testID={testID}>
        <Text style={styles.fallbackText}>
          {mapStatusMessage(displayStatus)}
        </Text>
      </View>
    );
  }

  return <ReadyMap {...{ adapter, model, onPointSelected, region, selectedPointId, style, testID }} />;
}

interface ReadyMapProps {
  adapter: MapAdapter;
  model: MapModel;
  onPointSelected?: (point: MapPoint) => void;
  region: MapRegion;
  selectedPointId?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function ReadyMap({
  adapter,
  model,
  onPointSelected,
  region,
  selectedPointId,
  style,
  testID,
}: ReadyMapProps) {
  const nativeMaps = useMemo(() => loadNativeMaps(), []);
  const MapView = nativeMaps.default;
  const Marker = nativeMaps.Marker;
  const Polyline = nativeMaps.Polyline;
  const polyline = adapter.polyline(model);

  return (
    <MapView initialRegion={region} style={[styles.map, style]} testID={testID}>
      {model.points.map((point) => (
        <Marker
          coordinate={point.coordinates}
          identifier={point.id}
          key={point.id}
          onPress={() => onPointSelected?.(point)}
          pinColor={point.id === selectedPointId ? "#111827" : undefined}
          title={point.label}
        />
      ))}
      {adapter.supportsPolyline && polyline.length > 1 ? (
        <Polyline coordinates={polyline} strokeColor="#111827" strokeWidth={4} />
      ) : null}
    </MapView>
  );
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
    minHeight: 160,
  },
});
