import type { DocumentsModule } from '../modules/documents'
import type { ExpensesModule } from '../modules/expenses'
import type { IdentityModule } from '../modules/identity'
import type { InvitationSharingModule } from '../modules/invitation-sharing'
import type { ItineraryModule } from '../modules/itinerary'
import { OfflineTripPack } from '../modules/offline-trip-pack/module'
import type { OfflineTripPackModule, OfflineTripPackStore, TripPackFileStore } from '../modules/offline-trip-pack'
import type { PlacesModule } from '../modules/places'
import type {
  DocumentAnalyzer,
  OnDeviceReservationAnalyzer,
  ReservationDocumentTextExtractor,
  ReservationImportInbox,
  ReservationTextAnalyzer,
  ReservationsModule,
} from '../modules/reservations'
import type { TripAssistantModule } from '../modules/trip-assistant'
import type { DayPlanner } from '../modules/day-planner'
import type { TripTrackingModule } from '../modules/trip-tracking'
import type { TripsModule } from '../modules/trips'
import type { UUID } from '../modules/_shared/model'
import type { WeatherModule } from '../modules/weather'
import type { RoutingModule } from '../modules/routing'
import type { PackingListModule } from '../modules/packing-list/interface'
import type { TripProfilesModule } from '../modules/trip-profiles'
import type { WishlistModule } from '../modules/wishlist'
import type { TransitMapsModule } from '../modules/transit-maps'
import type { RepaymentsModule } from '../modules/repayments'
import type { LogisticsWaiversModule } from '../modules/logistics'
import type { TripChecksModule } from '../modules/trip-checks'

/**
 * The application boundary consumed by routes and UI composition.
 *
 * Modules are supplied by the composition root so routes never construct a
 * provider, persistence adapter, or fake themselves.
 */
export interface NaveyoModules {
  identity: IdentityModule
  invitationSharing: InvitationSharingModule
  trips: TripsModule
  itinerary: ItineraryModule
  places: PlacesModule
  tripAssistant: TripAssistantModule
  /** AI-101 day composition is optional in older deterministic test bootstraps. */
  dayPlanner?: DayPlanner
  reservations: ReservationsModule
  reservationImportInbox?: ReservationImportInbox
  reservationTextExtractor?: ReservationDocumentTextExtractor
  reservationTextAnalyzer?: ReservationTextAnalyzer
  /** Apple Intelligence analysis, tried before any remote call. */
  reservationOnDeviceAnalyzer?: OnDeviceReservationAnalyzer
  documents: DocumentsModule
  expenses: ExpensesModule
  offlineTripPack: OfflineTripPackModule
  tripTracking: TripTrackingModule
  weather: WeatherModule
  routing?: RoutingModule
  packingList: PackingListModule
  tripProfiles?: TripProfilesModule
  wishlist?: WishlistModule
  transitMaps?: TransitMapsModule
  repayments?: RepaymentsModule
  logisticsWaivers?: LogisticsWaiversModule
  tripChecks?: TripChecksModule
  /** Native analyzer is optional while OCR-001 is not available in a build. */
  reservationAnalyzer?: DocumentAnalyzer
}

export interface NaveyoBootstrap {
  modules: NaveyoModules
  /** The currently selected Voyage, restored by the identity/navigation adapter. */
  currentTripId?: UUID
}

export interface OfflineTripPackDependencies {
  store: OfflineTripPackStore
  files: TripPackFileStore
}

/** Build the production offline module behind its SQLite/file seams. */
export const createOfflineTripPackModule = ({ store, files }: OfflineTripPackDependencies): OfflineTripPackModule =>
  new OfflineTripPack(store, files)

/**
 * Compose the modules once at the application boundary.
 *
 * The same entry point accepts production modules and deterministic fakes,
 * which keeps integration tests on the public module interfaces.
 */
export const createNaveyoBootstrap = (modules: NaveyoModules, currentTripId?: UUID): NaveyoBootstrap => ({
  modules: Object.freeze(modules),
  currentTripId,
})

export { NaveyoBootstrapProvider, useNaveyoBootstrap } from './context'
export {
  confirmReservationImport,
  loadAppStart,
  loadItineraryView,
  loadPlacesView,
  loadStopDocuments,
  loadTrackingView,
  loadTripWorkspace,
  moveDocumentToStop,
  startTripTracking,
  stopTripTracking,
} from './integration'
export type {
  AppStart,
  ItineraryView,
  PlacesView,
  ReservationImportView,
  StopDocumentsView,
  TrackingView,
  TripWorkspace,
} from './integration'
