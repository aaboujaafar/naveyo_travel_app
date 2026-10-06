import { describe, expect, it } from "vitest";
import { photosDuringTrip, selectAlbumPhotos, type AlbumPhotoInput } from "./album-photos-model";

const lisbon = { id: "s1", name: "Lisbonne", startDate: "2026-11-16", endDate: "2026-11-18", timeZone: "Europe/Lisbon", coordinates: { latitude: 38.7223, longitude: -9.1393 } };
const porto = { id: "s2", name: "Porto", startDate: "2026-11-19", endDate: "2026-11-20", timeZone: "Europe/Lisbon", coordinates: { latitude: 41.1579, longitude: -8.6291 } };
const SINTRA = { latitude: 38.7976, longitude: -9.3907 };
const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const PORTO = { latitude: 41.1496, longitude: -8.6110 };
const at = (iso: string) => Date.parse(iso);
const photo = (id: string, iso: string, extra: Partial<AlbumPhotoInput> = {}): AlbumPhotoInput => ({ id, uri: `ph://${id}`, takenAt: at(iso), width: 4032, height: 3024, ...extra });

describe("album photo selection", () => {
  it("keeps the photos of the Voyage, dated in the Étape's local time", () => {
    const { days, outsideTrip } = selectAlbumPhotos([
      photo("before", "2026-11-15T20:00:00Z"),
      // 23:30 UTC is 23:30 in Lisbon in November: still the 16th.
      photo("late", "2026-11-16T23:30:00Z"),
      photo("porto", "2026-11-19T10:00:00Z"),
      photo("after", "2026-11-21T09:00:00Z"),
    ], [porto, lisbon]);
    expect(outsideTrip).toBe(2);
    expect(days.map((day) => [day.date, day.dayNumber, day.stopName, day.selected.map((item) => item.id)])).toEqual([
      ["2026-11-16", 1, "Lisbonne", ["late"]],
      ["2026-11-19", 4, "Porto", ["porto"]],
    ]);
  });

  it("sets aside screenshots and pictures too small to print", () => {
    const [day] = selectAlbumPhotos([
      photo("shot", "2026-11-17T09:00:00Z", { mediaSubtypes: ["screenshot"] }),
      photo("whatsapp", "2026-11-17T10:00:00Z", { width: 1280, height: 960 }),
      photo("good", "2026-11-17T11:00:00Z", { mediaSubtypes: ["hdr"] }),
    ], [lisbon]).days;
    expect(day!.selected.map((item) => item.id)).toEqual(["good"]);
    expect(day!.setAside.map((item) => [item.photo.id, item.reason])).toEqual([["shot", "screenshot"], ["whatsapp", "too-small"]]);
  });

  it("spreads a day, favours favourites and skips near-duplicates", () => {
    const burst = ["09:00:00", "09:00:02", "09:00:04"].map((time, index) => photo(`burst${index}`, `2026-11-17T${time}Z`));
    const rest = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time) => photo(`p${time.slice(0, 2)}`, `2026-11-17T${time}:00Z`));
    const favourite = photo("fav", "2026-11-17T12:30:00Z", { isFavorite: true });
    const [day] = selectAlbumPhotos([...burst, ...rest, favourite], [lisbon], { perDay: 4 }).days;
    // The burst counts once (its middle shot), the favourite always stays.
    expect(day!.selected.map((item) => item.id)).toEqual(["burst1", "fav", "p14", "p18"]);
    expect(day!.setAside.filter((item) => item.reason === "duplicate").map((item) => item.photo.id)).toEqual(["burst0", "burst2"]);
    expect(day!.setAside.filter((item) => item.reason === "day-full")).toHaveLength(7);
  });

  it("keeps photos near the day's Étape, or the next one on a travel day", () => {
    const { days } = selectAlbumPhotos([
      photo("sintra", "2026-11-17T11:00:00Z", { location: SINTRA }),
      photo("paris", "2026-11-16T06:00:00Z", { location: PARIS }),
      photo("noGps", "2026-11-17T15:00:00Z"),
      // Last day in Lisbon, already on the way to Porto.
      photo("arrival", "2026-11-18T19:00:00Z", { location: PORTO }),
    ], [lisbon, porto]);
    expect(days.flatMap((day) => day.selected.map((item) => item.id))).toEqual(["sintra", "noGps", "arrival"]);
    expect(days[0]!.setAside.map((item) => [item.photo.id, item.reason])).toEqual([["paris", "far-away"]]);
  });

  it("uses Vision to drop utility and failed shots and keep the best of a scene", () => {
    const [day] = selectAlbumPhotos([
      photo("receipt", "2026-11-17T09:00:00Z", { analysis: { utility: true, score: 0.2 } }),
      photo("blurred", "2026-11-17T10:00:00Z", { analysis: { score: -0.7 } }),
      photo("blurredFav", "2026-11-17T10:30:00Z", { isFavorite: true, analysis: { score: -0.7 } }),
      // Same view a minute apart: Vision groups them, the sharper one wins.
      photo("view1", "2026-11-17T12:00:00Z", { analysis: { score: 0.1, similarGroup: 7 } }),
      photo("view2", "2026-11-17T12:01:00Z", { analysis: { score: 0.6, similarGroup: 7 } }),
    ], [lisbon]).days;
    expect(day!.selected.map((item) => item.id)).toEqual(["blurredFav", "view2"]);
    expect(day!.setAside.map((item) => [item.photo.id, item.reason])).toEqual([
      ["receipt", "utility"],
      ["blurred", "low-quality"],
      ["view1", "duplicate"],
    ]);
  });

  it("keeps the shot iOS picked in a burst", () => {
    const [day] = selectAlbumPhotos([
      photo("b1", "2026-11-17T09:00:00Z", { burstId: "B" }),
      photo("b2", "2026-11-17T09:00:30Z", { burstId: "B", burstPick: true }),
      photo("b3", "2026-11-17T09:01:00Z", { burstId: "B" }),
    ], [lisbon]).days;
    expect(day!.selected.map((item) => item.id)).toEqual(["b2"]);
  });

  it("lists the photos taken during the Voyage, and copes with any number per day", () => {
    const photos = [photo("after", "2026-11-25T09:00:00Z"), photo("b", "2026-11-17T12:00:00Z"), photo("a", "2026-11-16T12:00:00Z")];
    expect(photosDuringTrip(photos, [lisbon]).map((item) => item.id)).toEqual(["a", "b"]);
    expect(selectAlbumPhotos(photos, [lisbon], { perDay: Number.MAX_SAFE_INTEGER }).days.flatMap((day) => day.selected.map((item) => item.id))).toEqual(["a", "b"]);
  });

  it("follows the traveller's choices", () => {
    const photos = [photo("a", "2026-11-17T09:00:00Z"), photo("b", "2026-11-17T12:00:00Z"), photo("shot", "2026-11-17T15:00:00Z", { mediaSubtypes: ["screenshot"] })];
    const [day] = selectAlbumPhotos(photos, [lisbon], { perDay: 1, overrides: { added: ["shot"], removed: ["a"] } }).days;
    expect(day!.selected.map((item) => item.id)).toEqual(["shot"]);
    expect(day!.setAside.map((item) => [item.photo.id, item.reason])).toEqual([["a", "removed"], ["b", "day-full"]]);
  });
});
