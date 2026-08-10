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

## Échantillonnage adaptatif — GPS-002

La tâche native conserve une configuration stable pendant toute la session. Elle utilise une précision élevée avec un seuil natif de 20 m, la pause automatique iOS et la livraison différée en arrière-plan. Elle n'est ni arrêtée ni réenregistrée à chaque point.

Un moteur déterministe et persistant classe les mesures en `STATIONARY`, `WALKING` ou `FAST_MOVING` à partir de la vitesse fournie, ou d'une vitesse dérivée de la distance et du temps lorsque la vitesse est absente. Trois mesures soutenues pendant au moins 15 secondes confirment un mouvement. Le retour à l'arrêt exige quatre mesures sur au moins deux minutes.

Les points conservés visent environ 25 m à pied et 75 m en déplacement rapide. À l'arrêt, seuls un déplacement significatif ou un point de présence après 15 minutes sont conservés. Les mesures imprécises au-delà de 75 m et les horodatages non croissants sont ignorés.

Cette stratégie doit encore être validée sur appareil pendant une journée représentative. Le rapport final doit comparer fidélité visuelle, nombre de points et consommation de batterie ; les options natives réduisent théoriquement l'activité en arrière-plan, mais aucun gain chiffré ne sera affirmé sans mesure réelle.

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

## Audit GPS-002 — 10 août 2026

L'audit local confirme les garanties suivantes :

- `STATIONARY → WALKING → FAST_MOVING` est confirmé par plusieurs mesures et une durée minimale ; le retour vers `STATIONARY` est plus lent pour éviter les bascules permanentes ;
- la vitesse fournie par le fournisseur est utilisée lorsqu'elle est valide, sinon la vitesse est dérivée de la distance haversine et du temps écoulé ;
- les seuils de conservation visent environ 25 m à pied, 75 m en déplacement rapide et un battement très espacé à l'arrêt ;
- les horodatages non croissants et les positions trop imprécises sont ignorés ;
- l'état adaptatif est persisté avec les points et conservé lorsqu'un lot différé contient plusieurs positions ;
- le second démarrage d'une même trace ne réenregistre pas le task natif ; la configuration native reste stable pendant la session.

Les tests locaux couvrent ces points dans `src/modules/trip-tracking/adaptive.test.ts`,
`src/adapters/expo-location/options.test.ts` et `src/adapters/expo-location/normalize.test.ts`.

Cette vérification reste une validation de code et de tests unitaires. Elle ne mesure ni la
fidélité d'une trace réelle, ni la consommation de batterie, ni la continuité écran verrouillé,
mode avion ou force-quit sur iPhone. Ces scénarios restent à exécuter sur les deux appareils
réels avant de remplacer `BLOCKED` par une décision de validation terrain.

Je ne recommande `FALLBACK` que si le coordinateur choisit explicitement une autre stratégie après ajout d’une vraie build device et d’un SDK de remplacement.

## Prochaine action utile

Le prochain passage doit :

1. produire une development build installable ;
2. démarrer la Trace de trajet depuis l’écran du Voyage ;
3. exécuter le scénario complet sur deux iPhone réels ;
4. consigner les pertes, la reprise, la batterie et les limites iOS observées ;
5. décider si la limite du force-quit est acceptable pour l’alpha.
