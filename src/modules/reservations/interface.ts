import type { Reservation, ReservationDraft, UUID } from '../_shared/model'
export interface ReservationsModule { list(tripId: UUID): Promise<Reservation[]>; confirm(tripId: UUID, draft: ReservationDraft): Promise<Reservation> }
export interface DocumentAnalyzer { analyze(fileUri: string): Promise<ReservationDraft> }
