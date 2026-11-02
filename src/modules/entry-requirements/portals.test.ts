import { describe, expect, it } from "vitest";
import { ETA_PORTALS, EVISA_PORTALS, travelAdviceUrl } from "./portals";

describe("official portals", () => {
  it("only lists government sites", () => {
    const hosts = [...Object.values(ETA_PORTALS), ...Object.values(EVISA_PORTALS)].map((portal) => new URL(portal.url).hostname);
    for (const host of hosts) expect(host).toMatch(/(\.gov|\.gov\.[a-z]{2}|\.govt\.nz|\.go\.[a-z]{2}|canada\.ca|gov\.uk|\.gouv\.fr|icp\.gov\.ae|\.gov\.kh)$|^(esta\.cbp\.dhs\.gov|indianvisaonline\.gov\.in|visa2egypt\.gov\.eg|evisa\.gov\.vn|www\.evisa\.gov\.tr|eta\.gov\.lk|www\.etakenya\.go\.ke)$/);
  });

  it("links the French travel advice page, or the list of countries", () => {
    expect(travelAdviceUrl("us")).toBe("https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/etats-unis/");
    expect(travelAdviceUrl("PE")).toBe("https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/");
  });
});
