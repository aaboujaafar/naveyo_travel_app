# Onboarding — contrat de conformité

Le template `templates/ui/01-onboarding.html` est une page de bienvenue progressive : un hero, un carrousel de trois messages, les bénéfices, « Comment ça marche », un aperçu des autorisations et deux actions (« Créer mon premier voyage » / « J’ai déjà un compte »).

## États testables

- `normalizeOnboardingSlide` borne l’index actif entre les trois slides ; le carrousel peut revenir au premier élément après le dernier.
- `nextOnboardingSlide(..., reducedMotion: true)` conserve l’index actif : aucune animation ou avance automatique ne doit être imposée lorsque le système demande la réduction des mouvements.
- La première visite est déterminée par un état persistant explicite : `shouldShowOnboarding(true)` affiche l’écran, `false` le contourne.
- Les CTA sont distincts : création vers l’inscription, compte existant vers la connexion.
- Aucune permission iOS n’est demandée à l’ouverture. Photos, notifications, localisation et GPS sont expliqués seulement ; chaque demande réelle intervient dans son parcours fonctionnel avec consentement.

## Compatibilité V0

Les fonctions disponibles sont la collaboration privée autour d’un Voyage, les Suggestions IA de lieux contrôlés et la consultation d’un paquet hors ligne. Le récapitulatif social/photos/export visible dans le template est « À venir » pour V0 ; il ne doit pas être présenté comme livré. Le carrousel peut rester informatif, mais aucun contenu fictif ne doit être écrit comme une donnée du Compte.
