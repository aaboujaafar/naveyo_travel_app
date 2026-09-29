# Écran — Localisation d’une Étape

Périmètre : `GEO-003`.

## Parcours

- l’utilisateur saisit au moins deux caractères dans un champ « Ville ou adresse » ;
- l’autocomplete Geoapify est temporisé et affiche au plus cinq suggestions ;
- la sélection affiche nom, adresse, pays, coordonnées, fuseau IANA et aperçu MapKit ;
- « Choisir sur la carte » ouvre une carte avec épingle centrale ;
- « Utiliser ma position » demande la permission uniquement après l’action ;
- l’épingle est résolue par géocodage inverse et doit être confirmée avant sauvegarde.

## Création et modification

Le nom de l’Étape peut être personnalisé après sélection. Le pays et le fuseau sont préremplis mais restent visibles. Une Étape existante peut changer de localisation après une confirmation explicite ; ses éléments d’itinéraire et dates/heures locales restent associés.

Le texte libre non sélectionné, une permission refusée ou une réponse Geoapify vide ne créent jamais de coordonnées inventées. Le mode hors ligne laisse consulter la valeur existante et propose une saisie manuelle, mais désactive la recherche distante.

## États à couvrir

Chargement, aucune suggestion, erreur réseau, quota atteint, permission refusée, résultat ambigu, épingle sans adresse précise, confirmation de remplacement et sauvegarde hors ligne impossible.
