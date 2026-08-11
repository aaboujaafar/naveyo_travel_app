# UI-130 — Suggestions IA et lieux

Référence visuelle : `templates/ui/05-ai-explore.html`

Route Naveyo : `app/(app)/trips/[tripId]/assistant/index.tsx`

## Sections reproduites

| Section du template | État Naveyo V0 | Traitement |
|---|---|---|
| En-tête de l'Étape | Compatible | Le nom de l'Étape est chargé depuis le Module `trips`. |
| Recherche | Compatible | La requête lance `TripAssistant.suggestPlaces` ; le Module recherche d'abord de vrais candidats. |
| Recherche vocale | Hors V0 | Non activée ; l'action circulaire lance la recherche textuelle. |
| Liste/carte et tri | Non disponible dans le contrat actuel | Aperçu visible, désactivé et marqué « À venir ». |
| Chargement | Compatible | Squelettes et indicateur de classement sont affichés pendant la requête. |
| Suggestions personnalisées | Compatible | Affiche exclusivement les `SuggestionDraft` retournés par le Module. |
| Catégories | Compatible | La catégorie sélectionnée devient une préférence bornée transmise au Module. |
| Filtres de rayon/prix | Non modélisés | Visibles, désactivés et marqués « À venir ». Aucun rayon ou prix n'est inventé. |
| Résultats de lieux | Compatible avec le contrat | Réutilise les brouillons liés aux candidats vérifiés, sans coordonnées, distance, note, prix ou horaires inventés. |
| Conversation IA | Hors V0 | Visible, désactivée et marquée « À venir ». Aucun chatbot n'est implémenté. |
| Itinéraire IA du jour | Hors V0 | Visible, désactivé et marqué « À venir ». Aucun élément d'itinéraire n'est créé. |
| Recherches récentes | Hors V0 | Visible, désactivé et marqué « À venir ». |
| Coups de cœur famille | Wishlist indépendante hors V0 | Visible, désactivé et marqué « À venir ». |
| Navigation basse | Partielle | Accueil et Explorer sont utilisables ; Photos, Journal et Récap restent visibles, désactivés et marqués « À venir ». |

## Invariants conservés

- l'application mobile ne fournit aucun candidat fictif à l'IA ;
- chaque brouillon reste lié à son `candidateId` contrôlé par le Module ;
- les sorties restent des `SuggestionDraft` et ne deviennent jamais automatiquement des lieux ou éléments d'itinéraire ;
- aucune conversation générale, composition automatique de journée ou donnée fournisseur inventée ;
- erreurs et absence du Module visibles ;
- le contexte est identifié par `tripId` et `stopId`, avec le nom réel de l'Étape affiché si disponible.

## Validation visuelle restante

- comparaison sur iPhone en largeurs 390 px et 430 px ;
- contrôle du clavier, du défilement et de la navigation fixe ;
- contrôle VoiceOver, tailles dynamiques et contrastes ;
- vérification d'une réponse réelle de l'Edge Function avec zéro, un et cinq brouillons.
