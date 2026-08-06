# ADR-0001 — Suivi GPS open source avec Expo

- Date : 6 août 2026
- Statut : accepté sous condition

## Décision

Naveyo utilise `expo-location` et `expo-task-manager` pour le suivi GPS iOS V0. Les points sont normalisés en WGS84, dédupliqués par clé d'idempotence et persistés localement avant une future synchronisation serveur.

## Raisons

- les modules sont open source et compatibles avec la chaîne Expo du projet ;
- aucune licence GPS commerciale n'est nécessaire ;
- l'implémentation reste derrière l'interface `LocationTracker` ;
- les permissions et le mode d'arrière-plan sont configurés par les plugins Expo.

## Limite acceptée

Sur iOS, le force-quit par l'utilisateur peut interrompre le suivi en arrière-plan. Le suivi ne sera déclaré fiable qu'après une validation sur les deux iPhone. Si cette limite est incompatible avec le voyage réel, le projet devra soit ajouter un module Swift Core Location local, soit couper le GPS continu de l'alpha.
