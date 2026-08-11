# UI-001 — Plan d'implémentation fidèle aux templates

Date : 11 août 2026.

## Objectif

Reproduire les templates HTML dans l'application Expo/React Native sans modifier les règles métier, les permissions, les données ni le périmètre V0. Le rendu de référence est capturé à 390 px de large ; l'acceptation finale couvre aussi 430 px sur les deux iPhone cibles.

Les templates restent en lecture seule. `templates/ui/design-system.md` tranche les valeurs visuelles ; `templates/ui/shared.css` et chaque fichier HTML précisent le rendu effectif de l'écran. En cas de contradiction, l'écart est documenté avant implémentation.

## Règles de fidélité

- même ordre et même nombre de sections que la référence retenue ;
- géométrie à ±2 px et typographie à ±1 px sur la largeur de référence ;
- mêmes couleurs, rayons, ombres, ratios d'image, icônes et alignements ;
- mêmes états et interactions, sous réserve du périmètre V0 ;
- aucune fonctionnalité exclue ne revient par l'UI ;
- aucune valeur visuelle brute hors `src/theme/` ;
- aucune logique métier ni requête fournisseur ajoutée aux routes ;
- capture HTML puis capture React Native, superposition à 50 % et correction avant validation ;
- validation VoiceOver, taille de texte, zones tactiles et états offline après la conformité visuelle.

## Matrice des références V0

| Zone Naveyo | Template | Couverture | Décision |
|---|---|---|---|
| Création de Voyage | `02-create-trip.html` | 1:1 partiel | Destination et dates actives ; les autres sections restent visibles, désactivées et marquées « À venir » |
| Invitation | `03-invite-family.html` | 1:1 partiel | Reproduction exacte, limitée aux rôles propriétaire/éditeur |
| Tableau de bord et détail du Voyage | `04-trip-dashboard.html` | 1:1 pour le dashboard | Le détail réutilise les sections du dashboard sans inventer de nouveau style |
| Suggestions IA | `05-ai-explore.html` | 1:1 partiel | Reproduction exacte, sans chatbot générique |
| Détail d'un lieu | `06-place-detail.html` | 1:1 | Reproduction exacte, candidats réels uniquement |
| Budget et Dépenses | `11-budget.html` | 1:1 partiel | Reproduction exacte des éléments V0, sans split ni dette |
| Carte, itinéraire et Trace | `12-carte-itineraire.html` | 1:1 partiel | Carte/itinéraire exacts ; aucune position live de membre |
| Documents et Réservations | `14-checklist-documents.html` | 1:1 partiel | Onglets Documents/Réservations exacts ; packing list exclue |
| Compte et réglages | `15-profil-settings.html` | 1:1 partiel | Sections V0 uniquement |
| Connexion, inscription, mot de passe | aucune | manquante | Ne pas inventer ; préparer les primitives et demander une référence |
| Liste des Voyages | aucune | manquante | Utiliser uniquement les composants approuvés après décision visuelle |
| Centre d'imports et confirmation | aucune | manquante | S'appuyer sur `14` uniquement après validation du mapping |
| Détail d'une Étape | aucune | manquante | Composer depuis `04`, `12` et `14` après validation |
| Écran GPS dédié | aucune | manquante | Composer depuis `12` après validation |

Les templates `07`, `08`, `09`, `10`, `13`, `16`, `17`, `18` et `19` correspondent à des fonctionnalités exclues du V0. Ils restent hors implémentation.

## Lots

### Lot 0 — Références, garde-fous et mesures

- figer la matrice route ↔ template ↔ sections V0 ;
- auditer les tokens existants contre `design-system.md` et `shared.css` ;
- figer la stratégie d'icônes par registre local SVG ;
- ajouter la checklist de comparaison et les fixtures de référence ;
- préparer un catalogue UI de développement sans service externe.

Gate : aucune divergence de token non documentée ; `pnpm verify` vert.

### Lot 1 — Fondations visuelles

- `AppText`, `Icon`, `Screen`, actions, surfaces et formulaires ;
- feedback, états loading/empty/error/offline ;
- top bar, navigation et safe areas ;
- cas de catalogue et tests comportementaux.

Gate : toutes les primitives V0 sont visibles et testées avant le premier écran.

### Lot 2 — Entrée dans le Voyage

Une tâche par écran, dans cet ordre :

1. création du Voyage — template `02`, sections compatibles actives et autres sections marquées « À venir » ;
2. invitation — template `03` ;
3. tableau de bord — template `04` ;
4. liste des Voyages et authentification seulement après validation de leurs références manquantes.

Gate : chaque écran validé séparément à 390 px avant le suivant.

### Lot 3 — Découverte et lieux

1. Suggestions IA — template `05` ;
2. détail d'un lieu — template `06` ;
3. états erreur, quota, absence de candidats et offline.

Gate : aucune fonction de chatbot et aucune donnée de lieu inventée.

### Lot 4 — Itinéraire, carte et Trace

1. itinéraire chronologique — template `12` ;
2. carte et état dégradé hors ligne — template `12` ;
3. Trace de trajet — langage visuel de `12`, après validation du mapping de l'écran dédié.

Gate : fuseaux et dates locales inchangés ; validation sur appareil pour la carte et le GPS.

### Lot 5 — Budget, Documents et Réservations

1. Budget et Dépenses — template `11`, sans split ;
2. Documents — onglet correspondant de `14` ;
3. Réservations — timeline de `14` ;
4. import/confirmation et détail d'Étape après validation des compositions sans maquette 1:1.

Gate : montants en unités mineures, confirmation humaine et états offline préservés.

### Lot 6 — Compte, shell et écrans sans référence

- compte/réglages V0 — template `15` ;
- harmonisation du shell et de la navigation ;
- traitement un par un des écrans sans référence, uniquement après décision visuelle explicite.

Gate : aucun écran n'est déclaré conforme sans référence approuvée.

### Lot 7 — QA visuelle et appareil

- captures HTML et React Native 390/430 ;
- superpositions et correction des écarts ;
- tailles de texte, VoiceOver, contrastes, zones tactiles et clavier ;
- validation sur les deux iPhone et rapport de conformité écran par écran.

Gate : aucun écart non approuvé et `pnpm verify` vert.

## Compte rendu par écran

Chaque écran livre : template et sections sources, capture de référence, capture React Native, écarts mesurés, interactions vérifiées, états couverts, accessibilité, tests exécutés et décision d'acceptation.
