# UI-160 — Audit des écrans sans référence directe

Date : 11 août 2026.

## Portée et conclusion

Cet audit couvre l'authentification, la liste des Voyages, le centre d'imports, le détail d'une Étape, l'écran GPS dédié et le shell qui les héberge. La source de décision est `docs/ui/ui-001-implementation-plan.md`, complétée par `templates/ui/route-map.md`.

Aucun de ces écrans ne peut être déclaré conforme visuellement en l'état. L'authentification et la liste des Voyages n'ont aucune référence approuvée. Les imports et le détail d'Étape nécessitent encore une validation explicite de leur composition. La Trace possède une composition documentée depuis le template `12`, mais ses garanties fonctionnelles ne permettent pas encore une validation complète.

Aucun style ou composant visuel supplémentaire n'a été créé pendant cet audit.

## Synthèse des blocages

| Zone | Fonction V0 | Référence autorisée | État | Blocage principal |
|---|---|---|---|---|
| Connexion et inscription | Oui | Aucune | Bloqué visuellement | Les routes définissent actuellement leur propre présentation sans maquette approuvée. |
| Mot de passe oublié | Non livré | Aucune | Bloquant fonctionnel | L'action « Envoyer le lien » revient à l'écran précédent sans envoyer de demande et n'est pas signalée « À venir ». |
| Liste des Voyages | Oui | Aucune | Bloqué visuellement | Présentation libre, valeur d'espacement brute et absence d'état de chargement distinct. |
| Centre d'imports et confirmation | Oui | Template `14` après validation du mapping | Bloquant architecture/métier | La route construit directement les Adapters et le client Supabase ; la confirmation marque comme relus des champs qui ne sont pas tous présentés ou éditables. |
| Détail d'une Étape | Oui | Composition de `04`, `12` et `14` après validation | Bloqué visuellement | La route contient le rendu et les styles ; paramètres ou Modules absents peuvent laisser un chargement permanent. |
| Trace GPS dédiée | Conditionnelle | Langage visuel de `12` | Partiellement autorisé | Accès au Voyage non vérifié, suppression absente et synchronisation annoncée mais non composée par le Module actuellement injecté. |
| Shell applicatif | Oui | Fondations partagées | Non conforme à la route mince | Le layout appelle directement Supabase, construit l'Adapter de boîte de partage et affiche une date de synchronisation codée en dur. |

## Authentification

### Conforme au périmètre V0

- connexion et création des deux Comptes via le Module `identity` ;
- mot de passe conservé hors des Modules métier ;
- erreurs et états de soumission visibles ;
- aucune fonction sociale ou rôle supplémentaire introduit.

### Écarts constatés

- `sign-in.tsx` et `sign-up.tsx` contiennent leur `StyleSheet` et construisent les sections visuelles dans la route, contrairement au contrat de container mince ;
- les textes parlent du « shell », vocabulaire d'implémentation qui ne devrait pas être exposé comme promesse utilisateur ;
- `forgot-password.tsx` présente une action active qui n'appelle aucun Module et exécute seulement `router.back()` ;
- l'écran de récupération utilise `ShellFrame`, alors qu'il appartient au parcours non authentifié ;
- aucune capture ou maquette ne permet de valider la hiérarchie, l'image, les espacements ou les actions secondaires.

### Composition permise

