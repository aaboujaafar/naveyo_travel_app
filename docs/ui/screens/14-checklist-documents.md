# Écran 14 — Documents et Réservations

Référence visuelle : partie Documents/Réservations de `templates/ui/14-checklist-documents.html`.

## Données réelles utilisées

L'onglet Documents lit les `TravelDocument` privés du Module `documents`, ainsi que les Étapes du Module `trips`. L'onglet Réservations lit uniquement les Réservations confirmées du stockage local partagé existant. Aucun fichier, référence, lieu, horaire ou réservation de démonstration n'est présenté comme réel.

Une donnée extraite n'apparaît comme Réservation qu'après relecture et confirmation humaines. Les valeurs locales et le fuseau IANA fournis par la Réservation sont préservés à l'affichage.

## Sections V0 actives

- navigation entre Documents et Réservations ;
- liste et filtrage des Documents par Étape ou état non classé ;
- téléchargement d'une copie persistante privée ;
- affectation d'un Document à une Étape lorsque l'Interface du Module le permet ;
- accès au parcours d'import et de confirmation humaine ;
- chronologie des Réservations confirmées ;
- ouverture d'un lieu réel dans Plans ou Waze sans inventer de coordonnées ;
- états chargement, vide, erreur et nouvelle tentative.

## Sections visibles avec « À venir »

- packing list indépendante ;
- progression et compteur de préparation associés.

La packing list reste visible mais désactivée, conformément à son exclusion du périmètre V0. Les Documents d'identité restent exclus de cet écran.

## Vérification

- [x] structure Documents/Réservations du template reproduite ;
- [x] confirmation humaine explicitement rappelée ;
- [x] aucune donnée extraite promue automatiquement ;
- [x] aucun Document d'identité pris en charge ;
- [x] packing list visible, désactivée et marquée « À venir » ;
- [x] états chargement, vide, erreur et désactivé ;
- [ ] essai d'import réel depuis Mail ou Safari ;
- [ ] comparaison visuelle et validation VoiceOver sur iPhone réel.

Écart assumé : le template mêle checklist, packing et documents. La V0 conserve seulement les Documents de voyage et les Réservations confirmées comme fonctions actives.
