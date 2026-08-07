import { InMemoryReservationsModule } from "./module";

/** Temporary process-local fallback shared by import and listing screens. */
export const sharedLocalReservations = new InMemoryReservationsModule();
