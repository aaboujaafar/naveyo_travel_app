/**
 * Entry requirements matrix: for a passport and a destination, the kind of
 * formality. Source: imorte/passport-index-data (MIT), itself compiled from
 * the Passport Index; indicative, to be checked on official pages.
 */

export type EntryStatus =
  | { kind: "own" }
  | { kind: "visaFree"; days?: number }
  | { kind: "visaOnArrival" }
  | { kind: "eVisa" }
  | { kind: "eta" }
  | { kind: "visaRequired" }
  | { kind: "noAdmission" }
  | { kind: "unknown" };

export interface EntryMatrix {
  /** Date of the data, YYYY-MM-DD. */
  updatedOn: string;
  passports: string[];
  destinations: string[];
  /** One string per passport, one comma-separated code per destination (see `encodeValue`). */
  rows: string[];
}

export const MATRIX_SOURCE = {
  name: "Passport Index data (imorte/passport-index-data)",
  url: "https://github.com/imorte/passport-index-data",
  license: "MIT",
  csvUrl: "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-matrix-iso2.csv",
  commitsUrl: "https://api.github.com/repos/imorte/passport-index-data/commits?path=passport-index-matrix-iso2.csv&per_page=1",
};

/** Compact codes: F visa free, A on arrival, E e-visa, T eta, R visa required, N no admission, - own country, digits days. */
export function encodeValue(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (/^\d+$/.test(value)) return value;
  switch (value) {
    case "-1": return "-";
    case "visa free": return "F";
    case "visa on arrival": return "A";
    case "e-visa": return "E";
    case "eta": return "T";
    case "visa required": return "R";
    case "no admission": return "N";
    default: return "?";
  }
}

function decodeValue(code: string | undefined): EntryStatus {
  if (code === undefined) return { kind: "unknown" };
  if (/^\d+$/.test(code)) return { kind: "visaFree", days: Number(code) };
  switch (code) {
    case "-": return { kind: "own" };
    case "F": return { kind: "visaFree" };
    case "A": return { kind: "visaOnArrival" };
    case "E": return { kind: "eVisa" };
    case "T": return { kind: "eta" };
    case "R": return { kind: "visaRequired" };
    case "N": return { kind: "noAdmission" };
    default: return { kind: "unknown" };
  }
}

/** Reads the dataset's ISO-2 matrix CSV (first column the passport, then one column per destination). */
export function parseMatrixCsv(csv: string, updatedOn: string): EntryMatrix {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = (lines[0] ?? "").split(",").map((cell) => cell.trim().toUpperCase());
  if (header.length < 2 || header[0] !== "PASSPORT") throw new Error("Unexpected entry requirements matrix format");
  const destinations = header.slice(1);
  const passports: string[] = [];
  const rows: string[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const passport = cells[0]?.trim().toUpperCase();
    if (!passport || !/^[A-Z]{2}$/.test(passport) || cells.length !== header.length) continue;
    passports.push(passport);
    rows.push(cells.slice(1).map(encodeValue).join(","));
  }
  if (passports.length < 150) throw new Error("Entry requirements matrix looks incomplete");
  return { updatedOn, passports, destinations, rows };
}

export function entryStatus(matrix: EntryMatrix, passport: string, destination: string): EntryStatus {
  const from = passport.trim().toUpperCase();
  const to = destination.trim().toUpperCase();
  if (from === to) return { kind: "own" };
  const row = matrix.passports.indexOf(from);
  const column = matrix.destinations.indexOf(to);
  if (row < 0 || column < 0) return { kind: "unknown" };
  return decodeValue(matrix.rows[row]?.split(",")[column]);
}
