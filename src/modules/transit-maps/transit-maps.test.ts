import { describe, expect, it } from "vitest";
import { parseCommonsImageInfo, parseTransitMapsResults, transitMapsQuery } from ".";

const wd = (id: string) => ({ value: `http://www.wikidata.org/entity/${id}` });
const file = (name: string) => ({ value: `http://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}` });
const row = (system: string, label: string, kind: string, dist: number, maps: { route?: string; detail?: string }) => ({
  system: wd(system),
  systemLabel: { value: label },
  kind: wd(kind),
  dist: { value: String(dist) },
  ...(maps.route ? { route: file(maps.route) } : {}),
  ...(maps.detail ? { detail: file(maps.detail) } : {}),
});

describe("transit maps", () => {
  it("asks Wikidata for whole networks around the Stop", () => {
    const query = transitMapsQuery({ latitude: 38.7223, longitude: -9.1393 });
    expect(query).toContain('"Point(-9.1393 38.7223)"');
    expect(query).toContain("wd:Q5503");
    expect(query).toContain("wdt:P15");
  });

  it("keeps one map per network, closest first, the route map preferred", () => {
    const candidates = parseTransitMapsResults({
      results: {
        bindings: [
          row("Q50716", "métro de Paris", "Q5503", 0, { route: "Paris Metro map complete.svg", detail: "Carte Métro de Paris.jpg" }),
          row("Q50716", "métro de Paris", "Q5503", 3.2, { route: "Paris Metro map complete.svg" }),
          row("Q1135", "CDGVAL", "Q1268865", 10.7, { detail: "Carte Lignes CDGVAL.svg" }),
          row("Q999", "Q999", "Q5503", 1, { route: "Untitled.svg" }),
          row("Q42", "ligne 1", "Q15079663", 0.5, { route: "Ligne 1.svg" }),
        ],
      },
    });
    expect(candidates).toEqual([
      { networkId: "Q50716", name: "Métro de Paris", kind: "metro", fileName: "Paris Metro map complete.svg", distanceKm: 0 },
      { networkId: "Q1135", name: "CDGVAL", kind: "light-rail", fileName: "Carte Lignes CDGVAL.svg", distanceKm: 10.7 },
    ]);
    expect(parseTransitMapsResults({ error: "timeout" })).toEqual([]);
  });

  it("reads the rendered map and its credits from Commons", () => {
    expect(parseCommonsImageInfo({
      query: { pages: { "-1": { imageinfo: [{
        thumburl: "https://upload.wikimedia.org/thumb/paris.png",
        thumbwidth: 3840,
        thumbheight: 3527,
        descriptionurl: "https://commons.wikimedia.org/wiki/File:Paris_Metro_map_complete.svg",
        extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, Artist: { value: '<a href="//x">Metropolitan</a>, Pmx (<a href="//y">nojhan</a>)' }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" } },
      }] } } },
    })).toEqual({
      url: "https://upload.wikimedia.org/thumb/paris.png",
      width: 3840,
      height: 3527,
      author: "Metropolitan, Pmx (nojhan)",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Paris_Metro_map_complete.svg",
    });
    expect(parseCommonsImageInfo({ query: { pages: { "-1": {} } } })).toBeNull();
  });
});
