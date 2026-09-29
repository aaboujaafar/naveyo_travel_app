# Dépannage de la recherche de lieux

La recherche passe par la fonction Edge `places-search`, puis par Geoapify. Le secret Geoapify ne doit jamais être embarqué dans l’application mobile.

## Déploiement

Depuis la racine du projet (avec le projet Supabase lié) :

```bash
supabase secrets set GEOAPIFY_API_KEY="<clé-Geoapify>"
supabase secrets set UNSPLASH_ACCESS_KEY="<access-key-Unsplash>"
supabase functions deploy places-search
```

`UNSPLASH_ACCESS_KEY` est séparée de la clé Geoapify. Si elle n’est pas définie, la recherche reste fonctionnelle avec les images locales de secours.

La fonction doit être accessible à :

```text
https://<project-ref>.supabase.co/functions/v1/places-search
```

Après une modification de l’adaptateur mobile, recharger le bundle Expo ou reconstruire le build iOS utilisé pour le test.

## Diagnostic dans l’application

Les erreurs HTTP affichent maintenant le code renvoyé par la fonction :

- `places_provider_unavailable` : secret `GEOAPIFY_API_KEY` absent dans Supabase ;
- `trip_membership_required` : le compte connecté n’est pas membre du Voyage ;
- `places_quota_reached` : quota Geoapify atteint ;
- `places_provider_failed` : Geoapify ou la fonction est indisponible.

Une recherche de ville nécessite au moins deux caractères et un `tripId` valide appartenant au compte connecté.
