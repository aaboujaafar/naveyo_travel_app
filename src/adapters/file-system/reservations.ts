import * as FileSystem from "expo-file-system/legacy";
import { parseReservation } from "../../modules/_shared/validation";
import type { Reservation } from "../../modules/_shared/model";
import type { ReservationStorage } from "../../modules/reservations/persistent";

const path = () => `${FileSystem.documentDirectory ?? ""}naveyo-reservations.json`;

export const fileReservationStorage: ReservationStorage = {
  async read() {
    if (!FileSystem.documentDirectory) return [];
    try {
      const parsed: unknown = JSON.parse(await FileSystem.readAsStringAsync(path()));
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((value) => {
        try { return [parseReservation(value)]; } catch { return []; }
      });
    } catch {
      return [];
    }
  },
  async write(reservations: Reservation[]) {
    if (!FileSystem.documentDirectory) return;
    await FileSystem.writeAsStringAsync(path(), JSON.stringify(reservations));
  },
};
