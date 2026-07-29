# SPI-001 — Spike GPS

Date du spike : 2026-07-29  
Branche : `spi-001-gps-spike`

## Résultat

Décision : `BLOCKED`

Le spike ne peut pas valider honnêtement le comportement GPS de bout en bout dans cet environnement, parce que :

- aucun iPhone réel n’est disponible ici ;
- aucune build installable n’a été produite pour la vérification terrain ;
- aucune dépendance GPS de type Transistorsoft n’est présente dans `package.json` ;
- les scénarios obligatoires du spike demandent écran verrouillé, mode avion, reprise et force-quit sur appareil.

## Ce qui a été vérifié localement

- la branche de travail est bien `spi-001-gps-spike` ;
- `app.config.ts` référence déjà `./plugins/withNaveyoTracking` ;
- `plugins/withNaveyoTracking.ts` prépare maintenant les permissions iOS de localisation et le mode de fond `location` ;
- un rapport typé vit les faits du spike dans `src/spikes/gps/report.ts` ;
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

`BLOCKED` signifie ici : je ne peux pas conclure sur la fiabilité réelle du GPS sans la dépendance GPS et sans validation sur appareil.

Je ne recommande pas `GO Transistorsoft` sur la seule base de ce spike local.

Je ne recommande `FALLBACK` que si le coordinateur choisit explicitement une autre stratégie après ajout d’une vraie build device et d’un SDK de remplacement.

## Prochaine action utile

Le prochain passage doit :

1. ajouter la dépendance GPS retenue par le coordinateur ;
2. produire une development build installable ;
3. exécuter le scénario complet sur deux iPhone réels ;
4. consigner les pertes, la reprise, la batterie et les limites iOS observées.
