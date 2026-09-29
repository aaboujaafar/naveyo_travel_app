# Harmonisation du parcours Naveyo

Date de décision : 14 août 2026.

## Parcours cible

Le parcours privé de référence est unique :

`Onboarding → Connexion/Création de compte → Mes Voyages → Voyage → Étape ou module`

Les modules d'un Voyage restent toujours contextualisés par `tripId`. Une personne ne doit jamais choisir entre un ancien écran global et l'écran équivalent à l'intérieur du Voyage.

## Décisions par écran

| Zone | Décision | Raison |
|---|---|---|
| Onboarding | Garder, raccourcir | Présenter uniquement les fonctions disponibles : Voyage à deux, Étapes, IA contrôlée, Documents et hors ligne. |
| Connexion | Garder | Point d'entrée des Comptes existants, avec un vocabulaire produit et non technique. |
| Création de compte | Garder | Nécessaire au premier Voyage et aux invitations. |
| Mot de passe oublié | Masquer et rediriger | Le formulaire n'effectuait aucune réinitialisation réelle. Il reviendra quand le flux d'identité sera branché de bout en bout. |
| Ancien dashboard privé `/` | Remplacer par `Mes Voyages` | L'écran était un catalogue de composants et d'états factices, pas une destination utilisateur. |
| Mes Voyages | Garder comme accueil privé | C'est le bon niveau pour créer, ouvrir ou rejoindre un Voyage, importer un document et accéder au Compte. |
| `/trip`, `/stops`, `/places`, `/itinerary` | Remplacer par des redirections | Ces routes historiques dupliquaient les routes contextualisées sous `/trips/[tripId]`. |
| Tableau de bord du Voyage | Garder et simplifier | Conserver météo, Étapes, carte, itinéraire, adresses, Réservations, Documents, budget et réglages. |
| Photos, Journal, fil social, témoignages, stores | Cacher | Fonctionnalités non utilisables en V0 ; elles ne doivent pas concurrencer les actions disponibles. |
| Assistant / exploration de lieux | Garder | Fonction cœur, toujours ouverte depuis une Étape ou le Voyage courant. |
| Détail d'un lieu | Garder | Étape de validation avant ajout à l'itinéraire. |
| Itinéraire / carte | Garder | Vue opérationnelle du Voyage, incluant la Trace comme action secondaire. |
| Détail d'une Étape | Garder | Point de regroupement pour localisation, itinéraire, Réservations et Documents de l'Étape. |
| Documents / Réservations / Packing | Garder comme onglets | Même domaine d'usage ; la packing list collaborative est active en V0. |
| Centre d'import | Garder | Accessible globalement depuis Mes Voyages et contextuellement depuis Documents/Réservations. |
| Budget | Garder | Le budget réel et les Dépenses restent visibles ; partage de dette et fonctions futures restent hors V0. |
| Invitation | Garder | Deux entrées distinctes restent justifiées : inviter depuis un Voyage et rejoindre avec un code. |
| Compte / réglages | Garder | Le Compte est global ; les réglages du Voyage restent dans le Voyage. |
| UI catalog `/ui-catalog` | Développement uniquement | Ne fait pas partie du parcours utilisateur et reste protégé par le mode développement. |

## Règles d'harmonisation

- un seul fond, une seule échelle d'espacement et une seule hiérarchie typographique depuis `src/theme/` ;
- un titre principal par écran et aucun texte exposant les détails techniques (`shell`, Module, Supabase, RLS) ;
- les actions primaires utilisent le corail, les filtres et actions secondaires le teal ou une surface neutre ;
- les fonctions indisponibles sont absentes du parcours principal, pas affichées désactivées ;
- les écrans chargement, vide et erreur remplacent le contenu au même emplacement au lieu de s'empiler ;
- la navigation Retour ramène au parent métier : Étape → Voyage, module → Voyage, Voyage → Mes Voyages ;
- les autorisations sont demandées au moment de l'action concernée, jamais comme aperçu dans l'onboarding ;
- les routes conservent la logique métier dans les modules et ne font que charger, adapter et naviguer.

## Arborescence conservée

```text
Mes Voyages
├── Nouveau Voyage
├── Rejoindre un Voyage
├── Centre d'import
├── Compte
└── Voyage
    ├── Étapes
    │   ├── Détail / localisation
    │   └── Explorer des lieux
    ├── Carte & Itinéraire
    ├── Réservations
    ├── Documents
    ├── Budget & Dépenses
    ├── Trace de trajet
    ├── Invitation
    └── Réglages
```
