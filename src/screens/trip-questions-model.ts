import type { ItineraryItem, Reservation, ReservationType, Stop, Trip } from "../modules/_shared/model";

export interface TripQuestionData {
  trip: Pick<Trip, "name" | "startsOn" | "endsOn">;
  stops: readonly Stop[];
  itinerary: readonly ItineraryItem[];
  reservations: readonly Reservation[];
  budget?: { spent: string; planned: string | null } | null;
  packing?: { label: string; packed: boolean }[] | null;
}

export interface TripAnswer {
  text: string;
  details: string[];
  /** True when the question was understood but the Voyage holds no matching data. */
  empty?: boolean;
}

export const SUGGESTED_QUESTIONS = [
  "Qu’est-ce qu’on fait demain ?",
  "À quelle heure est notre vol ?",
  "Quelle est l’adresse de l’hôtel ?",
  "Quelles sont nos références de réservation ?",
  "Combien on a dépensé ?",
  "Qu’est-ce qu’il reste à mettre dans la valise ?",
];

const TRANSPORT_WORDS: [ReservationType, RegExp, string][] = [
  ["flight", /\b(vol|vols|avion|aeroport|embarquement|decollage)\b/, "vol"],
  ["train", /\b(train|trains|gare|tgv|comboio)\b/, "train"],
  ["ferry", /\b(ferry|ferries|bateau|traversee|port)\b/, "ferry"],
];
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

/**
 * Answers common questions from the Voyage's own data — confirmed reservations,
 * programme, budget, packing list — so it works offline and never invents.
 */
export function answerTripQuestion(question: string, data: TripQuestionData, today: string): TripAnswer {
  const q = normalize(question);
  if (!q.trim()) return { text: "Posez une question sur le Voyage.", details: [], empty: true };

  if (/\b(references?|numeros?|codes?|confirmations?|pnr)\b/.test(q)) return references(data);
  if (/\b(depense|depenses|budget|combien|cout|coute|argent)\b/.test(q) && data.budget !== undefined) return budget(data);
  if (/\b(valise|bagage|bagages|oublie|emporter|prendre|preparer)\b/.test(q) && data.packing !== undefined) return packing(data);
  for (const [type, words, label] of TRANSPORT_WORDS) {
    if (words.test(q)) return transport(data, type, label, today);
  }
  if (/\b(hotel|logement|hebergement|dormir|dort|airbnb|appartement|check.?in)\b/.test(q)) return stay(data);

  const date = dateIn(q, data, today);
  if (date || /\b(programme|planning|prevu|faire|fait|visite|activites?)\b/.test(q)) return programme(data, date ?? today);

  const place = placeIn(q, data);
  if (place) return place;

  return {
    text: "Je ne sais répondre qu’à partir des données du Voyage : programme, réservations confirmées, budget et bagages.",
    details: SUGGESTED_QUESTIONS.slice(0, 3),
    empty: true,
  };
}

function references(data: TripQuestionData): TripAnswer {
  const withReference = data.reservations.filter((reservation) => reservation.reference);
  if (withReference.length === 0) return { text: "Aucune réservation confirmée n’a de référence.", details: [], empty: true };
  return {
    text: withReference.length === 1 ? "Votre référence de réservation :" : `Vos ${withReference.length} références de réservation :`,
    details: withReference.map((reservation) => `${reservation.title} : ${reservation.reference}`),
  };
}

function budget(data: TripQuestionData): TripAnswer {
  if (!data.budget) return { text: "Aucune dépense n’est enregistrée pour ce Voyage.", details: [], empty: true };
  return {
    text: data.budget.planned ? `Vous avez dépensé ${data.budget.spent} sur ${data.budget.planned}.` : `Vous avez dépensé ${data.budget.spent}.`,
    details: [],
  };
}

function packing(data: TripQuestionData): TripAnswer {
  const items = data.packing ?? [];
  if (items.length === 0) return { text: "La liste de bagages est vide.", details: [], empty: true };
  const left = items.filter((item) => !item.packed);
  if (left.length === 0) return { text: "Tout est prêt : les bagages sont faits.", details: [] };
  return { text: `Il reste ${left.length} élément${left.length > 1 ? "s" : ""} à préparer :`, details: left.map((item) => item.label) };
}

function transport(data: TripQuestionData, type: ReservationType, label: string, today: string): TripAnswer {
  const all = data.reservations.filter((reservation) => reservation.type === type && reservation.start).sort(byStart);
  if (all.length === 0) return { text: `Aucun ${label} n’est dans les réservations confirmées.`, details: [], empty: true };
  const upcoming = all.filter((reservation) => reservation.start!.local.slice(0, 10) >= today);
  const shown = upcoming.length > 0 ? upcoming : all;
  const next = shown[0]!;
  const route = next.origin && next.destination ? ` ${next.origin.label} → ${next.destination.label}` : "";
  return {
    text: `${upcoming.length > 0 ? "Prochain" : "Dernier"} ${label}${route} : ${describeMoment(next.start!.local)}${next.reference ? ` (réf. ${next.reference})` : ""}.`,
    details: shown.slice(1).map((reservation) => `${reservation.title} : ${describeMoment(reservation.start!.local)}`),
  };
}

