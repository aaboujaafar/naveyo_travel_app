import type { Coordinates } from "../_shared/model";
import type {
  CalculateRouteInput,
  RouteResult,
  RoutingModule,
  RoutingProvider,
} from "./interface";

export class Routing implements RoutingModule {
  constructor(private readonly provider: RoutingProvider) {}

  calculate(input: CalculateRouteInput): Promise<RouteResult | null> {
    const coordinates = uniqueCoordinates(input.coordinates);
    if (coordinates.length < 2) return Promise.resolve(null);
    return this.provider.calculate({ ...input, coordinates });
  }
}

function uniqueCoordinates(coordinates: Coordinates[]): Coordinates[] {
  const seen = new Set<string>();
  return coordinates.filter((coordinate) => {
    const key = `${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
