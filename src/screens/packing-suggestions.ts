import type { PackingCategory } from "../modules/packing-list";

export interface PackingSuggestion {
  label: string;
  category: PackingCategory;
  quantity: number;
  reason?: string;
}

// Countries whose sockets do not take the European two-pin plug (types C/E/F).
const otherPlugCountries = new Set(["GB", "IE", "MT", "CY", "US", "CA", "MX", "JP", "AU", "NZ", "CH", "ZA", "IN", "CN", "BR", "AR", "TH", "SG", "HK", "AE"]);
const euCountries = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

/**
 * A starting list built only from facts the app knows: length of the Voyage,
 * month of departure and countries of its Étapes. Items already on the list are skipped.
 */
export function suggestPackingItems(input: {
  startsOn?: string;
  endsOn?: string;
  countryCodes: readonly string[];
  existingLabels: readonly string[];
}): PackingSuggestion[] {
  const nights = countNights(input.startsOn, input.endsOn);
  const days = Math.min(nights + 1, 7);
  const month = input.startsOn ? Number(input.startsOn.slice(5, 7)) : null;
  const cold = month !== null && (month >= 11 || month <= 3);
  const warm = month !== null && month >= 6 && month <= 8;
  const countries = Array.from(new Set(input.countryCodes.map((code) => code.toUpperCase())));
  const abroad = countries.some((code) => code !== "FR");
  const outsideEu = countries.some((code) => code !== "FR" && !euCountries.has(code));

  const suggestions: PackingSuggestion[] = [
    { label: "Carte d’identité ou passeport", category: "documents", quantity: 1 },
    ...(outsideEu ? [{ label: "Passeport (validité à vérifier)", category: "documents" as const, quantity: 1, reason: "Voyage hors Union européenne" }] : []),
    ...(abroad && !outsideEu ? [{ label: "Carte européenne d’assurance maladie", category: "documents" as const, quantity: 1 }] : []),
    { label: "Moyen de paiement", category: "documents", quantity: 1 },
    { label: "T-shirts", category: "clothing", quantity: days, reason: `${days} jour${days > 1 ? "s" : ""}` },
    { label: "Sous-vêtements", category: "clothing", quantity: days },
    { label: "Chaussettes", category: "clothing", quantity: days },
    { label: "Pantalon", category: "clothing", quantity: Math.max(1, Math.ceil(days / 3)) },
    { label: "Pyjama", category: "clothing", quantity: 1 },
    { label: "Chaussures confortables", category: "clothing", quantity: 1 },
    ...(cold
      ? [
          { label: "Manteau chaud", category: "clothing" as const, quantity: 1, reason: "Départ en saison froide" },
          { label: "Pull", category: "clothing" as const, quantity: Math.max(1, Math.ceil(days / 3)) },
          { label: "Parapluie", category: "other" as const, quantity: 1 },
        ]
      : []),
    ...(warm
      ? [
          { label: "Maillot de bain", category: "clothing" as const, quantity: 1, reason: "Départ en été" },
          { label: "Crème solaire", category: "toiletries" as const, quantity: 1 },
          { label: "Lunettes de soleil", category: "other" as const, quantity: 1 },
        ]
      : []),
    { label: "Brosse à dents et dentifrice", category: "toiletries", quantity: 1 },
    { label: "Trousse de toilette", category: "toiletries", quantity: 1 },
    { label: "Chargeur de téléphone", category: "electronics", quantity: 1 },
    ...(countries.some((code) => otherPlugCountries.has(code))
      ? [{ label: "Adaptateur de prise", category: "electronics" as const, quantity: 1, reason: "Prises différentes sur place" }]
      : []),
    { label: "Batterie externe", category: "electronics", quantity: 1 },
    { label: "Médicaments personnels", category: "health", quantity: 1 },
    { label: "Trousse de premiers secours", category: "health", quantity: 1 },
  ];

  const existing = new Set(input.existingLabels.map(normalize));
  return suggestions.filter((suggestion) => !existing.has(normalize(suggestion.label)));
}

function countNights(startsOn?: string, endsOn?: string): number {
  if (!startsOn || !endsOn) return 3;
  const nights = Math.round((Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)) / 86_400_000);
  return Number.isFinite(nights) && nights >= 0 ? nights : 3;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").toLowerCase().trim();
}
