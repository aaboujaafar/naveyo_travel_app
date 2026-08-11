# UI-120 — Invitation au Voyage

Référence visuelle : `templates/ui/03-invite-family.html`

Route Naveyo : `app/(app)/trips/[tripId]/invite.tsx`

## Sections reproduites

| Section du template | État Naveyo V0 | Traitement |
|---|---|---|
| En-tête et introduction | Compatible | Reproduits avec le vocabulaire Naveyo (`Voyage`, `Compte`, `Membre du voyage`). |
| Arbre familial | Hors V0 | Visible, désactivé et marqué « À venir ». |
| Lien d'invitation | Compatible | Le deep link privé est affiché après création de l'invitation. |
| WhatsApp, SMS et e-mail | Compatible via iOS | Ouvrent la feuille de partage native lorsque l'invitation existe. |
| Contacts récents | Hors V0 | Visible, désactivé et marqué « À venir ». Aucun accès au carnet d'adresses. |
| Membres du voyage | Compatible | Affiche les comptes réellement présents dans le Voyage et l'invitation courante. |
| Ajout d'un membre | Compatible | Limité à l'adresse e-mail du second Compte et au rôle `editor`, conformément au Module `trips`. |
| Rôles et permissions personnalisés | Hors V0 | Aperçu visible, désactivé et marqué « À venir ». Aucun rôle autre que propriétaire/éditeur n'est introduit. |
| Rappels automatiques | Hors V0 | Visible, désactivé et marqué « À venir ». |
| Actions de pied de page | Compatible | « Lancer le voyage » et « Passer » ouvrent le Voyage créé. |

## Interactions vérifiées

- validation et normalisation de l'adresse e-mail avant appel du Module ;
- création de l'invitation par `TripsModule.createInvitation` dans la route mince ;
- affichage de l'état d'erreur et de l'invitation créée ;
- génération du deep link `naveyo://invite/<token>` vers la route d'acceptation existante ;
- partage explicite par la feuille iOS, sans envoi automatique ;
- aucune fonctionnalité de contacts, notification ou permission personnalisée activée.

## Validation visuelle restante

- comparer sur un iPhone en largeur 390 px puis 430 px ;
- vérifier le clavier e-mail, les safe areas et le pied de page fixe ;
- contrôler VoiceOver et les tailles de texte réelles ;
- approuver les écarts nécessaires dus au modèle V0 à deux comptes et à l'absence de rôles personnalisés.
