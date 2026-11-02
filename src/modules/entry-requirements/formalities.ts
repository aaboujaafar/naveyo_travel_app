import { addDays } from "../logistics";
import { entryStatus, type EntryMatrix } from "./matrix";
import { ARRIVAL_FORMS, ETA_PORTALS, EVISA_PORTALS, travelAdviceUrl, type OfficialPortal } from "./portals";

export type FormalityLevel = "ok" | "task" | "warning" | "danger" | "unknown";

export interface Formality {
  /** Stable across loads, so a checked task stays checked. */
  key: string;
  level: FormalityLevel;
  countryCode: string;
  nationalities: string[];
  title: string;
  detail: string;
  /** Latest advisable date to do it, YYYY-MM-DD. */
  deadline?: string;
  link: OfficialPortal;
}

interface FormalityStop {
  countryCode: string;
  startDate: string;
  endDate: string;
}

/** Lead times advised before arrival: generous, since processing times vary. */
const LEAD_DAYS = { eta: 7, eVisa: 21, visaRequired: 45, arrivalForm: 3 } as const;

/**
 * Entry formalities of a Voyage: one line per destination country and
 * situation, grouping nationalities that share it. Indicative, from the
 * matrix; every line links an official page.
 */
export function evaluateFormalities(input: { nationalities: readonly string[]; stops: readonly FormalityStop[]; matrix: EntryMatrix }): Formality[] {
  const nationalities = [...new Set(input.nationalities.map((code) => code.toUpperCase()).filter((code) => /^[A-Z]{2}$/.test(code)))];
  const countries = [...new Set(input.stops.map((stop) => stop.countryCode.toUpperCase()))];
  const formalities: Formality[] = [];

  for (const country of countries) {
    const stops = input.stops.filter((stop) => stop.countryCode.toUpperCase() === country).sort((left, right) => left.startDate.localeCompare(right.startDate));
    const arrival = stops[0]!.startDate;
    const days = stayDays(stops);
    const advice: OfficialPortal = { name: "Conseils aux voyageurs", url: travelAdviceUrl(country) };
    // Nationalities sharing the same situation make one line.
    const groups = new Map<string, { status: ReturnType<typeof entryStatus>; nationalities: string[] }>();
    for (const nationality of nationalities) {
      const status = entryStatus(input.matrix, nationality, country);
      if (status.kind === "own") continue;
      const id = JSON.stringify(status);
      groups.set(id, { status, nationalities: [...(groups.get(id)?.nationalities ?? []), nationality] });
    }

    for (const { status, nationalities: group } of groups.values()) {
      const key = (suffix: string) => `formality:${country}:${group.join("+")}:${suffix}`;
      switch (status.kind) {
        case "visaFree":
          if (status.days !== undefined && days > status.days) {
            formalities.push({ key: key("overstay"), level: "warning", countryCode: country, nationalities: group, title: "Séjour plus long que la durée sans visa", detail: `${days} jours prévus, ${status.days} autorisés sans visa`, link: advice });
          } else {
            formalities.push({ key: key("free"), level: "ok", countryCode: country, nationalities: group, title: "Sans visa", detail: status.days !== undefined ? `Jusqu’à ${status.days} jours` : "Pas de visa pour ce séjour", link: advice });
          }
          break;
        case "eta": {
          const portal = ETA_PORTALS[country];
          formalities.push({ key: key("eta"), level: "task", countryCode: country, nationalities: group, title: `Demander ${portal ? `l’${portal.name}` : "l’autorisation de voyage électronique"}`, detail: "En ligne, avant le départ", deadline: addDays(arrival, -LEAD_DAYS.eta), link: portal ?? advice });
          break;
        }
        case "eVisa": {
          const portal = EVISA_PORTALS[country];
          formalities.push({ key: key("evisa"), level: "task", countryCode: country, nationalities: group, title: "Demander l’e-visa", detail: portal ? "Sur le portail officiel" : "Portail officiel indiqué dans les conseils aux voyageurs", deadline: addDays(arrival, -LEAD_DAYS.eVisa), link: portal ?? advice });
          break;
        }
        case "visaOnArrival":
          formalities.push({ key: key("arrival"), level: "ok", countryCode: country, nationalities: group, title: "Visa délivré à l’arrivée", detail: "Conditions et frais à vérifier avant de partir", link: EVISA_PORTALS[country] ?? advice });
          break;
        case "visaRequired":
          formalities.push({ key: key("visa"), level: "task", countryCode: country, nationalities: group, title: "Visa à obtenir avant le départ", detail: "Auprès de l’ambassade ou du consulat", deadline: addDays(arrival, -LEAD_DAYS.visaRequired), link: advice });
          break;
        case "noAdmission":
          formalities.push({ key: key("refused"), level: "danger", countryCode: country, nationalities: group, title: "Entrée non autorisée", detail: "Avec ce passeport, selon les données disponibles", link: advice });
          break;
        default:
          formalities.push({ key: key("unknown"), level: "unknown", countryCode: country, nationalities: group, title: "Conditions d’entrée à vérifier", detail: "Pas de donnée pour cette nationalité", link: advice });
      }
    }

    const form = ARRIVAL_FORMS[country];
    if (form) {
      formalities.push({ key: `formality:${country}:all:form`, level: "task", countryCode: country, nationalities, title: `Remplir ${form.name}`, detail: "Formulaire d’arrivée officiel", deadline: addDays(arrival, -LEAD_DAYS.arrivalForm), link: form });
    }
  }
  return formalities;
}

function stayDays(stops: readonly FormalityStop[]): number {
  const days = new Set<string>();
  for (const stop of stops) for (let day = stop.startDate; day <= stop.endDate && days.size < 1000; day = addDays(day, 1)) days.add(day);
  return days.size;
}
