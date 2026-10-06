import { practicalNotes, type PracticalNote } from "../modules/country-info";
import { COUNTRY_INFO } from "../modules/country-info/data";
import type { Reservation, Stop } from "../modules/_shared/model";

export interface EmergencyNumbers {
  /** The number to remember; it reaches every service or routes the call. */
  general: string;
  police?: string;
  ambulance?: string;
  fire?: string;
}

/**
 * Source: Wikipedia, « List of emergency telephone numbers » (checked October 2026).
 * 112 works from any mobile phone in the European Union.
 */
export const EMERGENCY_NUMBERS: Record<string, EmergencyNumbers> = {
  PT: { general: "112" },
  ES: { general: "112" },
  FR: { general: "112", police: "17", ambulance: "15", fire: "18" },
  IT: { general: "112" },
  DE: { general: "112", police: "110" },
  GB: { general: "999", police: "999", ambulance: "999", fire: "999" },
  IE: { general: "112" },
  NL: { general: "112" },
  BE: { general: "112", police: "101" },
  CH: { general: "112", police: "117", ambulance: "144", fire: "118" },
  AT: { general: "112", police: "133", ambulance: "144", fire: "122" },
  GR: { general: "112", police: "100", ambulance: "166", fire: "199" },
  HR: { general: "112", police: "192", ambulance: "194", fire: "193" },
  MA: { general: "112", police: "19", ambulance: "15" },
  TN: { general: "197", police: "197", ambulance: "190", fire: "198" },
  TR: { general: "112" },
  US: { general: "911" },
  CA: { general: "911" },
  MX: { general: "911" },
  BR: { general: "190", police: "190", ambulance: "192", fire: "193" },
  AR: { general: "911" },
  JP: { general: "110", police: "110", ambulance: "119", fire: "119" },
  CN: { general: "110", police: "110", ambulance: "120", fire: "119" },
  TH: { general: "191", police: "191", ambulance: "1669", fire: "199" },
  ID: { general: "112", ambulance: "118", fire: "113" },
  VN: { general: "113", police: "113", ambulance: "115", fire: "114" },
  IN: { general: "112", ambulance: "108", fire: "101" },
  AU: { general: "000" },
  NZ: { general: "111" },
  AE: { general: "999", police: "999", ambulance: "998", fire: "997" },
  EG: { general: "122", police: "122", ambulance: "123", fire: "180" },
  ZA: { general: "10111", police: "10111", ambulance: "10177" },
  IS: { general: "112" },
  NO: { general: "112", ambulance: "113", fire: "110" },
  SE: { general: "112" },
  DK: { general: "112" },
  PL: { general: "112", police: "997", ambulance: "999", fire: "998" },
  CZ: { general: "112", police: "158", ambulance: "155", fire: "150" },
  HU: { general: "112", police: "107", ambulance: "104", fire: "105" },
};

/** « Please take me to this address », in the language of the country. */
const TAXI_PHRASES: Record<string, string> = {
  pt: "Por favor, leve-me a esta morada.",
  "pt-BR": "Por favor, me leve a este endereço.",
  es: "Por favor, lléveme a esta dirección.",
  it: "Per favore, mi porti a questo indirizzo.",
  de: "Bitte bringen Sie mich zu dieser Adresse.",
  nl: "Breng me alstublieft naar dit adres.",
  en: "Please take me to this address.",
  el: "Παρακαλώ πηγαίνετέ με σε αυτή τη διεύθυνση.",
  tr: "Lütfen beni bu adrese götürün.",
  pl: "Proszę mnie zawieźć pod ten adres.",
  ja: "この住所までお願いします。",
  zh: "请带我去这个地址。",
  ar: "من فضلك، خذني إلى هذا العنوان.",
};

const COUNTRY_LANGUAGES: Record<string, string> = {
  PT: "pt", BR: "pt-BR", ES: "es", MX: "es", AR: "es", IT: "it", DE: "de", AT: "de", CH: "de",
  NL: "nl", BE: "nl", GR: "el", TR: "tr", PL: "pl", JP: "ja", CN: "zh", MA: "ar", TN: "ar", EG: "ar", AE: "ar",
};

export interface EmergencyStay {
  name: string;
  address?: string;
  from?: string;
}

export interface EmergencyCountry {
  countryCode: string;
  /** Null when the country is not in the table: the traveller is told to check locally. */
  numbers: EmergencyNumbers | null;
  stops: string[];
  stays: EmergencyStay[];
  /** In the local language, or English. */
  taxiPhrase: string;
  /** Plugs, voltage, driving side, currency, calling code; notable when different from home. */
  practical: PracticalNote[];
}

/** One section per country of the Voyage, in travel order. */
export function buildEmergencySheet(
  stops: readonly (Pick<Stop, "name" | "countryCode" | "startDate"> & { id?: string })[],
  reservations: readonly Reservation[],
  /** Stays without a booking (« chez des proches », van…) that have an address. */
  otherStays: readonly { stopId: string; label: string; address: string }[] = [],
  homeCountry = "FR",
): EmergencyCountry[] {
  const ordered = [...stops].sort((left, right) => left.startDate.localeCompare(right.startDate));
  const countries = [...new Set(ordered.map((stop) => stop.countryCode.toUpperCase()))];
  const stays = reservations
    .filter((reservation) => reservation.type === "accommodation")
    .sort((left, right) => (left.start?.local ?? "").localeCompare(right.start?.local ?? ""));
  return countries.map((countryCode) => {
    const countryStays = stays.filter((stay) => {
      const code = stay.venue?.countryCode?.toUpperCase();
      // A stay without a country belongs to the Voyage's single country, if it has only one.
      return code ? code === countryCode : countries.length === 1;
    });
    return {
      countryCode,
      numbers: EMERGENCY_NUMBERS[countryCode] ?? null,
      stops: ordered.filter((stop) => stop.countryCode.toUpperCase() === countryCode).map((stop) => stop.name),
      stays: [
        ...countryStays.map((stay) => ({
          name: stay.venue?.label && stay.venue.label !== stay.title ? `${stay.title} · ${stay.venue.label}` : stay.title,
          ...(stay.venue?.address ? { address: stay.venue.address } : {}),
          ...(stay.start?.local ? { from: stay.start.local.slice(0, 10) } : {}),
        })),
        ...otherStays.flatMap((other) => {
          const stop = ordered.find((item) => item.id === other.stopId);
          return stop && stop.countryCode.toUpperCase() === countryCode ? [{ name: other.label, address: other.address, from: stop.startDate }] : [];
        }),
      ],
      taxiPhrase: TAXI_PHRASES[COUNTRY_LANGUAGES[countryCode] ?? "en"] ?? TAXI_PHRASES.en!,
      practical: practicalNotes(COUNTRY_INFO[countryCode], COUNTRY_INFO[homeCountry.toUpperCase()]),
    };
  });
}
