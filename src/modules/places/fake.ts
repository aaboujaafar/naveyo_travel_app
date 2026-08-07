import type { PlaceCandidate, UUID } from "../_shared/model";
import type { PlaceSearchInput, PlacesProvider } from "./interface";

export class FakePlacesProvider implements PlacesProvider {
  public readonly searches: PlaceSearchInput[] = [];

  constructor(
    private readonly candidates: PlaceCandidate[],
    private readonly failure?: Error,
  ) {}

  async search(input: PlaceSearchInput): Promise<PlaceCandidate[]> {
    this.searches.push(input);
    if (this.failure) throw this.failure;
    const query = input.query.toLowerCase();
    return this.candidates.filter((candidate) => {
      const matchesQuery =
        query.length === 0 ||
        candidate.name.toLowerCase().includes(query) ||
        candidate.address?.toLowerCase().includes(query) === true;
      const matchesCountry =
        !input.countryCode || candidate.countryCode === input.countryCode;
      const matchesType =
        !input.type ||
        candidate.category?.toLowerCase().includes(input.type) === true;
      return matchesQuery && matchesCountry && matchesType;
    });
  }

  async getById(id: UUID): Promise<PlaceCandidate | null> {
    if (this.failure) throw this.failure;
    return this.candidates.find((candidate) => candidate.id === id) ?? null;
  }
}
