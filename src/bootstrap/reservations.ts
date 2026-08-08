import { fileReservationStorage } from "../adapters/file-system/reservations";
import { PersistentReservationsModule } from "../modules/reservations/persistent";

export const sharedLocalReservations = new PersistentReservationsModule(fileReservationStorage);
