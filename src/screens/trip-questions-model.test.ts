import { describe, expect, it } from "vitest";
import type { ItineraryItem, Reservation, Stop, UUID } from "../modules/_shared/model";
import { itineraryItem, reservation, stop } from "../modules/__fixtures__/domain";
import { answerTripQuestion, type TripQuestionData } from "./trip-questions-model";

const lisbon: Stop = { ...stop, name: "Lisbonne", startDate: "2026-11-16", endDate: "2026-11-20" };
const item = (id: string, date: string, title: string, local?: string, address?: string): ItineraryItem => ({
  ...itineraryItem,
  id: `00000000-0000-4000-8000-0000000000${id}` as UUID,
  date,
  title,
  ...(local ? { time: { local: `${date}T${local}`, timeZone: lisbon.timeZone } } : { time: undefined }),
  ...(address ? { place: { kind: "venue" as const, label: title, address } } : { place: undefined }),
});
const booking = (overrides: Partial<Reservation>): Reservation => ({ ...reservation, ...overrides });

const data: TripQuestionData = {
  trip: { name: "Lisbonne", startsOn: "2026-11-16", endsOn: "2026-11-20" },
  stops: [lisbon],
  itinerary: [
    item("01", "2026-11-17", "Oceanário", "10:00", "Esplanada D. Carlos I"),
    item("02", "2026-11-17", "Pastéis de Belém", "15:30"),
    item("03", "2026-11-18", "Sintra"),
  ],
  reservations: [
    booking({ id: "00000000-0000-4000-8000-0000000000b1" as UUID, type: "flight", title: "Paris → Lisbonne", reference: "AB12CD", start: { local: "2026-11-16T07:15", timeZone: lisbon.timeZone } }),
    booking({ id: "00000000-0000-4000-8000-0000000000b2" as UUID, type: "accommodation", title: "Hotel Avenida", reference: "H-778", venue: { kind: "venue", label: "Hotel Avenida", address: "Av. da Liberdade 1" }, start: { local: "2026-11-16", timeZone: lisbon.timeZone } }),
  ],
  budget: { spent: "240 €", planned: "800 €" },
  packing: [{ label: "Passeport", packed: true }, { label: "Chargeur", packed: false }],
};
const ask = (question: string, today = "2026-11-16") => answerTripQuestion(question, data, today);

describe("trip questions", () => {
  it("tells tomorrow's programme in time order", () => {
    expect(ask("Qu'est-ce qu'on fait demain ?")).toEqual({
      text: "Au programme le mardi 17 novembre :",
      details: ["10:00 · Oceanário", "15:30 · Pastéis de Belém"],
    });
    expect(ask("on fait quoi jeudi ?").text).toBe("Rien n’est prévu le jeudi 19 novembre.");
    expect(ask("programme du jour 3").details).toEqual(["— · Sintra"]);
  });

  it("finds the flight, the stay and the references", () => {
    // The fixture reservation carries its route (Paris CDG → Lisbon LIS).
    expect(ask("À quelle heure est notre vol ?", "2026-11-10").text).toBe("Prochain vol Paris CDG → Lisbon LIS : le lundi 16 novembre à 07:15 (réf. AB12CD).");
    expect(ask("Quelle est l'adresse de l'hôtel ?").details).toEqual(["Hotel Avenida, Av. da Liberdade 1 — arrivée le lundi 16 novembre"]);
    expect(ask("nos numéros de réservation").details).toEqual(["Paris → Lisbonne : AB12CD", "Hotel Avenida : H-778"]);
    expect(ask("on prend le train quand ?").empty).toBe(true);
  });

  it("answers budget, packing and addresses", () => {
    expect(ask("Combien on a dépensé ?").text).toBe("Vous avez dépensé 240 € sur 800 €.");
    expect(ask("Qu'est-ce qu'il reste à mettre dans la valise ?")).toEqual({ text: "Il reste 1 élément à préparer :", details: ["Chargeur"] });
    expect(ask("C'est où l'oceanario ?").text).toBe("Oceanário : Esplanada D. Carlos I.");
  });

  it("admits what it cannot answer", () => {
    expect(ask("Quel temps fera-t-il ?")).toMatchObject({ empty: true });
  });
});
