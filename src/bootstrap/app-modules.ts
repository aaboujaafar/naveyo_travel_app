import { createSupabaseIdentityModule } from "../adapters/supabase/identity";
import { createSupabaseTripsModule } from "../adapters/supabase/trips";
import { createSupabaseTripAssistant } from "../adapters/supabase/trip-assistant";
import { createSupabaseClient } from "./supabase";

export function createAppModules() {
  const client = createSupabaseClient();
  const identity = createSupabaseIdentityModule(client);
  const trips = createSupabaseTripsModule(client, () => true);
  const tripAssistant = createSupabaseTripAssistant(client);
  return { identity, trips, tripAssistant };
}
