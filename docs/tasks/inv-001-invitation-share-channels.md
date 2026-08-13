# INV-001 — Canaux d’envoi d’une invitation

Date : 11 août 2026
Branche : `inv-001-invitation-share-channels`
Statut : implémenté localement, validation iPhone restante

## Objectif

Permettre au propriétaire d’un Voyage de transmettre le lien d’une invitation existante par trois chemins iOS :

- WhatsApp, si l’application est installée ;
- SMS, via le composeur iOS ;
- Partage, via la feuille de partage système et les autres applications disponibles.

Le canal ne crée pas une nouvelle identité et n’envoie pas directement l’invitation. Les boutons sont actifs sans e-mail : au premier appui, Naveyo crée une Invitation de Voyage libre puis transporte son lien privé. Une adresse e-mail facultative peut être fournie pour limiter l’acceptation au Compte correspondant. Dans les deux cas, l’acceptation exige un Compte authentifié.

## Développement prévu

1. Définir un Module de partage avec une petite Interface indépendante de React Native.
2. Construire un message commun à partir du nom du Voyage et du lien `naveyo://invite/<token>`.
3. Ajouter un Adapter iOS pour les URL schemes WhatsApp/SMS et pour `Share.share`.
4. Relier le Module au bootstrap afin que la route d’invitation n’assemble aucun URL scheme.
5. Remplacer les faux boutons « Email » par « Partage », activer le lien sans e-mail et gérer les canaux indisponibles.
6. Rendre l’e-mail facultatif côté Module Voyages, Supabase et écran d’acceptation.
7. Couvrir les URL, l’encodage, l’annulation de la feuille système et l’absence d’application par des tests de Module.

## Réalisation

Le Module `src/modules/invitation-sharing/` expose une seule opération `share`. Il masque :

- le format du message ;
- l’encodage du message dans WhatsApp et SMS ;
- le résultat normalisé `opened`, `cancelled` ou `unavailable`.

L’Adapter `src/adapters/invitation-sharing/` est le seul endroit qui connaît `Linking` et `Share` de React Native. La configuration Expo ajoute uniquement `whatsapp` à `LSApplicationQueriesSchemes`, nécessaire à `Linking.canOpenURL` sur iOS.

L’écran d’invitation propose désormais :

| Action | Comportement |
| --- | --- |
| WhatsApp | ouvre `whatsapp://send` avec le message encodé |
| SMS | ouvre `sms:?&body=` avec le message encodé |
| Partage | ouvre la feuille de partage iOS |

Les trois actions sont actives sans e-mail. Le premier appui crée l’invitation libre puis ouvre le canal choisi. Un e-mail facultatif reste disponible pour lier l’invitation à un Compte précis. Quand WhatsApp ou le canal sélectionné n’est pas disponible, l’écran conserve l’invitation et propose explicitement le partage générique ou le SMS.

## Fichiers principaux

- `src/modules/invitation-sharing/interface.ts`
- `src/modules/invitation-sharing/module.ts`
- `src/modules/invitation-sharing/module.test.ts`
- `src/adapters/invitation-sharing/index.ts`
- `src/bootstrap/index.ts`
- `src/bootstrap/app-modules.ts`
- `app/(app)/trips/[tripId]/invite.tsx`
- `src/screens/InviteFamilyScreen.tsx`
- `app.config.ts`
- `supabase/migrations/20260811000700_optional_trip_invitation_email.sql`
- `CONTEXT.md`

## Validation exécutée

- `pnpm test -- src/modules/invitation-sharing/module.test.ts src/screens/invite-family-model.test.ts` — 171 tests passent ; le script actuel exécute toute la suite Vitest.
- `pnpm typecheck` — passe.
- `pnpm lint` — passe, avec un warning préexistant dans `.expo/types/router.d.ts`.
- `git diff --check` — les seuls espaces finaux signalés sont préexistants dans `src/adapters/supabase/trip-assistant/index.ts`.

## À valider sur iPhone

La validation native reste nécessaire dans une development build sur les deux iPhone cibles :

- WhatsApp installé puis absent ;
- SMS avec et sans carte SIM/configuration de messagerie ;
- feuille Partage vers Messages, WhatsApp et une autre application ;
- lien reçu, ouverture de Naveyo et acceptation avec le Compte correspondant à l’adresse invitée ;
- VoiceOver et zone tactile des trois boutons.
- migration `20260811000700_optional_trip_invitation_email.sql` appliquée et testée avec les deux membres et un Compte extérieur.

Cette branche ne prétend pas confirmer qu’un message a été envoyé : elle confirme seulement l’ouverture du composeur ou de la feuille de partage. Aucun fournisseur WhatsApp/SMS, backend supplémentaire ou journalisation du lien n’est ajouté.
