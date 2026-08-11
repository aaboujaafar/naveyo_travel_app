# UI-001 — Création d'un Voyage

Date : 11 août 2026.

## Référence

- template : `templates/ui/02-create-trip.html` ;
- largeur de référence inspectée : 390 px ;
- route : `app/(app)/trips/new.tsx` ;
- écran : `src/screens/CreateTripScreen.tsx`.

## Couverture fonctionnelle

| Section du template | État V0 |
|---|---|
| Destination | Active et transmise au Module `trips` comme nom du Voyage |
| Dates du voyage | Actives, validées comme dates locales et transmises au Module `trips` |
| Durée | Calculée localement à partir des dates, sans dépendre du fuseau du téléphone |
| Modèles, couverture, météo, voyageurs, type et budget estimé | Reproduits visuellement, désactivés et marqués « À venir » |
| Villes étapes, préparation, notes et documents | Reproduits visuellement, désactivés et marqués « À venir » |

La création conserve la devise V0 `EUR` et redirige vers l'invitation après succès. Aucune donnée provenant d'une section « À venir » n'est persistée.

## Validation

- règles de dates couvertes par tests unitaires ;
- lint, TypeScript strict et suite complète validés ;
- comparaison sur iPhone à 390 px et 430 px encore requise avant de déclarer le rendu pixel-perfect.
