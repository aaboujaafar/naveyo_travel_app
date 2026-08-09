import { useEffect, useState } from 'react';
import { loadTripWorkspace, useNaveyoBootstrap } from '../../src/bootstrap';
import type { TripWorkspace } from '../../src/bootstrap';
import { SectionRoute } from '../../src/ui/SectionRoute';

export default function StopsRoute() {
  const bootstrap = useNaveyoBootstrap();
  const [workspace, setWorkspace] = useState<TripWorkspace | null>(null);

  useEffect(() => {
    if (!bootstrap?.currentTripId) return;
    let active = true;
    void loadTripWorkspace(bootstrap, bootstrap.currentTripId).then((result) => {
      if (active) setWorkspace(result);
    });
    return () => {
      active = false;
    };
  }, [bootstrap]);

  const statusTitle = workspace ? `${workspace.stops.length} Étape(s)` : 'Aucune Étape chargée';
  const statusMessage = workspace
    ? workspace.stops.map((stop) => `${stop.name} (${stop.countryCode}, ${stop.timeZone})`).join(' · ')
    : 'Les dates locales et fuseaux IANA seront rendus par le Module Voyage composé au démarrage.';

  return <SectionRoute title="Étapes" subtitle="Séjours, pays et fuseaux horaires." statusTitle={statusTitle} statusMessage={statusMessage} action={{ label: 'Explorer les lieux', route: '/(app)/places' }} />;
}
