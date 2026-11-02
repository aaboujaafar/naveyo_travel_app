/** Practical information about a country, from Wikidata. */
export interface CountryInfo {
  /** IEC plug letters: A, B, C, D, E, F, G, I, J, K, L, N. */
  plugs?: string[];
  /** Mains voltages in volts. */
  voltage?: number[];
  drives?: "left" | "right";
  /** ISO 4217 codes. */
  currencies?: string[];
  callingCode?: string;
}

export interface PracticalNote {
  kind: "plug" | "voltage" | "driving" | "currency" | "calling";
  text: string;
  /** Differs from home: worth a reminder (adapter, driving on the left…). */
  notable: boolean;
}

/** A C (Europlug) plug fits these sockets too. */
const EUROPLUG_SOCKETS = new Set(["C", "E", "F", "J", "K", "L", "N", "H"]);

/**
 * What changes for a traveller coming from `home`: plugs (adapter needed when
 * no socket fits home plugs), voltage, driving side, currency, calling code.
 */
export function practicalNotes(destination: CountryInfo | undefined, home: CountryInfo | undefined): PracticalNote[] {
  if (!destination) return [];
  const notes: PracticalNote[] = [];
  if (destination.plugs?.length) {
    const homePlugs = new Set(home?.plugs ?? []);
    const fits = destination.plugs.some((type) => homePlugs.has(type) || (homePlugs.has("C") && EUROPLUG_SOCKETS.has(type)));
    const needsAdapter = home?.plugs?.length ? !fits : false;
    notes.push({ kind: "plug", text: `Prises type ${destination.plugs.join(", ")}${needsAdapter ? " : adaptateur à prévoir" : ""}`, notable: needsAdapter });
  }
  if (destination.voltage?.length) {
    const low = Math.max(...destination.voltage) < 200 && (home?.voltage ?? []).some((volt) => volt >= 200);
    notes.push({ kind: "voltage", text: `${destination.voltage.join(" / ")} V${low ? " : vérifiez que vos chargeurs acceptent 100–240 V" : ""}`, notable: low });
  }
  if (destination.drives) {
    const differs = home?.drives !== undefined && home.drives !== destination.drives;
    notes.push({ kind: "driving", text: destination.drives === "left" ? "Conduite à gauche" : "Conduite à droite", notable: differs });
  }
  if (destination.currencies?.length) {
    const differs = !destination.currencies.some((code) => home?.currencies?.includes(code));
    notes.push({ kind: "currency", text: `Monnaie : ${destination.currencies.join(", ")}`, notable: differs });
  }
  if (destination.callingCode) notes.push({ kind: "calling", text: `Indicatif ${destination.callingCode}`, notable: false });
  return notes;
}

/** The adapter letters to pack, for the packing list: null when none is needed. */
export function adapterNeeded(destination: CountryInfo | undefined, home: CountryInfo | undefined): string[] | null {
  const plug = practicalNotes(destination, home).find((note) => note.kind === "plug");
  return plug?.notable && destination?.plugs ? destination.plugs : null;
}
