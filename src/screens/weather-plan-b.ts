/** Above this chance of rain, a day deserves an indoor alternative. */
export const RAINY_DAY_PROBABILITY = 60;

export function isRainyDay(day: { precipitationProbabilityMax?: number }): boolean {
  return (day.precipitationProbabilityMax ?? 0) >= RAINY_DAY_PROBABILITY;
}

/** Explorer link that composes the given day with indoor places only. */
export function planBAssistantPath(tripId: string, stopId: string, date: string): string {
  return `/trips/${tripId}/assistant?stopId=${stopId}&mode=day&date=${date}&indoor=1`;
}
