# Détail d'une Étape

Références de composition :

- identité, statistiques et progression : `templates/ui/04-trip-dashboard.html` ;
- carte dégradée et chronologie : `templates/ui/12-carte-itineraire.html` ;
- Documents et Réservations : `templates/ui/14-checklist-documents.html`.

## Données réelles utilisées

La route vérifie d'abord le Voyage avec le Module `trips`, puis retrouve l'Étape dans `trips.listStops(tripId)`. Les dates locales, le pays et le fuseau IANA affichés proviennent directement de cette Étape.

- l'itinéraire est chargé par le Module `itinerary` et filtré par le `stopId` explicite ;
- les Documents sont chargés par le Module `documents` avec `tripId` et `stopId` ;
- les Réservations sont chargées par le Module `reservations` ;
- une Réservation n'est attribuée à l'Étape que lorsqu'un Document de cette Étape porte explicitement son `reservationId`.

Ce dernier choix évite d'inférer une association depuis une date, un pays, un lieu ou le fuseau. Les Réservations sans lien explicite restent accessibles dans la liste globale du Voyage.

## Sections V0 actives

- en-tête avec retour et actualisation ;
- identité de l'Étape, plage de dates locales, pays et fuseau IANA ;
- compteurs réels de jours, éléments d'itinéraire et Documents ;
- onglets Itinéraire, Documents et Réservations ;
- aperçu cartographique dégradé et accès à la carte complète ;
- chronologie réelle avec heure locale, fuseau, lieu et notes disponibles ;
- consultation et téléchargement persistant des Documents privés ;
- timeline des Réservations confirmées explicitement liées ;
- états chargement, erreur, vide et nouvelle tentative.

## Sections visibles avec « À venir »

- météo et alertes locales ;
- packing list indépendante par Étape ;
- activité sociale, présence et position live des Membres.

Ces sections reprennent les capacités visibles dans les références, mais restent désactivées et signalées comme indisponibles aux technologies d'assistance. Aucun contenu social, lieu, météo ou position n'est inventé.

## Invariants

- aucune date locale n'est convertie depuis le fuseau du téléphone ;
- les formats de calendrier utilisent UTC uniquement pour présenter les composantes de la date locale ;
- aucun statut « fait » ou « en cours » n'est inventé pour un élément d'itinéraire ;
- aucun fond cartographique n'est présenté comme disponible hors ligne ;
- les Documents restent privés et aucun document d'identité n'est introduit ;
- seules des Réservations déjà confirmées sont affichées.

## Vérification

- [x] route réduite au chargement des Modules, aux paramètres et à la navigation ;
- [x] paramètres manquants, Voyage inaccessible et Étape inconnue traités explicitement ;
- [x] modèle de filtrage et d'ordre couvert par tests ;
- [x] aucune fixture ni donnée fournisseur ajoutée ;
- [x] sections hors V0 visibles, désactivées et marquées « À venir » ;
- [ ] comparaison visuelle à 390 et 430 px ;
- [ ] validation VoiceOver et tailles dynamiques sur iPhone réel ;
- [ ] validation du téléchargement d'un Document réel sur development build.

Écart assumé : aucune image propre à l'Étape n'existe dans le modèle. Le hero reprend donc la géométrie et les couleurs du dashboard sans réutiliser une photo de destination qui pourrait être fausse.
