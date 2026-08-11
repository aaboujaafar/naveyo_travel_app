import type { ReactNode } from "react";
import Svg, {
  Circle,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
} from "react-native-svg";
import { colors } from "../theme";

type PathShape = { readonly kind: "path"; readonly d: string };
type CircleShape = {
  readonly kind: "circle";
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
};
type LineShape = {
  readonly kind: "line";
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};
type PolylineShape = { readonly kind: "polyline"; readonly points: string };
type PolygonShape = { readonly kind: "polygon"; readonly points: string };
type RectShape = {
  readonly kind: "rect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx?: number;
};
type IconShape =
  | PathShape
  | CircleShape
  | LineShape
  | PolylineShape
  | PolygonShape
  | RectShape;

const iconShapes = {
  "arrow-left": [
    { kind: "path", d: "M19 12H5" },
    { kind: "path", d: "M12 19l-7-7 7-7" },
  ],
  "arrow-right": [
    { kind: "path", d: "M5 12h14" },
    { kind: "path", d: "M12 5l7 7-7 7" },
  ],
  "chevron-down": [{ kind: "polyline", points: "6 9 12 15 18 9" }],
  close: [
    { kind: "line", x1: 18, y1: 6, x2: 6, y2: 18 },
    { kind: "line", x1: 6, y1: 6, x2: 18, y2: 18 },
  ],
  check: [{ kind: "polyline", points: "20 6 9 17 4 12" }],
  plus: [
    { kind: "line", x1: 12, y1: 5, x2: 12, y2: 19 },
    { kind: "line", x1: 5, y1: 12, x2: 19, y2: 12 },
  ],
  home: [
    { kind: "path", d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
    { kind: "polyline", points: "9 22 9 12 15 12 15 22" },
  ],
  search: [
    { kind: "circle", cx: 11, cy: 11, r: 8 },
    { kind: "path", d: "M21 21l-4.35-4.35" },
  ],
  calendar: [
    { kind: "rect", x: 3, y: 4, width: 18, height: 18, rx: 2 },
    { kind: "line", x1: 16, y1: 2, x2: 16, y2: 6 },
    { kind: "line", x1: 8, y1: 2, x2: 8, y2: 6 },
    { kind: "line", x1: 3, y1: 10, x2: 21, y2: 10 },
  ],
  clock: [
    { kind: "circle", cx: 12, cy: 12, r: 10 },
    { kind: "polyline", points: "12 6 12 12 16 14" },
  ],
  "map-pin": [
    { kind: "path", d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" },
    { kind: "circle", cx: 12, cy: 10, r: 3 },
  ],
  map: [
    { kind: "polygon", points: "1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" },
    { kind: "line", x1: 8, y1: 2, x2: 8, y2: 18 },
    { kind: "line", x1: 16, y1: 6, x2: 16, y2: 22 },
  ],
  users: [
    { kind: "path", d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
    { kind: "circle", cx: 9, cy: 7, r: 4 },
    { kind: "path", d: "M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  ],
  "user-plus": [
    { kind: "path", d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
    { kind: "circle", cx: 8.5, cy: 7, r: 4 },
    { kind: "line", x1: 19, y1: 8, x2: 19, y2: 14 },
    { kind: "line", x1: 22, y1: 11, x2: 16, y2: 11 },
  ],
  user: [
    { kind: "path", d: "M20 21a8 8 0 0 0-16 0" },
    { kind: "circle", cx: 12, cy: 7, r: 4 },
  ],
  copy: [
    { kind: "rect", x: 9, y: 9, width: 13, height: 13, rx: 2 },
    { kind: "path", d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" },
  ],
  mail: [
    { kind: "rect", x: 2, y: 4, width: 20, height: 16, rx: 2 },
    { kind: "path", d: "M22 7l-10 7L2 7" },
  ],
  "message-circle": [
    { kind: "path", d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  ],
  image: [
    { kind: "rect", x: 3, y: 3, width: 18, height: 18, rx: 2 },
    { kind: "circle", cx: 8.5, cy: 8.5, r: 1.5 },
    { kind: "path", d: "M21 15l-5-5L5 21" },
  ],
  layers: [
    { kind: "path", d: "M12 2L2 7l10 5 10-5-10-5z" },
    { kind: "path", d: "M2 17l10 5 10-5" },
    { kind: "path", d: "M2 12l10 5 10-5" },
  ],
  sparkles: [
    { kind: "path", d: "m12 3-1.2 3.1a2 2 0 0 1-1.1 1.1L6.5 8.5l3.2 1.2a2 2 0 0 1 1.1 1.1L12 14l1.2-3.2a2 2 0 0 1 1.1-1.1l3.2-1.2-3.2-1.3a2 2 0 0 1-1.1-1.1L12 3z" },
    { kind: "path", d: "m5 15-.7 1.8a1 1 0 0 1-.5.5L2 18l1.8.7a1 1 0 0 1 .5.5L5 21l.7-1.8a1 1 0 0 1 .5-.5L8 18l-1.8-.7a1 1 0 0 1-.5-.5L5 15z" },
    { kind: "path", d: "m19 14-.7 1.8a1 1 0 0 1-.5.5L16 17l1.8.7a1 1 0 0 1 .5.5L19 20l.7-1.8a1 1 0 0 1 .5-.5L22 17l-1.8-.7a1 1 0 0 1-.5-.5L19 14z" },
  ],
  wallet: [
    { kind: "path", d: "M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7" },
    { kind: "path", d: "M16 14h.01" },
  ],
  "file-text": [
    { kind: "path", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" },
    { kind: "polyline", points: "14 2 14 8 20 8" },
    { kind: "line", x1: 9, y1: 13, x2: 15, y2: 13 },
    { kind: "line", x1: 9, y1: 17, x2: 15, y2: 17 },
  ],
  refresh: [
    { kind: "polyline", points: "23 4 23 10 17 10" },
    { kind: "path", d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" },
  ],
  settings: [
    { kind: "circle", cx: 12, cy: 12, r: 3 },
    { kind: "path", d: "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.09 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.09V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.91 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15z" },
  ],
  "log-out": [
    { kind: "path", d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" },
    { kind: "polyline", points: "16 17 21 12 16 7" },
    { kind: "line", x1: 21, y1: 12, x2: 9, y2: 12 },
  ],
  info: [
    { kind: "circle", cx: 12, cy: 12, r: 10 },
    { kind: "line", x1: 12, y1: 8, x2: 12, y2: 12 },
    { kind: "line", x1: 12, y1: 16, x2: 12.01, y2: 16 },
  ],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof iconShapes;

export interface IconProps {
  name: IconName;
  size?: 14 | 16 | 20 | 22 | 24 | 32;
  color?: string;
  strokeWidth?: number;
  accessibilityLabel?: string;
}

export function Icon({
  name,
  size = 24,
  color = colors.fg,
  strokeWidth = 1.8,
  accessibilityLabel,
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {iconShapes[name].map(renderShape)}
    </Svg>
  );
}

function renderShape(shape: IconShape, index: number): ReactNode {
  const key = `${shape.kind}-${index}`;

  switch (shape.kind) {
    case "path":
      return <Path key={key} d={shape.d} />;
    case "circle":
      return <Circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} />;
    case "line":
      return (
        <Line
          key={key}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
        />
      );
    case "polyline":
      return <Polyline key={key} points={shape.points} />;
    case "polygon":
      return <Polygon key={key} points={shape.points} />;
    case "rect":
      return (
        <Rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
        />
      );
  }
}
