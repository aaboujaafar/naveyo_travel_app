# SPI-001 — Spike GPS

Date du spike : 2026-07-29  
Branche : `spi-001-gps-spike`

## Résultat

Décision : `BLOCKED` — implémentation open source en cours de validation appareil

Le spike ne peut pas valider honnêtement le comportement GPS de bout en bout dans cet environnement, parce que :

- aucun iPhone réel n’est disponible ici ;
- aucune build installable n’a été produite pour la vérification terrain ;
- la stratégie retenue est `expo-location` + `expo-task-manager`, sans SDK GPS commercial ;
- la persistance locale utilise `expo-file-system` ;
- les scénarios obligatoires du spike demandent écran verrouillé, mode avion, reprise et force-quit sur appareil.

## Ce qui a été vérifié localement

- la branche de travail est bien `spi-001-gps-spike` ;
- `app.config.ts` référence déjà `./plugins/withNaveyoTracking` ;
- `plugins/withNaveyoTracking.ts` prépare maintenant les permissions iOS de localisation et le mode de fond `location` ;
- un rapport typé vit les faits du spike dans `src/spikes/gps/report.ts` ;
- l’écran Trace de trajet permet le démarrage et l’arrêt explicites sur appareil ;
- les tests locaux couvrent le rapport, la fusion des modes de fond et les valeurs du `Info.plist`.

## Matrice de scénario

Les scénarios suivants restent non exécutés ici :

- marche d’au moins 1 km ;
- immobilité de 30 minutes ;
- écran verrouillé ;
- une heure en mode avion puis retour en ligne ;
- force-quit puis relance ;
- répétition sur le second modèle d’iPhone.

## Décision honnête

`BLOCKED` signifie ici : la stratégie open source est implémentée localement, mais je ne peux pas conclure sur sa fiabilité réelle sans validation sur appareil. Le force-quit iOS peut interrompre un suivi basé sur Expo.

Je ne recommande pas `GO` sur la seule base des tests locaux.

Je ne recommande `FALLBACK` que si le coordinateur choisit explicitement une autre stratégie après ajout d’une vraie build device et d’un SDK de remplacement.

## Prochaine action utile

Le prochain passage doit :

1. produire une development build installable ;
2. démarrer la Trace de trajet depuis l’écran du Voyage ;
3. exécuter le scénario complet sur deux iPhone réels ;
4. consigner les pertes, la reprise, la batterie et les limites iOS observées ;
5. décider si la limite du force-quit est acceptable pour l’alpha.
