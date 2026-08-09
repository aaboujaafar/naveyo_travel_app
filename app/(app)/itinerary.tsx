import { useEffect, useState } from 'react';
import { loadItineraryView, useNaveyoBootstrap } from '../../src/bootstrap';
import type { ItineraryView } from '../../src/bootstrap';
import { SectionRoute } from '../../src/ui/SectionRoute';

export default function ItineraryRoute() {
  const bootstrap = useNaveyoBootstrap();
  const [view, setView] = useState<ItineraryView | null>(null);

  useEffect(() => {
    if (!bootstrap?.currentTripId) return;
    let active = true;
    void loadItineraryView(bootstrap, bootstrap.currentTripId).then((result) => {
      if (active) setView(result);
    });
    return () => {
      active = false;
    };
  }, [bootstrap]);

  const statusTitle = view ? `${view.items.length} élément(s) dans l’itinéraire` : 'Itinéraire vide';
  const statusMessage = view
    ? view.items.map((item) => `${item.date} · ${item.title}`).join(' · ') || 'Aucun élément confirmé'
    : 'Les dates sans heure resteront rattachées au fuseau de leur Étape.';

  return <SectionRoute title="Itinéraire" subtitle="La consultation chronologique du Voyage." statusTitle={statusTitle} statusMessage={statusMessage} action={{ label: 'Ouvrir les Imports', route: '/(app)/imports' }} />;
}
