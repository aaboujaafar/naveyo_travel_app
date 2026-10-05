import type { PlaceCandidate, UUID } from "../_shared/model";

export interface Wish {
  id: UUID;
  tripId: UUID;
  stopId?: UUID;
  place: PlaceCandidate;
  addedBy: UUID;
  createdAt: string;
  votes: { accountId: UUID; vote: 1 | -1 }[];
}

export interface WishlistModule {
  list(tripId: UUID): Promise<Wish[]>;
  add(input: { tripId: UUID; stopId?: UUID; place: PlaceCandidate }): Promise<void>;
  remove(tripId: UUID, wishId: UUID): Promise<void>;
  /** 0 withdraws the current member's vote. */
  vote(wishId: UUID, vote: 1 | -1 | 0): Promise<void>;
}

export interface RankedWish extends Wish {
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | 0;
}

/** Favourites first: highest score, then most likes, then the oldest wish. */
export function rankWishes(wishes: readonly Wish[], currentAccountId: UUID | null): RankedWish[] {
  return wishes
    .map((wish): RankedWish => {
      const likes = wish.votes.filter((vote) => vote.vote === 1).length;
      const dislikes = wish.votes.filter((vote) => vote.vote === -1).length;
      const mine: 1 | -1 | 0 = wish.votes.find((vote) => vote.accountId === currentAccountId)?.vote ?? 0;
      return { ...wish, likes, dislikes, score: likes - dislikes, myVote: mine };
    })
    .sort((left, right) => right.score - left.score || right.likes - left.likes || left.createdAt.localeCompare(right.createdAt));
}

/** Whether a place is already on the list, matched by its candidate id or its provider id. */
export function isWished(wishes: readonly Wish[], place: Pick<PlaceCandidate, "id" | "providerPlaceId">): boolean {
  return wishes.some((wish) => wish.place.id === place.id || (place.providerPlaceId !== undefined && wish.place.providerPlaceId === place.providerPlaceId));
}
