# Centre d’import et confirmation documentaire

## Références

- Route : `app/(app)/imports/index.tsx`
- Écran : `src/screens/ReservationImportScreen.tsx`
- Références visuelles : `templates/ui/14-checklist-documents.html` et `templates/ui/19-booking-esim.html`
- Périmètre métier : `RSV-001`, `OCR-001` et `INT-102`

Le centre reprend la hiérarchie chaleureuse du template Checklist & Documents : en-tête compact, onglets en pilules, cartes blanches, zone de dépôt, liste de documents et statuts visibles. Le template Préparer & Réserver fournit la densité des cartes de réservation et la séparation des sections. Les données de Lisbonne, les partenaires et les prix des maquettes ne sont jamais embarqués.

## Parcours V0 actif

- association explicite de l’import à un Voyage réel ;
- reprise des `PendingImport` persistants (`new`, `seen`, `processing`, `failed`, `confirmed`) ;
- sélection d’un PDF, JPEG ou PNG depuis le sélecteur système, ou collage de texte ;
- limite affichée et validée à 25 Mo, avec une analyse plafonnée à 50 pages ;
- extraction PDFKit/Vision sur l’iPhone avant analyse du texte ;
- consentement explicite avant l’envoi du texte extrait à OpenCode Go via l’Edge Function Supabase de Naveyo ;
- production d’un `ReservationDraft`, recherche de doublon et gestion des états chargement, erreur et hors ligne ;
- confirmation manuelle de chaque champ persisté : toutes les cases sont décochées par défaut et l’enregistrement reste désactivé tant que chaque valeur n’a pas été relue ;
- pour chaque adresse détectée, Geoapify propose des candidats de lieu, départ ou arrivée ; la sélection reste humaine et une adresse peut rester non géolocalisée ;
- les coordonnées, identifiants fournisseur et attributions ne sont persistés qu’après confirmation de la Réservation ;
- conservation du fuseau IANA à côté des dates locales ;
- persistance uniquement après confirmation humaine, puis navigation vers les Réservations du Voyage.

Une URL authentifiée n’est pas scrapée. Le document original n’est pas envoyé à l’analyse distante. Un échec d’analyse ne crée aucune Réservation et laisse l’import disponible pour une nouvelle tentative.

## Sections visibles mais hors V0

Les blocs suivants restent visibles, désactivés et marqués « À venir » :

- checklist avancée et progression globale de préparation ;
- comparateurs et réservations intégrées pour vols, hôtels, voitures ou activités ;
- eSIM, liens partenaires et configuration APN.

La packing list collaborative est désormais une fonctionnalité V0 et sera accessible depuis l'écran dédié du Voyage ; elle n'est pas incluse dans le parcours d'import.

Les passeports, visas et documents d’identité montrés dans la référence Checklist ne sont pas reproduits, car ils sont explicitement exclus du périmètre et introduiraient des données particulièrement sensibles.

## États couverts

- centre vide ;
- chargement de la boîte de réception privée ;
- import à associer, à traiter, en cours, en échec ou confirmé ;
- analyse en cours ;
- brouillon incomplet ;
- doublon ;
- erreur de sélection, d’extraction, d’analyse ou d’enregistrement ;
- hors ligne avec reprise ultérieure ;
- confirmation partielle ou complète.

## Validation restante sur appareil

La conformité finale reste conditionnée à une development build et aux essais depuis Mail, Safari, Fichiers, Photos et une application de réservation réelle, ainsi qu’aux captures comparatives sur les deux formats d’iPhone et à VoiceOver.

## Dette architecturale préexistante

La route d’import construisait déjà directement le sélecteur de documents, l’inbox native, l’extracteur Apple, le client Supabase et l’analyseur OpenCode avant ce lot UI. Le rendu a été extrait dans un écran dédié, mais cette orchestration ne peut pas être déplacée correctement sans intervenir dans `src/modules/reservations` et/ou `src/bootstrap`, hors du périmètre possédé par ce sous-lot. La déplacer dans le composant d’écran ne ferait que déplacer la violation. Un prochain lot doit fournir au routeur une Interface de parcours d’import déjà composée par le bootstrap.
