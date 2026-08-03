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

## Garde-fous locaux

Le vault valide à l’exécution les entrées reçues et les manifestes relus après `JSON.parse`. Un manifeste corrompu est ignoré et un chemin de payload qui sort du dossier de l’import est rejeté.

Les limites appliquées avant la copie sont : 100 imports conservés, 25 MiB par PDF, 20 MiB par JPEG/PNG, 1 MiB par ICS, 256 KiB par texte ou URL, et 1 à 20 pages lorsque `pageCount` est fourni. Le nombre de pages d’un PDF n’est pas calculé par ce spike Node ; il sera contrôlé par le futur module PDFKit/OCR.

Les types acceptés sont PDF, JPEG/PNG et ICS (`text/calendar` ou `application/ics`). Une URL est uniquement capturée si elle est HTTP(S) ; elle n’est jamais ouverte, téléchargée ou scrapée.

## Ce qui a été vérifié localement

- un PDF factice est copié hors de son URI temporaire ;
- le manifeste ne conserve pas l’URI temporaire ;
- un partage texte reste lisible après réouverture du vault ;
- un partage URL reste capturé sans tentative de scraping ;
- un partage ICS est copié avec son type et ses limites ;
- un payload trop volumineux, une date, une URL, un MIME, un nombre de pages ou un manifeste invalide est rejeté ;
- un import rechargé retrouve bien son état durable ;
- un import cassé retourne un échec explicite au lieu d’inventer une reprise.

## Ce qui reste non vérifiable ici

- la vraie Share Extension iOS ;
- les entitlements App Group ;
- la configuration et le transport App Group entre extension et app hôte sur iPhone réel ;
- les partages réels depuis Mail, Safari, Photos et une application de voyage (Airbnb/Booking inclus si disponible) ;
- la reprise après relance sur iOS 26 / iOS 27 ;
- le fallback depuis Fichiers / Photos en environnement iOS natif ;
- toute intégration avec `app.config.ts` ou les identifiants de provisioning.

## Limite confirmée du spike

Ce spike démontre le comportement durable attendu dans un environnement de test, mais il ne prouve pas la mécanique native de l’extension, ni la configuration App Group. Sans credentials et sans exécution sur iPhone, la validation finale reste bloquée.

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
