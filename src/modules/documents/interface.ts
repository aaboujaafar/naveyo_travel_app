import type { TravelDocument, UUID } from "../_shared/model";
export interface DocumentsModule {
  list(tripId: UUID): Promise<TravelDocument[]>;
  add(input: Omit<TravelDocument, "id">): Promise<TravelDocument>;
}
