# UI-160 — Compte et réglages

Référence visuelle : `templates/ui/15-profil-settings.html`

Routes Naveyo :

- `app/(app)/account.tsx`
- `app/(app)/trips/[tripId]/settings/index.tsx`

## Écran Compte

| Section du template | État Naveyo V0 | Traitement |
|---|---|---|
| En-tête et carte du Compte | Compatible | Adresse e-mail réelle de la session ; initiales et libellé uniquement dérivés de cette adresse. |
| Modification du profil | Non exposée par `IdentityModule` | Visible, désactivée et marquée « À venir ». |
| Statistiques | Partielle | Nombre réel de Voyages et de pays d'Étapes ; photos et kilomètres non disponibles restent « À venir ». |
| Voyage courant | Compatible | Premier Voyage fourni par le Module, sans inventer de statut actif ni de progression. |
| Liens rapides | Partiels | Dashboard et Budget actifs ; Photos reste « À venir ». |
| Voyages archivés et récaps | Hors V0 | Visibles, désactivés et marqués « À venir ». |
| Famille | Adaptée au domaine | Membres réels du Voyage avec uniquement les rôles propriétaire et éditeur, sans présence temps réel. |
| Notifications | Non modélisées | Visibles, désactivées et marquées « À venir ». |
| Stockage hors ligne | Compatible en lecture | État et manifeste réels du `TripPack`, sans calcul de taille inventé ni mutation du stockage. |
| Préférences générales | Non modélisées | Valeurs de prévisualisation visibles, désactivées et marquées « À venir ». |
| À propos | Compatible partiellement | Version Expo réelle ; aide, contact et liens légaux restent « À venir ». |
| Déconnexion | Compatible | Confirmation explicite puis appel de la session existante. |
| Navigation sociale | Hors V0 | Explorer sans Étape, Photos, Journal et Récap restent visibles et désactivés. |

## Écran Réglages du Voyage

- nom, dates locales et devise ISO 4217 modifiables via `TripsModule.update` ;
- validation du format `AAAA-MM-JJ` et de l'ordre des dates sans conversion dans le fuseau du téléphone ;
- code de devise normalisé en majuscules et limité à trois lettres ;
- membres réels affichés avec les seuls rôles propriétaire/éditeur ;
- accès au parcours d'invitation du second Compte ;
- photo de couverture, notifications, archivage et suppression visibles mais désactivés avec « À venir » ;
- rappel explicite que les mutations ordinaires sont désactivées hors ligne.

## Sécurité et données

- aucune information de Compte autre que l'identifiant de session et son e-mail n'est inventée ;
- aucun état de présence ou historique familial n'est chargé ;
- aucun statut archivé, nombre de photos, distance ou taille de stockage n'est simulé ;
- la déconnexion est confirmée avant l'appel au Module d'identité ;
- les routes assemblent l'écran et appellent les Modules, sans Adapter ou accès Supabase direct.

## Validation visuelle restante

- comparaison sur les formats iPhone 390 px et 430 px ;
- contrôle VoiceOver des sections « À venir », de la confirmation de déconnexion et des formulaires ;
- contrôle clavier, tailles dynamiques, safe areas et navigation fixe ;
- validation réelle online/offline des réglages et du `TripPack`.
