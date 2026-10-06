/**
 * Voyages whose dashboard should open the stays and transport questions on
 * its next appearance: set when a Voyage or an Étape has just been created.
 */
const pending = new Set<string>();

export function requestLogisticsTunnel(tripId: string): void {
  pending.add(tripId);
}

/** True once per request. */
export function consumeLogisticsTunnel(tripId: string): boolean {
  return pending.delete(tripId);
}
