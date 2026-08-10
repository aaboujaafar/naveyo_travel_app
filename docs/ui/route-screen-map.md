# Mapping des routes et des écrans

Date de l'inventaire : 10 août 2026.

Ce document associe chaque route Expo Router actuelle à un écran fonctionnel. Il sert de contrat d'entrée à la vague UI : les fichiers HTML, composants, icônes et styles du futur dossier de templates devront être rattachés aux identifiants d'écran ci-dessous.

## Conventions

- L'**ID écran** est stable et indépendant du nom du fichier ou du titre affiché. Il doit être repris dans l'inventaire des templates.
- Les groupes Expo Router `(auth)` et `(app)` organisent le code, mais ne figurent pas dans l'URL visible.
- Une ligne marquée **Technique** est nécessaire à la navigation, mais ne correspond pas à une maquette plein écran.
- La colonne **Template** reste à renseigner lorsque le dossier de référence UI sera fourni.
- `[tripId]` et `[token]` sont des paramètres de chemin. `stopId`, `pendingId` et le second `tripId` mentionné dans les paramètres sont des paramètres de requête.

## Routes techniques et layouts

| ID | Route publique | Fichier Expo Router | Rôle | Template | État |
|---|---|---|---|---|---|
| `ROOT-LAYOUT` | Toutes | `app/_layout.tsx` | Composition globale, session, modules et garde de navigation | Aucun | Technique |
| `AUTH-LAYOUT` | Routes publiques | `app/(auth)/_layout.tsx` | Pile de navigation des écrans d'authentification | Aucun | Technique |
| `APP-LAYOUT` | Routes privées | `app/(app)/_layout.tsx` | Pile privée, état hors ligne, accès au compte et déconnexion | Composants de shell à fournir | Technique / visible |
| `AUTH-ENTRY` | `/` côté public | `app/(auth)/index.tsx` | Redirection automatique vers `/sign-in` | Aucun | Redirection |
| `ROOT-ENTRY` | `/` | `app/index.tsx` | Ancienne entrée racine | Aucun | Supprimée dans le travail en cours, ne pas restaurer sans décision |

## Authentification

| ID écran | Route publique | Fichier Expo Router | Écran associé | Paramètres | Template | État |
|---|---|---|---|---|---|---|
| `AUTH-SIGN-IN` | `/sign-in` | `app/(auth)/sign-in.tsx` | Connexion | Aucun | À fournir | Actuel |
| `AUTH-SIGN-UP` | `/sign-up` | `app/(auth)/sign-up.tsx` | Création de compte | Aucun | À fournir | Actuel |
| `AUTH-FORGOT-PASSWORD` | `/forgot-password` | `app/(auth)/forgot-password.tsx` | Demande de réinitialisation du mot de passe | Aucun | À fournir | Actuel |

## Espace privé global

| ID écran | Route publique | Fichier Expo Router | Écran associé | Paramètres | Template | État |
|---|---|---|---|---|---|---|
| `APP-DASHBOARD` | `/` côté authentifié | `app/(app)/index.tsx` | Tableau de bord et accès aux Voyages, imports et invitations | Aucun | À fournir | Actuel |
| `ACCOUNT` | `/account` | `app/(app)/account.tsx` | Compte utilisateur | Aucun | À fournir | Actuel |
| `IMPORT-RESERVATION` | `/imports` | `app/(app)/imports/index.tsx` | Import, analyse locale et confirmation humaine d'une Réservation | `tripId?`, `pendingId?` | À fournir | Actuel, à étendre par `INT-106` avec le choix d'une Étape |
| `INVITE-JOIN` | `/invite` | `app/(app)/invite/index.tsx` | Saisie d'un jeton pour rejoindre un Voyage | Aucun | À fournir | Actuel |
| `INVITE-ACCEPT` | `/invite/[token]` | `app/(app)/invite/[token].tsx` | Consultation et acceptation d'une invitation | `token` | À fournir | Actuel |

## Navigation globale historique

Ces routes lisent le Voyage courant depuis le bootstrap de l'application. Elles coexistent avec les routes imbriquées sous `/trips/[tripId]`. La vague UI devra décider si elles restent des écrans distincts, deviennent des redirections ou disparaissent au profit de la navigation par Voyage.

| ID écran | Route publique | Fichier Expo Router | Écran associé | Paramètres | Template | État |
|---|---|---|---|---|---|---|
| `CURRENT-TRIP` | `/trip` | `app/(app)/trip.tsx` | Résumé du Voyage courant | Aucun | À arbitrer | Actuel, doublon partiel de `TRIP-DETAIL` |
| `CURRENT-STOPS` | `/stops` | `app/(app)/stops.tsx` | Liste des Étapes du Voyage courant | Aucun | À arbitrer | Actuel, navigation transitoire |
| `CURRENT-PLACES` | `/places` | `app/(app)/places.tsx` | Lieux et Suggestions IA du Voyage courant | Aucun | À arbitrer | Actuel, navigation transitoire |
| `CURRENT-ITINERARY` | `/itinerary` | `app/(app)/itinerary.tsx` | Itinéraire du Voyage courant | Aucun | À arbitrer | Actuel, doublon partiel de `TRIP-ITINERARY` |

