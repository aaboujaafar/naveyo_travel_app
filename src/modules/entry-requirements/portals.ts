/**
 * Official sites only: government portals to apply for an authorisation or
 * an e-visa (never paid intermediaries), and the French government's travel
 * advice. Each URL was checked to answer on 2026-10-06.
 */
export const PORTALS_CHECKED_ON = "2026-10-06";

export interface OfficialPortal {
  /** Name shown on the button: « ESTA », « eTA / AVE », « e-Visa »… */
  name: string;
  url: string;
}

/** Electronic travel authorisations, for passports the matrix marks « eta ». */
export const ETA_PORTALS: Record<string, OfficialPortal> = {
  US: { name: "ESTA", url: "https://esta.cbp.dhs.gov/" },
  CA: { name: "AVE (eTA)", url: "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/visiter-canada/ave.html" },
  GB: { name: "ETA britannique", url: "https://www.gov.uk/eta" },
  AU: { name: "ETA australienne", url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601" },
  NZ: { name: "NZeTA", url: "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/" },
  LK: { name: "ETA Sri Lanka", url: "https://eta.gov.lk/" },
  KE: { name: "eTA Kenya", url: "https://www.etakenya.go.ke/" },
};

/** Government e-visa portals, for passports the matrix marks « e-visa » (or on arrival when one exists). */
export const EVISA_PORTALS: Record<string, OfficialPortal> = {
  IN: { name: "e-Visa Inde", url: "https://indianvisaonline.gov.in/evisa/" },
  EG: { name: "e-Visa Égypte", url: "https://visa2egypt.gov.eg/" },
  VN: { name: "e-Visa Vietnam", url: "https://evisa.gov.vn/" },
  TR: { name: "e-Visa Turquie", url: "https://www.evisa.gov.tr/" },
  TH: { name: "e-Visa Thaïlande", url: "https://www.thaievisa.go.th/" },
  ID: { name: "e-Visa / e-VOA Indonésie", url: "https://evisa.imigrasi.go.id/" },
  KH: { name: "e-Visa Cambodge", url: "https://www.evisa.gov.kh/" },
  AE: { name: "Visas Émirats (ICP)", url: "https://icp.gov.ae/" },
};

/** Other official formalities useful whatever the passport (arrival cards, entry forms). */
export const ARRIVAL_FORMS: Record<string, OfficialPortal> = {
  TH: { name: "Carte d’arrivée TDAC", url: "https://tdac.immigration.go.th/" },
  JP: { name: "Visit Japan Web", url: "https://services.digital.go.jp/en/visit-japan-web/" },
};

const ADVICE_BASE = "https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/";
/** Country pages of diplomatie.gouv.fr checked to exist; other countries open the list of all countries. */
const ADVICE_SLUGS: Record<string, string> = {
  US: "etats-unis", CA: "canada", GB: "royaume-uni", MA: "maroc", TN: "tunisie", TR: "turquie", EG: "egypte",
  JP: "japon", TH: "thailande", VN: "vietnam", ID: "indonesie", AE: "emirats-arabes-unis", MX: "mexique",
  BR: "bresil", AU: "australie", ZA: "afrique-du-sud", IS: "islande", NO: "norvege", CH: "suisse", PT: "portugal",
};

/** France Diplomatie's travel advice: entry conditions, embassy, local situation. */
export function travelAdviceUrl(countryCode: string): string {
  const slug = ADVICE_SLUGS[countryCode.toUpperCase()];
  return slug ? `${ADVICE_BASE}${slug}/` : ADVICE_BASE;
}
