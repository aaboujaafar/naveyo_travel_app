# ADR-0002 — Geoapify pour le géocodage et les lieux

Date : 13 août 2026.

## Décision

Naveyo utilise Geoapify côté serveur pour les opérations géographiques et MapKit pour afficher les cartes et ouvrir la navigation Apple.

Geoapify couvre quatre besoins distincts :

- autocomplete et géocodage d’une ville ou d’une adresse ;
- géocodage inverse d’une épingle ou de coordonnées vers une adresse/ville ;
- recherche de points d’intérêt autour d’une Étape ;
- résolution finale d’un `place_id` avant sauvegarde.

La clé Geoapify reste dans Supabase. L’application mobile appelle uniquement une Edge Function authentifiée et contextualisée par le Voyage.

Les photos illustratives des restaurants, plats et visites sont enrichies côté Edge Function avec Unsplash lorsque `UNSPLASH_ACCESS_KEY` est défini. Les URLs retournées par Unsplash sont utilisées directement (hotlink), et chaque écran affiche le photographe avec un lien d’attribution. Sans cette clé, l’application conserve ses images locales de secours.

## Raisons

- Une intégration Geoapify existe déjà dans `src/adapters/geoapify` et `supabase/functions/places-search`.
- Les réponses fournissent coordonnées, adresse, pays, identifiant fournisseur, attribution et généralement le fuseau IANA.
- MapKit reste adapté au rendu natif iOS et à l’ouverture de Plans, sans appel fournisseur dans les écrans.
- Le plan gratuit est suffisant pour l’alpha si l’autocomplete est temporisé, annulable, borné et mis en cache.

## Règles produit

- Le nom d’un Voyage reste indépendant de ses Étapes.
- Une Étape est créée à partir d’une suggestion sélectionnée ou d’une épingle manuelle confirmée ; du texte libre non sélectionné ne suffit pas.
- Une Étape existante peut changer de localisation après confirmation. Ses éléments d’itinéraire restent liés et leurs dates/heures locales sont conservées.
- « Utiliser ma position » est une action explicite. La trace GPS n’est jamais géocodée automatiquement.
- Les adresses extraites des réservations restent des brouillons jusqu’à sélection ou validation humaine.
- Les résultats sauvegardés conservent les attributions Geoapify/OpenStreetMap nécessaires à leur réutilisation.

## Conséquences

- Le modèle `Stop` doit accepter une localisation et une attribution optionnelles, avec compatibilité des anciennes données.
- `PlacesModule` doit distinguer `autocomplete`, `reverse`, `nearby`, `getById` et `createManual`.
- Les requêtes et erreurs fournisseur doivent être testées au niveau Edge Function et Adapter, jamais directement dans une route d’écran.
- Les écrans doivent rester utilisables avec un cache existant lorsque le réseau ou les tuiles sont indisponibles.
- Les images Unsplash restent optionnelles et ne doivent jamais rendre une recherche de lieux indisponible.

## Sources fournisseur

- [Geoapify Address Autocomplete](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/)
- [Geoapify Forward Geocoding](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/)
- [Geoapify Reverse Geocoding](https://apidocs.geoapify.com/docs/geocoding/reverse-geocoding/)
- [Geoapify Places API](https://apidocs.geoapify.com/docs/places/)
- [Geoapify Place Details](https://apidocs.geoapify.com/docs/place-details/)
- [Geoapify Pricing](https://www.geoapify.com/pricing/)
- [Geoapify Terms](https://www.geoapify.com/terms-and-conditions/)
- [Unsplash API documentation](https://unsplash.com/documentation)
- [Unsplash API guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
