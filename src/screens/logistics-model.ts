import type { LogisticsGap } from "../modules/logistics";

/** « Hébergement à Lisbonne » / « 18 → 19 nov. · 1 nuit ». */
export function describeGap(gap: LogisticsGap): { title: string; detail: string } {
  if (gap.kind === "stay") {
    return { title: `Hébergement à ${gap.stop.name}`, detail: `${shortDate(gap.checkIn)} → ${shortDate(gap.checkOut)} · ${gap.nights} nuit${gap.nights > 1 ? "s" : ""} à couvrir` };
  }
  const label = gap.role === "outbound" ? "Aller" : gap.role === "return" ? "Retour" : "Trajet";
  return {
    title: `${label} ${gap.from.name} → ${gap.to.name}`,
    detail: `${shortDate(gap.date)}${gap.distanceKm ? ` · ${gap.distanceKm.toLocaleString("fr-FR")} km` : ""}`,
  };
}

export function shortDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(parsed);
}
