import { describe, expect, it } from "vitest";
import type { UUID } from "../_shared/model";
import { place } from "../__fixtures__/domain";
import { isWished, rankWishes, type Wish } from ".";

const me = "00000000-0000-4000-8000-0000000000a1" as UUID;
const sam = "00000000-0000-4000-8000-0000000000a2" as UUID;
const wish = (id: string, votes: Wish["votes"], createdAt = "2026-10-05T10:00:00.000Z"): Wish => ({
  id: id as UUID, tripId: "t" as UUID, place: { ...place, id: id as UUID }, addedBy: me, createdAt, votes,
});

describe("wish list", () => {
  it("puts the places both members like first", () => {
    const ranked = rankWishes([
      wish("a", [{ accountId: sam, vote: -1 }]),
      wish("b", [{ accountId: me, vote: 1 }, { accountId: sam, vote: 1 }]),
      wish("c", [], "2026-10-05T09:00:00.000Z"),
      wish("d", []),
    ], me);
    expect(ranked.map((item) => [item.id, item.score, item.myVote])).toEqual([
      ["b", 2, 1],
      ["c", 0, 0],
      ["d", 0, 0],
      ["a", -1, 0],
    ]);
  });

  it("recognises a place already wished", () => {
    const wishes = [wish("a", [])];
    expect(isWished(wishes, { id: "a" as UUID })).toBe(true);
    expect(isWished(wishes, { id: "z" as UUID, providerPlaceId: place.providerPlaceId })).toBe(place.providerPlaceId !== undefined);
    expect(isWished(wishes, { id: "z" as UUID })).toBe(false);
  });
});
