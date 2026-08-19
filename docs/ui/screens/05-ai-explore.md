# UI-130 — Suggestions IA et lieux

Référence visuelle : `templates/ui/05-ai-explore.html`

Route Naveyo : `app/(app)/trips/[tripId]/assistant/index.tsx`

## Contrat Places ajouté

La recherche d’exploration autour d’une Étape utilise ses coordonnées confirmées et passe par le gateway Places existant. La composition d’une journée est distincte : l’Edge Function récupère son propre pool de lieux selon les préférences, le rayon et la mobilité, puis renvoie les candidats éphémères avec le brouillon. Le mobile ne recherche ni ne transmet de candidats pendant `composeDay`. `GOOGLE_PLACES_API_KEY` est le fournisseur primaire optionnel ; `GEOAPIFY_API_KEY` est le fallback. Google n’est considéré actif qu’après configuration du secret et smoke test réel.

## Sections reproduites

| Section du template | État Naveyo V0 | Traitement |
|---|---|---|
| En-tête de l'Étape | Compatible | Le nom de l'Étape est chargé depuis le Module `trips`. |
| Recherche | Compatible | La requête lance `TripAssistant.suggestPlaces` ; le Module recherche d'abord de vrais candidats. |
| Recherche vocale | Hors V0 | Non activée ; l'action circulaire lance la recherche textuelle. |
| Liste/carte et tri | Active après `GEO-004` | Les candidats réels sont consultables en liste ou sur MapKit ; le tri reste limité à la pertinence et à la distance disponible. |
| Chargement | Compatible | Squelettes et indicateur de classement sont affichés pendant la requête. |
| Suggestions personnalisées | Compatible | Affiche exclusivement les `SuggestionDraft` retournés par le Module. |
| Catégories | Compatible | La catégorie sélectionnée devient une préférence bornée transmise au Module. |
| Filtres de rayon/prix | Rayon actif, prix hors V0 | Le rayon est transmis à Geoapify ; les prix restent désactivés. |
| Résultats de lieux | Compatible avec le contrat | L’exploration réutilise les candidats vérifiés du gateway ; la journée utilise les candidats éphémères renvoyés par l’Edge Function, sans coordonnées, distance, note, prix ou horaires inventés. |
| Conversation IA | Hors V0 | Visible, désactivée et marquée « À venir ». Aucun chatbot n'est implémenté. |
| Itinéraire IA du jour | Lot 3 intégré | Compose une journée complète côté Edge Function à partir des préférences et de lieux vérifiés, après exclusion des lieux déjà confirmés à l’échelle du Voyage. La confirmation résout d’abord les candidats du brouillon, puis conserve le fallback `getById` pour les anciens brouillons. |
| Recherches récentes | Hors V0 | Visible, désactivé et marqué « À venir ». |
| Coups de cœur famille | Wishlist indépendante hors V0 | Visible, désactivé et marqué « À venir ». |
| Navigation basse | Partielle | Accueil et Explorer sont utilisables ; Photos, Journal et Récap restent visibles, désactivés et marqués « À venir ». |

## Invariants conservés

- l'application mobile ne fournit aucun candidat à l'IA pendant `composeDay` ;
- `discover()` conserve sa recherche mobile séparée pour la fonctionnalité d’exploration ;
- chaque brouillon reste lié à son `candidateId` contrôlé par le Module ;
- les sorties restent des `SuggestionDraft` et ne deviennent jamais automatiquement des lieux ou éléments d'itinéraire ;
- chaque candidat conserve son identifiant fournisseur et son attribution ;
- aucune conversation générale ni donnée fournisseur inventée ;
- la journée composée reste un brouillon jusqu’à une confirmation humaine explicite ;
- erreurs et absence du Module visibles ;
- le contexte est identifié par `tripId` et `stopId`, avec le nom réel de l'Étape affiché si disponible.
- après composition, les candidats renvoyés par l’Edge Function sont conservés éphémèrement afin que la confirmation utilise le même pool que celui validé par le serveur.

## Exclusion des lieux déjà utilisés — lot 3

Avant tout appel au modèle, l’Edge Function fusionne les éléments persistés de tout le Voyage avec l’historique encore détenu par le mobile. Elle retire du pool les identifiants candidats identiques, les couples fournisseur/identifiant identiques et les doublons inter-fournisseurs portant le même nom à moins de 100 mètres. Les homonymes éloignés restent disponibles.

L’exclusion intervient avant la consommation du quota IA. Quand tous les lieux disponibles ont déjà été utilisés, la fonction renvoie `no_new_places_available` sans appeler le modèle. Seuls les éléments de la date demandée sont ensuite transmis comme contraintes horaires au modèle ; l’historique complet sert uniquement au filtrage déterministe.

## Validation visuelle restante

- comparaison sur iPhone en largeurs 390 px et 430 px ;
- contrôle du clavier, du défilement et de la navigation fixe ;
- contrôle VoiceOver, tailles dynamiques et contrastes ;
- vérification d'une réponse réelle de l'Edge Function avec zéro, un et cinq brouillons.
