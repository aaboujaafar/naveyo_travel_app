# Écran 11 — Budget du Voyage

Référence visuelle : `templates/ui/11-budget.html`.

## Données réelles utilisées

La route lit le Voyage et le Module `expenses` déjà composés à la racine. Le Budget global, les Dépenses et les totaux affichés proviennent exclusivement de ce Module. Les montants sont saisis et conservés en unité mineure avec une devise ISO 4217 ; les conversions éventuelles restent celles du Module.

## Sections V0 actives

- définition du Budget global dans la devise de référence du Voyage ;
- synthèse dépensé, restant et progression ;
- répartition calculée à partir des Dépenses réelles par catégorie ;
- filtres et liste des Dépenses ;
- ajout manuel d'une Dépense avec montant d'origine, devise, catégorie et date locale ;
- états chargement, vide, erreur et nouvelle tentative.

## Sections visibles avec « À venir »

- répartition entre Voyageurs, dettes, créances et règlements ;
- alertes automatiques par enveloppe ou catégorie ;
- justificatif photo depuis le formulaire de Dépense.

Ces fonctions restent visibles pour conserver la structure du template, mais elles sont inactives et signalées comme indisponibles aux technologies d'assistance.

## Vérification

- [x] hiérarchie et sections principales du template reproduites ;
- [x] aucune Dépense de démonstration injectée ;
- [x] argent manipulé en unité mineure et devise ISO 4217 ;
- [x] aucun split, dette ou règlement calculé ;
- [x] états chargement, vide, erreur et désactivé ;
- [ ] comparaison visuelle sur iPhone 390/430 px ;
- [ ] validation VoiceOver et tailles de texte sur appareil réel.

Écart assumé : le template contient des exemples chiffrés et une répartition sociale. L'écran affiche uniquement les valeurs disponibles pour le Voyage courant et neutralise les fonctions hors V0.
