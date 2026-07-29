import type { ItineraryItem, UUID } from '../_shared/model'
export interface ItineraryModule { list(tripId: UUID): Promise<ItineraryItem[]>; add(input: Omit<ItineraryItem, 'id'>): Promise<ItineraryItem> }
