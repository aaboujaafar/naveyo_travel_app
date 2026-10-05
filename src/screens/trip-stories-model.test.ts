import { describe, expect, it } from "vitest";
import type { ItineraryItem, Stop, TrackPoint } from "../modules/_shared/model";
import { itineraryItem, stop, trackPoint } from "../modules/__fixtures__/domain";
import {
  buildStorySlides,
  buildTripTrace,
  projectTrace,
  suggestTripPhotos,
  traceProgressAt,
  type StoryPhoto,
} from "./trip-stories-model";

const lisbon: Stop = { ...stop, name: "Lisbonne", startDate: "2026-11-16", endDate: "2026-11-18", coordinates: { latitude: 38.71, longitude: -9.14 } };
const track = (latitude: number, longitude: number, recordedAt: string): TrackPoint => ({ ...trackPoint, idempotencyKey: recordedAt, latitude, longitude, recordedAt: recordedAt as TrackPoint["recordedAt"] });
const photo = (id: string, iso: string, location?: StoryPhoto["location"]): StoryPhoto => ({ id, uri: `file:///${id}.jpg`, takenAt: Date.parse(iso), location });

describe("trip stories", () => {
  it("prefers the recorded trace, then planned places, then Étapes", () => {
    const recorded = buildTripTrace({
      trackPoints: [track(38.72, -9.13, "2026-11-16T12:00:00Z"), track(38.71, -9.14, "2026-11-16T10:00:00Z")],
      itinerary: [],
      stops: [lisbon],
    });
    expect(recorded.map((point) => point.latitude)).toEqual([38.71, 38.72]);

    const place = (date: string, latitude: number): ItineraryItem => ({ ...itineraryItem, date, time: undefined, place: { kind: "venue", label: "Lieu", coordinates: { latitude, longitude: -9.1 } } });
    expect(buildTripTrace({ trackPoints: [], itinerary: [place("2026-11-17", 2), place("2026-11-16", 1)], stops: [] }).map((point) => point.latitude)).toEqual([1, 2]);
    expect(buildTripTrace({ trackPoints: [], itinerary: [], stops: [lisbon] })).toHaveLength(1);
  });

  it("projects the trace inside the box, north at the top", () => {
    const { path, project } = projectTrace([{ latitude: 38.7, longitude: -9.2 }, { latitude: 38.8, longitude: -9.1 }], { width: 100, height: 200, padding: 10 });
    expect(path.startsWith("M")).toBe(true);
    const south = project({ latitude: 38.7, longitude: -9.2 });
    const north = project({ latitude: 38.8, longitude: -9.1 });
    expect(north.y).toBeLessThan(south.y);
    for (const point of [south, north]) {
      expect(point.x).toBeGreaterThanOrEqual(10);
      expect(point.x).toBeLessThanOrEqual(90);
    }
  });

  it("suggests photos of the Voyage near the trace, spread across days", () => {
    const trace = [{ latitude: 38.71, longitude: -9.14 }];
    const result = suggestTripPhotos(
      [
        photo("before", "2026-11-15T12:00:00Z"),
        photo("day1-a", "2026-11-16T09:00:00Z", { latitude: 38.72, longitude: -9.13 }),
        photo("day1-b", "2026-11-16T10:00:00Z"),
        photo("day1-c", "2026-11-16T11:00:00Z"),
        photo("far", "2026-11-16T12:00:00Z", { latitude: 48.85, longitude: 2.35 }),
        photo("day2", "2026-11-17T09:00:00Z"),
      ],
      { startsOn: "2026-11-16", endsOn: "2026-11-18", timeZone: "Europe/Lisbon", trace, max: 2 },
    );
    expect(result.photos.map((item) => item.id)).toEqual(["day1-a", "day1-b", "day1-c", "day2"]);
    expect(result.preselectedIds).toEqual(["day1-a", "day2"]);
  });

  it("places each photo along the trace and names its Étape", () => {
    const trace = [
      { latitude: 1, longitude: 1, at: Date.parse("2026-11-16T09:00:00Z") },
      { latitude: 2, longitude: 2, at: Date.parse("2026-11-16T12:00:00Z") },
    ];
    expect(traceProgressAt(trace, Date.parse("2026-11-16T10:00:00Z"))).toBe(0.5);
    const slides = buildStorySlides({
      title: "Lisbonne",
      dates: "16 – 18 novembre",
      summaryLines: ["3 jours"],
      photos: [photo("p", "2026-11-17T15:00:00Z")],
      trace,
      stops: [lisbon],
      timeZone: "Europe/Lisbon",
    });
    expect(slides.map((slide) => slide.kind)).toEqual(["cover", "photo", "summary"]);
    expect(slides[1]).toMatchObject({ caption: "Lisbonne · 17 nov.", traceProgress: 1 });
  });
});
