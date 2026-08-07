import { createSupabaseIdentityModule } from "../adapters/supabase/identity";
import { createSupabaseTripsModule } from "../adapters/supabase/trips";
import { createSupabaseClient } from "./supabase";

export function createAppModules() {
  const client = createSupabaseClient();
  const identity = createSupabaseIdentityModule(client);
  const trips = createSupabaseTripsModule(client, () => true);
  return { identity, trips };
}
