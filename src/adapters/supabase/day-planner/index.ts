import type {
  DayPlanInput,
  DayPlanDraft,
  DayPlanner,
} from "../../../modules/day-planner";
import { parseDayPlanDraft } from "../../../modules/day-planner";
import type { SupabaseClientLike } from "../identity/client";

type ErrorBody = {
  draft?: unknown;
  error?: unknown;
  message?: unknown;
};

const serviceError = (status: number): Error =>
  new Error(`Day planner service returned ${status}`);

const parseResponseBody = (rawBody: string, status: number): unknown => {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw serviceError(status);
  }
};

const errorMessage = (body: unknown, status: number): string => {
  if (body && typeof body === "object") {
    const responseBody = body as ErrorBody;
    if (typeof responseBody.error === "string" && responseBody.error.length > 0)
      return responseBody.error;
    if (typeof responseBody.message === "string" && responseBody.message.length > 0)
      return responseBody.message;
  }
  return serviceError(status).message;
};

export const createSupabaseDayPlanner = (
  client: SupabaseClientLike,
  endpoint = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""}/functions/v1/day-plan`,
): DayPlanner => ({
  async composeDay(input: DayPlanInput): Promise<DayPlanDraft> {
    const session = await client.auth.getSession();
    if (session.error || !session.data?.session?.access_token)
      throw new Error("Authentication is required for day planning");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
        Authorization: `Bearer ${session.data.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const body = parseResponseBody(await response.text(), response.status);

    if (!response.ok) throw new Error(errorMessage(body, response.status));
    return parseDayPlanDraft((body as ErrorBody).draft);
  },
});

export type { SupabaseClientLike } from "../identity/client";
