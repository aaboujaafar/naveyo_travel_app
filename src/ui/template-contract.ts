export type TemplateCoverage = "exact" | "scoped" | "missing";

export interface TemplateContract {
  readonly id: string;
  readonly label: string;
  readonly routes: readonly string[];
  readonly template: string | null;
  readonly coverage: TemplateCoverage;
  readonly excludedSections: readonly string[];
}

export const v0TemplateContracts = [
  {
    id: "trip-create",
    label: "Création de Voyage",
    routes: ["/(app)/trips/new"],
    template: "02-create-trip.html",
    coverage: "scoped",
    excludedSections: [
      "photo de couverture",
      "modèles rapides",
      "type de voyage",
      "notes",
      "packing list",
      "documents d'identité",
    ],
  },
  {
    id: "trip-invite",
    label: "Invitation",
    routes: ["/(app)/trips/[tripId]/invite", "/(app)/invite"],
    template: "03-invite-family.html",
    coverage: "scoped",
    excludedSections: ["rôles personnalisables"],
  },
  {
    id: "trip-dashboard",
    label: "Tableau de bord du Voyage",
    routes: ["/(app)", "/(app)/trips/[tripId]"],
    template: "04-trip-dashboard.html",
    coverage: "exact",
    excludedSections: [],
  },
  {
    id: "trip-assistant",
    label: "Suggestions IA",
    routes: ["/(app)/trips/[tripId]/assistant"],
    template: "05-ai-explore.html",
    coverage: "scoped",
    excludedSections: ["chatbot générique"],
  },
  {
    id: "place-detail",
    label: "Détail d'un lieu",
    routes: ["/(app)/places"],
    template: "06-place-detail.html",
    coverage: "scoped",
    excludedSections: ["avis inventés", "réservation automatique"],
  },
  {
    id: "expenses",
    label: "Budget et Dépenses",
    routes: ["/(app)/trips/[tripId]/expenses"],
    template: "11-budget.html",
    coverage: "scoped",
    excludedSections: ["split", "dettes", "remboursements"],
  },
  {
    id: "itinerary-map",
    label: "Carte, itinéraire et Trace",
    routes: [
      "/(app)/trips/[tripId]/itinerary",
      "/(app)/trips/[tripId]/tracking",
    ],
    template: "12-carte-itineraire.html",
    coverage: "scoped",
    excludedSections: ["positions live des membres"],
  },
  {
    id: "documents-reservations",
    label: "Documents et Réservations",
    routes: [
      "/(app)/trips/[tripId]/documents",
      "/(app)/trips/[tripId]/reservations",
    ],
    template: "14-checklist-documents.html",
    coverage: "scoped",
    excludedSections: ["packing list"],
  },
  {
    id: "account",
    label: "Compte et réglages",
    routes: ["/(app)/account", "/(app)/trips/[tripId]/settings"],
    template: "15-profil-settings.html",
    coverage: "scoped",
    excludedSections: ["album", "journal", "notifications post-V0"],
  },
  {
    id: "authentication",
    label: "Authentification",
    routes: ["/(auth)/sign-in", "/(auth)/sign-up", "/(auth)/forgot-password"],
    template: null,
    coverage: "missing",
    excludedSections: [],
  },
  {
    id: "trip-list",
    label: "Liste des Voyages",
    routes: ["/(app)/trips"],
    template: null,
    coverage: "missing",
    excludedSections: [],
  },
  {
    id: "imports",
    label: "Centre d'imports",
    routes: ["/(app)/imports"],
    template: null,
    coverage: "missing",
    excludedSections: [],
  },
  {
    id: "stop-detail",
    label: "Détail d'une Étape",
    routes: ["/(app)/trips/[tripId]/stops/[stopId]"],
    template: null,
    coverage: "missing",
    excludedSections: [],
  },
] as const satisfies readonly TemplateContract[];

export const excludedTemplateFiles = [
  "07-photo-album.html",
  "08-journal.html",
  "09-trip-recap.html",
  "10-social-export.html",
  "13-chat-famille.html",
  "16-capsule-temporelle.html",
  "17-defis-badges.html",
  "18-securite-urgences.html",
  "19-booking-esim.html",
] as const;
