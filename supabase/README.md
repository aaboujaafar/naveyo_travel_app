# BCK-001 — fondation Supabase

La migration crée le schéma P0, les rôles fixes `owner`/`editor`, les fonctions
RLS et le bucket privé `trip-documents`. Les chemins Storage ont la forme
`<tripId>/<documentId>.<extension>`.

```sh
supabase start
supabase db reset
supabase test db
```

`seed.sql` est une fixture locale uniquement. Les tests couvrent la lecture et
les écritures propriétaire/éditeur ainsi que l'absence de visibilité du compte
extérieur. Ils n'ont pas été exécutés ici : le CLI Supabase/Docker n'est pas
disponible dans cet environnement. Aucun type Supabase généré n'est ajouté
avant la première base distante stable.
