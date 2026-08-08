import { InMemoryReservationsModule } from "./module";

/** Process-local test fallback; app routes use the device-persistent bootstrap store. */
export const sharedLocalReservations = new InMemoryReservationsModule();
