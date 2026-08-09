import { useEffect, useState } from 'react';
import { loadTripWorkspace, useNaveyoBootstrap } from '../../src/bootstrap';
import type { TripWorkspace } from '../../src/bootstrap';
import { SectionRoute } from '../../src/ui/SectionRoute';

export default function TripRoute() {
  const bootstrap = useNaveyoBootstrap();
  const [workspace, setWorkspace] = useState<TripWorkspace | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!bootstrap?.currentTripId) return;
    let active = true;
    void loadTripWorkspace(bootstrap, bootstrap.currentTripId)
      .then((result) => {
        if (active) setWorkspace(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [bootstrap]);

  const statusTitle = error
    ? 'Voyage indisponible'
    : workspace?.trip.name ?? (bootstrap?.currentTripId ? 'Chargement du Voyage' : 'Aucun Voyage sélectionné');
  const statusMessage = error
    ? 'Impossible de charger le Voyage. Réessayez lorsque la connexion est disponible.'
    : workspace
      ? `${workspace.stops.length} Étape(s) · devise ${workspace.trip.referenceCurrency}`
      : 'Le bootstrap attend le Voyage sélectionné par la navigation.';

  return <SectionRoute title="Voyage" subtitle="Le cadre commun de préparation." statusTitle={statusTitle} statusMessage={statusMessage} action={{ label: 'Voir les Étapes', route: '/(app)/stops' }} />;
}
