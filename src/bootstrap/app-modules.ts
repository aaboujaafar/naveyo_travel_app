import * as FileSystem from "expo-file-system/legacy";
import { createSupabaseIdentityModule } from "../adapters/supabase/identity";
import {
  createSupabaseDocumentsModule,
  type SupabaseDocumentsClientLike,
} from "../adapters/supabase/documents";
import { createSupabaseTripsModule } from "../adapters/supabase/trips";
import { createSupabaseTripAssistant } from "../adapters/supabase/trip-assistant";
import { createSupabaseDayPlanner } from "../adapters/supabase/day-planner";
import {
  createGeoapifyPlacesProvider,
  createGeoapifyRoutingProvider,
} from "../adapters/geoapify";
import { Places } from "../modules/places";
import { createSupabaseItineraryModule } from "../adapters/supabase/itinerary";
import { createSupabaseExpensesStore } from "../adapters/supabase/expenses";
import { Expenses } from "../modules/expenses/module";
import { InMemoryTripPackFileStore } from "../adapters/sqlite/in-memory-file-store";
import { fileTripPackStore } from "../adapters/file-system/trip-pack-store";
import { createSupabaseTripProfilesModule } from "../adapters/supabase/trip-profiles";
import { createSupabaseWishlistModule } from "../adapters/supabase/wishlist";
import { createWikimediaTransitMapsModule } from "../adapters/wikimedia/transit-maps";
import { createSupabaseRepaymentsModule } from "../adapters/supabase/repayments";
import { createSupabaseLogisticsWaiversModule } from "../adapters/supabase/logistics";
import { createSupabaseTripChecksModule } from "../adapters/supabase/trip-checks";
import { OfflineTripPack } from "../modules/offline-trip-pack/module";
import { createExpoLocationTrackingModule } from "../adapters/expo-location";
import type { TripTrackingModule } from "../modules/trip-tracking";
import {
  createAppleDocumentTextExtractor,
  createAppleOnDeviceReservationAnalyzer,
  createAppleReservationAnalyzer,
  createAppleShareInbox,
} from "../adapters/apple-document-analysis";
import { createRemoteDocumentAnalyzer } from "../adapters/ai-document-analysis";
import { createReactNativeInvitationShareAdapter } from "../adapters/invitation-sharing";
import { createInvitationSharingModule } from "../modules/invitation-sharing";
import { sharedLocalReservations } from "./reservations";
import { createSupabaseClient } from "./supabase";
import { Weather } from "../modules/weather";
import { createOpenMeteoWeatherProvider } from "../adapters/open-meteo";
import { Routing } from "../modules/routing";
import { createSupabasePackingListModule } from "../adapters/supabase/packing-list";

export function createAppModules() {
  const client = createSupabaseClient();
  const identity = createSupabaseIdentityModule(client);
  const invitationSharing = createInvitationSharingModule(
    createReactNativeInvitationShareAdapter(),
  );
  const trips = createSupabaseTripsModule(client, () => true);
  const packingList = createSupabasePackingListModule(client);
  const tripProfiles = createSupabaseTripProfilesModule(client);
  const wishlist = createSupabaseWishlistModule(client);
  const transitMaps = createWikimediaTransitMapsModule();
  const repayments = createSupabaseRepaymentsModule(client);
  const logisticsWaivers = createSupabaseLogisticsWaiversModule(client);
  const tripChecks = createSupabaseTripChecksModule(client);
  const weather = new Weather(createOpenMeteoWeatherProvider());
  const tripAssistant = createSupabaseTripAssistant(client);
  const dayPlanner = createSupabaseDayPlanner(client);
  const placesProvider = createGeoapifyPlacesProvider(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""}/functions/v1/places-search`,
    async () => (await client.auth.getSession()).data?.session?.access_token ?? null,
  );
  const places = new Places(placesProvider);
  const routing = new Routing(createGeoapifyRoutingProvider(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""}/functions/v1/route`,
    async () => (await client.auth.getSession()).data?.session?.access_token ?? null,
  ));
  const itinerary = createSupabaseItineraryModule(client);
  const expenses = new Expenses(createSupabaseExpensesStore(client), {
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
    fileTripPackStore,
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
    dayPlanner,
    reservations: sharedLocalReservations,
    reservationImportInbox: createAppleShareInbox(),
    reservationTextExtractor: createAppleDocumentTextExtractor(),
    reservationTextAnalyzer: createRemoteDocumentAnalyzer(client),
    reservationOnDeviceAnalyzer: createAppleOnDeviceReservationAnalyzer(),
    reservationAnalyzer: createAppleReservationAnalyzer(),
    documents,
    expenses,
    offlineTripPack,
    tripTracking,
    weather,
    routing,
    packingList,
    tripProfiles,
    wishlist,
    transitMaps,
    repayments,
    logisticsWaivers,
    tripChecks,
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
