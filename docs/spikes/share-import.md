# SPI-002 — Share Extension et import durable

Date du spike : 29 juillet 2026.

Objectif : vérifier jusqu’où on peut aller localement sur le parcours “Partager vers Naveyo” sans toucher aux fichiers racine ni au projet natif généré, puis documenter précisément ce qui manque encore pour valider une vraie Share Extension sur iPhone.

## Ce qui a été implémenté localement

- un petit vault de spike dans `src/spikes/share-import/` ;
- copie durable d’un payload de fichier depuis une URI temporaire vers un stockage persistant ;
- persistence de partages texte, URL et ICS sans dépendre d’une URI source durable ;
- rechargement après “relance” via lecture du manifeste sur disque ;
- traitement explicite d’un payload manquant ;
- prise en compte d’une source `travel-app` en plus de Mail, Safari et Photos.

## Ce qui a été vérifié localement

- un PDF factice est copié hors de son URI temporaire ;
- le manifeste ne conserve pas l’URI temporaire ;
- un partage texte reste lisible après réouverture du vault ;
- un partage URL reste capturé sans tentative de scraping ;
- un partage ICS est copié avec son type MIME et ses limites ;
- un payload invalide est rejeté avant la création du dossier d’import ;
- un import dont le fichier a disparu est listé avec l’état `missing` ;
- un manifeste qui pointe hors de son dossier est ignoré ;
- un import rechargé retrouve bien son état durable ;
- un import cassé retourne un échec explicite au lieu d’inventer une reprise.

## Implémentation de la Share Extension

Le plugin Expo configure désormais une vraie cible iOS `NaveyoShare` avec :

- une extension de partage activée pour les PDF, images, textes et URLs ;
- une copie immédiate dans l’App Group `group.com.naveyo.app` ;
- un manifeste persistant par import ;
- une ouverture de Naveyo sur l’écran d’association au Voyage ;
- une suppression du fichier partagé après confirmation de la Réservation.

L’extension ne choisit pas le Voyage elle-même : elle ouvre l’application principale afin d’utiliser la session et la liste des Voyages Supabase. Le choix du Voyage précède l’analyse OpenCode.

## Ce qui reste à vérifier sur appareil

- le transport entre extension et app hôte sur iPhone réel ;
- les partages réels depuis Mail, Safari, Photos et une application de voyage ;
- la reprise après relance sur iOS 26 / iOS 27 ;
- le fallback depuis Fichiers / Photos en environnement iOS natif ;
- toute intégration avec `app.config.ts` ou les identifiants de provisioning.

## Limite confirmée du spike

Ce spike démontre le comportement durable attendu dans un environnement de test, mais il ne prouve pas la mécanique native de l’extension, ni la configuration App Group. Sans credentials et sans exécution sur iPhone, la validation finale reste bloquée.

Le plugin `withNaveyoDocuments` reste volontairement neutre tant que l’identifiant App Group, le bundle identifier de l’extension et les entitlements Apple ne sont pas fournis. Il ne faut pas générer de valeurs fictives dans `app.config`.

## Décision

Le design retenu pour la suite est :

- copier immédiatement le payload hors de l’URI temporaire ;
- écrire un manifeste persistant ;
- relire le manifeste au redémarrage ;
- ne jamais considérer l’URI temporaire comme source de vérité ;
- garder les URLs en mode “capture only”, sans scraping.

## Validation souhaitée ensuite

- build de développement iOS avec l’extension Share active ;
- test sur iPhone réel avec Mail, Safari, Photos et une app de voyage ;
- vérification App Group ;
- redémarrage de l’app et reprise de l’import ;
- import depuis Fichiers et Photos comme fallback.
