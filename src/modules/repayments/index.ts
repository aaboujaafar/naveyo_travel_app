import type { Money, UUID } from "../_shared/model";

export interface RecordedRepayment {
  id: UUID;
  tripId: UUID;
  from: UUID;
  to: UUID;
  amount: Money;
  recordedBy: UUID;
  createdAt: string;
}

export interface RepaymentsModule {
  list(tripId: UUID): Promise<RecordedRepayment[]>;
  record(input: { tripId: UUID; from: UUID; to: UUID; amount: Money }): Promise<void>;
  remove(tripId: UUID, repaymentId: UUID): Promise<void>;
}
