import { useLocalSearchParams } from "expo-router";
import { createContext, useContext, type ReactNode } from "react";

const TripIdContext = createContext<string | undefined>(undefined);

/**
 * Native tabs open their screens without the parent route params, so the
 * `[tripId]` segment is handed down from the tabs layout instead.
 */
export function TripRouteProvider({ tripId, children }: { tripId: string | undefined; children: ReactNode }) {
  return <TripIdContext.Provider value={tripId}>{children}</TripIdContext.Provider>;
}

/** Route params of a Voyage tab screen, with `tripId` always resolved. */
export function useTripTabParams<T extends Record<string, string | undefined>>(): Partial<T> & { tripId?: string } {
  const params = useLocalSearchParams() as Partial<T> & { tripId?: string };
  const contextTripId = useContext(TripIdContext);
  return { ...params, tripId: typeof params.tripId === "string" ? params.tripId : contextTripId };
}
