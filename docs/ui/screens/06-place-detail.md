# Écran 06 — Détail d'un lieu

Référence visuelle : `templates/ui/06-place-detail.html`.

## Données réelles utilisées

La route charge exclusivement un `PlaceCandidate` par `PlacesModule.getById(placeId, tripId)`. Le nom, la catégorie, l'adresse, le pays, la source et les coordonnées affichés proviennent de ce candidat. Aucun avis, horaire, prix, note, photo fournisseur, distance ou coordonnées n'est inventé.

L'ajout à l'itinéraire utilise `ItineraryModule.addConfirmedPlace` après sélection humaine d'une date locale appartenant à une Étape du Voyage. Les dates sont énumérées sans utiliser le fuseau du téléphone.

## Sections V0 actives

- identité et provenance du candidat ;
- localisation avec coordonnées vérifiées ;
- ouverture de l'itinéraire et de Plans ;
- informations pratiques réellement disponibles ;
- ajout humain à l'itinéraire.

## Sections visibles avec « À venir »

- photo hero et galerie fournisseur ;
- partage et favoris ;
- note, horaires, distance, prix et description enrichie ;
- conseil IA non fourni au composant ;
- accessibilité, menu, parking et transport enrichi ;
- conseils, votes et avis sociaux ;
- lieux similaires ;
- réservation automatique.

## Composition de la route

Le contrat applicatif expose `places.getById` et la composition racine transmet désormais les Modules déjà créés à `NaveyoBootstrapProvider`. La route charge donc le candidat réel sans fixture et sans construire d'Adapter. L'absence de Module ou de candidat conserve un état d'erreur explicite.

## Vérification

- [x] ordre des sections du template conservé ;
- [x] états chargement, introuvable, erreur et ajout en cours ;
- [x] aucune donnée fournisseur inventée ;
- [x] réservation, avis et votes neutralisés ;
- [x] zones tactiles principales d'au moins 44 points ;
- [x] câblage de `NaveyoBootstrapProvider` avec les Modules composés à la racine ;
- [ ] comparaison visuelle 390/430 px ;
- [ ] validation VoiceOver et tailles de texte sur iPhone réel.

Écarts connus : le registre partagé ne contient pas encore les icônes exactes de partage et de favori. Les meilleures icônes existantes sont utilisées dans les actions désactivées, sans modifier `src/ui`.