function stay(data: TripQuestionData): TripAnswer {
  const stays = data.reservations.filter((reservation) => reservation.type === "accommodation").sort(byStart);
  if (stays.length > 0) {
    return {
      text: stays.length === 1 ? "Votre hébergement :" : "Vos hébergements :",
      details: stays.map((reservation) => {
        const place = reservation.venue;
        const address = place?.address ? `, ${place.address}` : "";
        const dates = reservation.start ? ` — arrivée ${describeMoment(reservation.start.local)}` : "";
        return `${reservation.title}${address}${dates}`;
      }),
    };
  }
  const hotels = data.itinerary.filter((item) => /\b(hotel|hostel|alojamento|pousada)\b/.test(normalize(item.title)));
  if (hotels.length > 0) return { text: "Hébergement repéré dans le programme :", details: hotels.map((item) => [item.title, item.place?.address].filter(Boolean).join(", ")) };
  return { text: "Aucun hébergement n’est encore confirmé. Importez la confirmation pour le retrouver ici, même sans réseau.", details: [], empty: true };
}

function programme(data: TripQuestionData, date: string): TripAnswer {
  const items = data.itinerary.filter((item) => item.date === date).sort((left, right) => (left.time?.local ?? "99").localeCompare(right.time?.local ?? "99"));
  const bookings = data.reservations.filter((reservation) => reservation.start?.local.slice(0, 10) === date);
  const label = formatDay(date);
  if (items.length === 0 && bookings.length === 0) {
    const inTrip = (!data.trip.startsOn || date >= data.trip.startsOn) && (!data.trip.endsOn || date <= data.trip.endsOn);
    return { text: inTrip ? `Rien n’est prévu ${label}.` : `${capitalize(label)} est en dehors des dates du Voyage.`, details: [], empty: true };
  }
  const lines = [
    ...bookings.map((reservation) => `${clock(reservation.start?.local) ?? "—"} · ${reservation.title} (réservé)`),
    ...items.map((item) => `${clock(item.time?.local) ?? "—"} · ${item.title}`),
  ].sort();
  return { text: `Au programme ${label} :`, details: lines };
}

function placeIn(q: string, data: TripQuestionData): TripAnswer | null {
  if (!/\b(ou|adresse|aller|trouve|situe)\b/.test(q)) return null;
  const candidates = [
    ...data.itinerary.map((item) => ({ name: item.title, address: item.place?.address, date: item.date })),
    ...data.reservations.map((reservation) => ({ name: reservation.title, address: reservation.venue?.address, date: reservation.start?.local.slice(0, 10) })),
  ];
  const words = q.split(/\s+/).filter((word) => word.length >= 4);
  const match = candidates.find((candidate) => words.some((word) => normalize(candidate.name).includes(word)));
  if (!match) return null;
  return {
    text: match.address ? `${match.name} : ${match.address}.` : `${match.name} n’a pas d’adresse enregistrée.`,
    details: match.date ? [`Prévu ${formatDay(match.date)}`] : [],
    ...(match.address ? {} : { empty: true }),
  };
}

function dateIn(q: string, data: TripQuestionData, today: string): string | null {
  if (/\bapres.?demain\b/.test(q)) return addDays(today, 2);
  if (/\bdemain\b/.test(q)) return addDays(today, 1);
  if (/\b(aujourd.?hui|ce soir|ce matin)\b/.test(q)) return today;
  const dayNumber = /\bjour (\d{1,2})\b/.exec(q);
  if (dayNumber && data.trip.startsOn) return addDays(data.trip.startsOn, Number(dayNumber[1]) - 1);
  const explicit = new RegExp(`\\b(\\d{1,2})(?: |er )(${MONTHS.join("|")})\\b`).exec(q);
  if (explicit) {
    const month = MONTHS.indexOf(explicit[2]!) + 1;
    const year = (data.trip.startsOn ?? today).slice(0, 4);
    return `${year}-${String(month).padStart(2, "0")}-${explicit[1]!.padStart(2, "0")}`;
  }
  const weekday = WEEKDAYS.findIndex((name) => new RegExp(`\\b${name}\\b`).test(q));
  if (weekday >= 0) {
    // The next such day from today, or from the departure when the Voyage has not started.
    const from = data.trip.startsOn && data.trip.startsOn > today ? data.trip.startsOn : today;
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addDays(from, offset);
      if (new Date(`${candidate}T12:00:00Z`).getUTCDay() === weekday) return candidate;
    }
  }
  return null;
}

function byStart(left: Reservation, right: Reservation): number {
  return (left.start?.local ?? "").localeCompare(right.start?.local ?? "");
}

function describeMoment(local: string): string {
  const time = clock(local);
  return `${formatDay(local.slice(0, 10))}${time ? ` à ${time}` : ""}`;
}

function formatDay(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return `le ${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(parsed)}`;
}

function clock(local?: string): string | null {
  const match = local ? /T(\d{2}):(\d{2})/.exec(local) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").toLowerCase();
}