En attendant une référence, seules les primitives fonctionnelles existantes (`AuthFrame`, `Input`, `Button`, état d'erreur) peuvent être conservées sans prétendre à une conformité 1:1. Le template `01-onboarding.html` ne définit pas les formulaires de connexion, d'inscription ou de récupération et ne doit pas être étendu implicitement à ces écrans.

Décision requise : fournir ou approuver une référence Auth. Tant que la récupération n'est pas branchée au Module `identity`, son action doit être explicitement désactivée et marquée « À venir » lors du lot qui possède cette route.

## Liste des Voyages

### Conforme au périmètre V0

- lecture des Voyages via `TripsModule.list()` ;
- ouverture par identifiant seulement ;
- création d'un Voyage et état vide autorisés en V0 ;
- absence de données de démonstration.

### Écarts constatés

- le rendu complet vit dans la route au lieu d'un composant `src/screens` indépendant ;
- l'espacement `12` est une valeur visuelle brute et non un token du thème ;
- avant la fin de `trips.list()`, l'état vide peut apparaître à la place d'un état de chargement ;
- aucune référence ne permet d'approuver la carte, les métadonnées ou la navigation.

### Composition permise

Le plan ne valide encore aucune composition. Après décision visuelle, l'en-tête, les cartes de Voyage et les états peuvent reprendre le langage du dashboard `04`, sans reproduire ses contenus propres au Voyage actif. Aucun style supplémentaire ne doit être inventé avant cette décision.

## Centre d'imports et confirmation

### Conforme au périmètre V0

- choix explicite du Voyage avant analyse ;
- réception des imports persistés par la boîte native ;
- extraction locale du texte pour PDF ou image ;
- brouillon distinct de la Réservation confirmée ;
- détection de doublon et états hors ligne/réessai ;
- aucun scraping d'une URL authentifiée visible dans cette route.

### Écarts bloquants

1. La route construit `createAppleShareInbox`, `createAppleDocumentTextExtractor`, `createOpenCodeDocumentAnalyzer` et `createSupabaseClient`. Elle contourne ainsi la composition racine et appelle directement les Seams externes, contrairement à l'architecture et à `templates/ui/route-map.md`.
2. `DraftCard` n'affiche qu'une partie du `ReservationDraft`, puis transmet automatiquement toute la liste `fieldsRequiringConfirmation` comme `confirmedFields`. Des dates, lieux ou autres champs peuvent donc être déclarés relus sans être visibles ou modifiables. Cela ne satisfait pas la confirmation humaine obligatoire.
3. Le fichier choisi depuis Fichiers est copié dans le cache par le picker. La route ne démontre pas sa copie immédiate vers un stockage persistant ni la création d'un `TravelDocument` privé avant la confirmation.
4. La route contient sections, styles, orchestration d'analyse, récupération native et persistance. Elle n'est pas un container mince.
5. `CONTEXT.md` et `TASKS.md` ne nomment pas le même fournisseur d'analyse documentaire. Le code et `TASKS.md` utilisent OpenCode, alors que le contexte racine décrit un fallback cloud OpenAI soumis à décision. Cette divergence métier doit être tranchée dans la source de vérité avant validation UI ; l'écran ne doit pas figer implicitement le fournisseur.

### Composition permise

Après validation du mapping, les cartes de Documents, les badges privés et la timeline de confirmation peuvent reprendre le langage du template `14`. Le centre d'attente, le choix du Voyage et l'éditeur complet de brouillon restent des écrans sans référence directe : leur composition doit être approuvée séparément. L'orchestration doit être cachée derrière le Module `reservations` et les Adapters composés à la racine.

## Détail d'une Étape

### Conforme au périmètre V0

- chargement de l'Étape via le Voyage courant ;
- Documents filtrés par `tripId` et `stopId` ;
- aucun lieu, horaire ou contenu fictif ;
- Documents privés et état vide visibles.

### Écarts constatés

- le rendu, le formatage de taille et le `StyleSheet` vivent dans la route ;
- les paramètres ne sont pas validés comme chaînes non vides ;
- lorsque les paramètres ou un Module manquent, aucun état d'erreur n'est posé et l'écran peut rester en chargement ;
- une Étape inexistante n'est pas distinguée d'un chargement en cours ;
- aucune décision visuelle n'approuve encore l'assemblage de ses sections.

### Composition permise

Après validation explicite : identité de l'Étape depuis `04`, chronologie et dates locales depuis `12`, Documents associés depuis `14`. Les sous-sections ne doivent être rendues que si les Modules fournissent des données réelles. Les autres capacités restent visibles, désactivées et marquées « À venir » uniquement si la composition approuvée les prévoit.

## Trace GPS dédiée

### Conforme au périmètre V0

- route séparée et composant d'écran indépendant ;
- démarrage et arrêt explicites ;
- consentement requis avant le démarrage ;
- un seul Voyage enregistré sur l'appareil ;
- compteurs dérivés de vrais points WGS84 ;
- aucune coordonnée brute ni position live d'un Membre affichée ;
- section famille visible, désactivée et marquée « À venir ».

### Écarts et gates restants

- la route ne vérifie pas l'appartenance au Voyage avant de démarrer une Trace locale pour le `tripId` reçu ;
- l'Interface `TripTrackingModule` ne propose ni suppression de la Trace ni politique de purge, pourtant requises par le périmètre GPS ;
- l'écran affirme que les points locaux reprennent leur synchronisation, mais `createAppModules()` injecte actuellement un stockage fichier local sans upload serveur ;
- le rapport de spike et `GPS-002` conservent les scénarios écran verrouillé, mode avion, reprise, force-quit et batterie comme non validés sur les deux iPhone ;
- `TASKS.md` décrit encore à la fois un livrable Transistorsoft terminé et un Adapter Expo open source bloqué. Le gate fournisseur et appareil doit être clarifié avant de présenter la Trace comme fiable pour le voyage réel.

### Composition permise

`docs/ui/screens/12-carte-itineraire.md` documente déjà la reprise du langage visuel de `12` pour la Trace. Cette composition est donc la seule base autorisée. Elle ne lève toutefois ni le contrôle d'accès, ni la suppression, ni les gates appareil et synchronisation.

## Shell applicatif

Le layout protégé construit directement la boîte de partage et effectue un `fetch` vers Supabase pour déduire la connectivité. Ces opérations doivent être cachées derrière les Modules ou une composition dédiée. La valeur `lastSyncedAt = "2026-07-29T08:30:00.000Z"` est présentée comme une donnée réelle alors qu'elle est codée en dur ; elle doit provenir d'un état de synchronisation réel ou ne pas être affichée.

## Ordre de résolution recommandé

1. Corriger la frontière du centre d'imports et fournir un véritable écran de relecture de tous les champs avant confirmation.
2. Vérifier l'accès au Voyage, la suppression et la synchronisation de la Trace ; terminer les gates appareil.
3. Retirer les données codées en dur et les appels externes du shell.
4. Approuver une référence pour Auth et liste des Voyages.
5. Approuver les compositions Imports et Étape, puis seulement déplacer leur rendu vers des composants `src/screens`.
6. Exécuter les captures 390/430 px et la validation VoiceOver après ces décisions.

## Décision de l'audit

- Auth : fonctionnel partiellement, conformité visuelle bloquée.
- Liste des Voyages : fonctionnelle, conformité visuelle bloquée.
- Imports : non validable avant correction architecture et confirmation humaine complète.
- Détail d'Étape : fonctionnel partiellement, conformité visuelle bloquée.
- Trace : composition visuelle documentée, validation métier/appareil incomplète.
- Shell : correction de composition et suppression de l'état fictif requises.

Aucune route n'a été modifiée pendant cet audit.
