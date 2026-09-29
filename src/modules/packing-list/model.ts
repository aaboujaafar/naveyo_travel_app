import type { ISODateTime, UUID } from "../_shared/model";

export type PackingCategory =
  | "documents"
  | "clothing"
  | "toiletries"
  | "electronics"
  | "health"
  | "other";

export interface PackingItem {
  id: UUID;
  tripId: UUID;
  stopId?: UUID;
  label: string;
  category: PackingCategory;
  quantity: number;
  packed: boolean;
  assignedTo?: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface AddPackingItemInput {
  tripId: UUID;
  stopId?: UUID;
  label: string;
  category: PackingCategory;
  quantity?: number;
  assignedTo?: UUID;
}

export interface UpdatePackingItemInput {
  label?: string;
  category?: PackingCategory;
  quantity?: number;
  packed?: boolean;
  stopId?: UUID | null;
  assignedTo?: UUID | null;
}

export interface PackingProgress {
  packed: number;
  total: number;
  ratio: number;
}
