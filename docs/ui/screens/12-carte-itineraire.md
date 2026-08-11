# UI-140 — Carte, itinéraire et Trace de trajet

Référence visuelle : `templates/ui/12-carte-itineraire.html`

Routes Naveyo :

- `app/(app)/trips/[tripId]/itinerary/index.tsx`
- `app/(app)/trips/[tripId]/tracking/index.tsx`

## Sections reproduites

| Section du template | État Naveyo V0 | Traitement |
|---|---|---|
| En-tête et sélection du jour | Compatible | Jours construits depuis les dates locales réelles des Étapes. |
| Carte et filtres | Compatible en mode dégradé | Les lieux avec coordonnées restent comptés et listés. Le fond cartographique est explicitement indisponible tant que l'Adapter MapKit n'est pas composé. |
| Itinéraire du jour | Compatible | Éléments réels ordonnés par le Module, heure locale et fuseau IANA affichés sans conversion implicite. |
| Détail d'un élément | Compatible | Adresse, lieu, notes, heure locale et fuseau viennent exclusivement de l'élément réel. |
| Ajout intercalé et réorganisation | Non disponible dans le contrat courant | Aperçu visible, désactivé et marqué « À venir ». Aucun élément fictif n'est persisté. |
| Mode hors ligne | Compatible | État réel du `TripPack`, manifeste et raison d'indisponibilité affichés. Le fond MapKit n'est jamais présenté comme garanti hors connexion. |
| Famille en temps réel | Hors V0 | Visible, désactivée et marquée « À venir ». Aucune position d'un Membre du voyage n'est chargée ni affichée. |
| Statistiques | Compatible partiellement | Distance dérivée des points WGS84 réels, nombre de points GPS et nombre d'éléments prévus. Aucun nombre de pas n'est inventé. |
| Trace de trajet | Compatible | Écran dédié avec état, démarrage, arrêt, rafraîchissement et compteurs réels. |
| Navigation sociale | Hors V0 | Photos et Journal restent visibles, désactivés et marqués « À venir ». |

## Consentement et sécurité GPS

- consentement explicite requis avant chaque démarrage depuis l'écran ;
- démarrage et arrêt visibles en permanence ;
- détection d'une Trace active pour un autre Voyage sur le même appareil ;
- un seul appareil enregistreur présenté comme invariant V0 ;
- aucune coordonnée brute affichée ou journalisée ;
- aucune position live d'un Membre du voyage ;
- les points locaux sont présentés comme synchronisables au retour du réseau, sans promesse non vérifiée.

## Invariants de temps et hors ligne

- les jours sont issus des dates locales des Étapes ;
- le formatage des dates utilise UTC uniquement comme support de calendrier afin de ne pas dépendre du fuseau du téléphone ;
- chaque heure affiche sa valeur locale et son fuseau IANA d'origine ;
- la distance est dérivée exclusivement de points WGS84 horodatés réellement enregistrés ;
- le `TripPack` actif n'est jamais remplacé ou modifié depuis ces écrans.

## Validation visuelle restante

- comparaison sur les deux formats d'iPhone cibles, en ligne et en mode avion ;
- vérification du pied de page, du défilement, des safe areas et des tailles dynamiques ;
- validation VoiceOver des jours, états GPS et consentement ;
- contrôle terrain de la Trace avec écran verrouillé, mode avion, reprise et force-quit ;
- validation du fond MapKit réel lorsque son Adapter sera composé.
