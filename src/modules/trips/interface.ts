import type { Stop, Trip, TripInvitation, UUID } from "../_shared/model";

export interface CreateTripInput {
  name: string;
  referenceCurrency: Trip["referenceCurrency"];
  travelerIds?: UUID[];
  startsOn?: string;
  endsOn?: string;
}

export interface UpdateTripInput {
  name?: string;
  referenceCurrency?: Trip["referenceCurrency"];
  startsOn?: string;
  endsOn?: string;
}

export interface AddTripMemberInput {
  accountId: UUID;
  role?: "editor";
}

export interface CreateTripInvitationInput {
  tripId: UUID;
  email?: string;
}

export interface TripsModule {
  get(tripId: UUID): Promise<Trip | null>;
  list(): Promise<Trip[]>;
  create(input: CreateTripInput): Promise<Trip>;
  update(tripId: UUID, input: UpdateTripInput): Promise<Trip>;
  addMember(tripId: UUID, input: AddTripMemberInput): Promise<void>;
  createInvitation(input: CreateTripInvitationInput): Promise<TripInvitation>;
  acceptInvitation(token: UUID): Promise<TripInvitation>;
  listStops(tripId: UUID): Promise<Stop[]>;
  createStop(input: Omit<Stop, "id">): Promise<Stop>;
  updateStop?(stopId: UUID, input: Partial<Omit<Stop, "id" | "tripId">>): Promise<Stop>;
}