## Voyages et Étapes

| ID écran | Route publique | Fichier Expo Router | Écran associé | Paramètres | Template | État |
|---|---|---|---|---|---|---|
| `TRIP-LIST` | `/trips` | `app/(app)/trips/index.tsx` | Liste « Mes Voyages » | Aucun | À fournir | Actuel |
| `TRIP-CREATE` | `/trips/new` | `app/(app)/trips/new.tsx` | Création d'un Voyage | Aucun | À fournir | Actuel |
| `TRIP-DETAIL` | `/trips/[tripId]` | `app/(app)/trips/[tripId]/index.tsx` | Détail du Voyage, Étapes, membres et accès aux modules | `tripId` | À fournir | Actuel |
| `TRIP-INVITE` | `/trips/[tripId]/invite` | `app/(app)/trips/[tripId]/invite.tsx` | Création et partage d'une invitation | `tripId` | À fournir | Actuel |
| `TRIP-SETTINGS` | `/trips/[tripId]/settings` | `app/(app)/trips/[tripId]/settings/index.tsx` | Réglages du Voyage | `tripId` | À fournir | Actuel |
| `STOP-CREATE` | `/trips/[tripId]/stops/new` | `app/(app)/trips/[tripId]/stops/new.tsx` | Création d'une Étape | `tripId` | À fournir | Actuel |
| `STOP-DETAIL` | `/trips/[tripId]/stops/[stopId]` | À créer | Détail d'une Étape, dont ses Documents associés | `tripId`, `stopId` | À fournir | Prévu par `DOC-001` et `INT-106`, route absente |

## Modules d'un Voyage

| ID écran | Route publique | Fichier Expo Router | Écran associé | Paramètres | Template | État |
|---|---|---|---|---|---|---|
| `TRIP-ASSISTANT` | `/trips/[tripId]/assistant` | `app/(app)/trips/[tripId]/assistant/index.tsx` | Suggestions de lieux autour d'une Étape | `tripId`, `stopId` | À fournir | Actuel |
| `TRIP-ITINERARY` | `/trips/[tripId]/itinerary` | `app/(app)/trips/[tripId]/itinerary/index.tsx` | Itinéraire chronologique du Voyage | `tripId` | À fournir | Actuel |
| `TRIP-RESERVATIONS` | `/trips/[tripId]/reservations` | `app/(app)/trips/[tripId]/reservations/index.tsx` | Réservations du Voyage | `tripId` | À fournir | Actuel |
| `TRIP-DOCUMENTS` | `/trips/[tripId]/documents` | `app/(app)/trips/[tripId]/documents/index.tsx` | Documents du Voyage, futurs filtres par Étape et section « Non classés » | `tripId` | À fournir | Actuel, à étendre par `DOC-001` |
| `TRIP-EXPENSES` | `/trips/[tripId]/expenses` | `app/(app)/trips/[tripId]/expenses/index.tsx` | Budget et Dépenses | `tripId` | À fournir | Actuel |
| `TRIP-TRACKING` | `/trips/[tripId]/tracking` | `app/(app)/trips/[tripId]/tracking/index.tsx` | Démarrage, état, carte et suppression de la Trace de trajet | `tripId` | À fournir | Actuel |

## Correspondance attendue avec le dossier de templates

Chaque écran visuel doit pouvoir être relié sans ambiguïté à une maquette. Le manifeste du futur dossier pourra utiliser cette forme :

| ID écran | Fichier HTML attendu | État de couverture |
|---|---|---|
| `AUTH-SIGN-IN` | À renseigner | Manquant |
| `APP-DASHBOARD` | À renseigner | Manquant |
| `TRIP-LIST` | À renseigner | Manquant |
| `TRIP-DETAIL` | À renseigner | Manquant |
| `STOP-DETAIL` | À renseigner | Manquant |
| `TRIP-DOCUMENTS` | À renseigner | Manquant |
| Tous les autres IDs visuels | À renseigner | Manquant |

La présence d'un fichier HTML ne suffira pas à considérer un écran couvert : il faudra aussi identifier ses états vide, chargement, erreur, hors ligne, permission refusée et contenu nominal lorsqu'ils sont applicables.

## Décisions à prendre avant la vague UI

1. Fournir le chemin exact du dossier de templates et renseigner la colonne **Template**.
2. Décider du devenir des quatre routes globales `/trip`, `/stops`, `/places` et `/itinerary`.
3. Confirmer la création de `STOP-DETAIL` comme écran dédié au détail d'une Étape.
4. Définir la destination de `/` lorsque la session est en cours afin d'éviter une ambiguïté entre l'entrée publique et le tableau de bord privé.
5. Vérifier qu'une maquette couvre chaque ID visuel ainsi que les états obligatoires de l'écran.
