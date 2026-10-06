/** Tasks of a Voyage marked as done, shared by its members. */
export interface TripChecksModule {
  list(tripId: string): Promise<Set<string>>;
  set(tripId: string, key: string, checked: boolean): Promise<void>;
}
