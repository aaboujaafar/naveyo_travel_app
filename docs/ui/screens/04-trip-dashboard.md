# Écran 04 — Tableau de bord Voyage

Référence visuelle : `templates/ui/04-trip-dashboard.html`.

## Données affichées

- Le titre, les dates, le nombre de Voyageurs, les Membres du voyage et les Étapes proviennent du Module `trips`.
- Les Réservations proviennent du stockage local partagé existant.
- Aucun lieu, montant, itinéraire, état de présence ou contenu social de démonstration n'est présenté comme une donnée réelle.

## Sections V0 actives

- actualisation du Voyage ;
- onglets Aujourd'hui, Carte, Adresses et Budget ;
- accès aux Suggestions IA, aux lieux via l'itinéraire, à la carte, aux Étapes, aux Réservations, aux Documents de voyage, aux Dépenses et aux réglages ;
- affichage des Réservations confirmées et des états vides ;
- ajout rapide d'un lieu ou d'une Dépense.

## Sections reproduites avec « À venir »

- chat et présence en ligne ;
- météo, alertes UV et pluie ;
- photos et journal ;
- location de voiture intégrée ;
- activité sociale de la famille ;
- ajout rapide d'une photo ou d'une note.

Ces sections sont visibles mais inactives et exposent leur état désactivé aux technologies d'assistance.

## Vérification

- [x] ordre général et hiérarchie du template reproduits ;
- [x] image hero et navigation fixe reproduites ;
- [x] zones tactiles principales d'au moins 44 points ;
- [x] états chargement, erreur, vide, actualisation et désactivé ;
- [x] valeurs de calendrier calculées sans dépendre du fuseau du téléphone ;
- [ ] comparaison par capture sur iPhone 390 px ;
- [ ] validation VoiceOver et tailles de texte sur appareil réel.

Écart assumé : le tableau de bord affiche les données réelles disponibles. Les contenus fictifs de Lisbonne du prototype ne remplacent jamais les données du Voyage courant.
