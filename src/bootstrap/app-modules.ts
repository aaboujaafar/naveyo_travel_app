import * as FileSystem from "expo-file-system/legacy";
import { createSupabaseIdentityModule } from "../adapters/supabase/identity";
import {
  createSupabaseDocumentsModule,
  type SupabaseDocumentsClientLike,
} from "../adapters/supabase/documents";
import { createSupabaseTripsModule } from "../adapters/supabase/trips";
import { createSupabaseTripAssistant } from "../adapters/supabase/trip-assistant";
import { createGeoapifyPlacesProvider } from "../adapters/geoapify";
import { Places } from "../modules/places";
import { InMemoryItineraryModule } from "../modules/itinerary/in-memory";
import { Expenses } from "../modules/expenses/module";
import { InMemoryExpensesStore } from "../modules/expenses/store";
import { InMemoryTripPackFileStore } from "../adapters/sqlite/in-memory-file-store";
import { InMemoryTripPackStore } from "../adapters/sqlite/in-memory-trip-pack-store";
import { OfflineTripPack } from "../modules/offline-trip-pack/module";
import { createExpoLocationTrackingModule } from "../adapters/expo-location";
import type { TripTrackingModule } from "../modules/trip-tracking";
import { createAppleReservationAnalyzer } from "../adapters/apple-document-analysis";
import { createReactNativeInvitationShareAdapter } from "../adapters/invitation-sharing";
import { createInvitationSharingModule } from "../modules/invitation-sharing";
import { sharedLocalReservations } from "./reservations";
import { createSupabaseClient } from "./supabase";

export function createAppModules() {
  const client = createSupabaseClient();
  const identity = createSupabaseIdentityModule(client);
  const invitationSharing = createInvitationSharingModule(
    createReactNativeInvitationShareAdapter(),
  );
  const trips = createSupabaseTripsModule(client, () => true);
  const tripAssistant = createSupabaseTripAssistant(client);
  const placesProvider = createGeoapifyPlacesProvider(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""}/functions/v1/places`,
    async () => (await client.auth.getSession()).data?.session?.access_token ?? null,
  );
  const places = new Places(placesProvider);
  const itinerary = new InMemoryItineraryModule();
  const expenses = new Expenses(new InMemoryExpensesStore(), {
    async convert(input) {
      if (input.amount.currency !== input.targetCurrency) {
        throw new Error("Exchange rate provider is not configured for this currency");
      }
      return {
        original: input.amount,
        converted: input.amount,
        source: "not-applicable",
        rateDate: input.on,
      };
    },
  });
  const offlineTripPack = new OfflineTripPack(
    new InMemoryTripPackStore(),
    new InMemoryTripPackFileStore(),
  );
  const nativeTripTracking = createExpoLocationTrackingModule();
  const tripTracking: TripTrackingModule = {
    tracker: nativeTripTracking.tracker,
    list: nativeTripTracking.list,
    async append(point) {
      const status = await nativeTripTracking.tracker.getStatus();
      if (!status.tripId) {
        throw new Error("No active trip is available for this tracking point");
      }
      await nativeTripTracking.append(status.tripId, point);
    },
  };
  const documents = createSupabaseDocumentsModule(
    client as unknown as SupabaseDocumentsClientLike,
    persistDownloadedDocument,
  );
  return {
    identity,
    invitationSharing,
    trips,
    itinerary,
    places,
    tripAssistant,
    reservations: sharedLocalReservations,
    reservationAnalyzer: createAppleReservationAnalyzer(),
    documents,
    expenses,
    offlineTripPack,
    tripTracking,
  };
}

async function persistDownloadedDocument(input: {
  data: Blob;
  storagePath: string;
  fileName?: string;
}): Promise<string> {
  const directory = `${FileSystem.documentDirectory ?? ""}naveyo-documents/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const safeName = (input.fileName ?? input.storagePath.split("/").at(-1) ?? "document")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const target = `${directory}${safeName}`;
  const bytes = new Uint8Array(await input.data.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  await FileSystem.writeAsStringAsync(target, btoa(binary), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return target;
}
