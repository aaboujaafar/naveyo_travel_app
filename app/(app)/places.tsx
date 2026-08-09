import { useEffect, useState } from 'react';
import { loadPlacesView, useNaveyoBootstrap } from '../../src/bootstrap';
import type { PlacesView } from '../../src/bootstrap';
import { SectionRoute } from './_components/SectionRoute';

export default function PlacesRoute() {
  const bootstrap = useNaveyoBootstrap();
  const [view, setView] = useState<PlacesView | null>(null);

  useEffect(() => {
    const tripId = bootstrap?.currentTripId;
    const stopId = bootstrap && tripId ? bootstrap.modules.trips.listStops(tripId).then((stops) => stops[0]?.id) : Promise.resolve(undefined);
    let active = true;
    void stopId.then((firstStopId) => {
      if (!bootstrap || !tripId || !firstStopId) return;
      return loadPlacesView(bootstrap, { tripId, stopId: firstStopId, query: '' });
    }).then((result) => {
      if (active && result) setView(result);
    });
    return () => {
      active = false;
    };
  }, [bootstrap]);

  const statusTitle = view ? `${view.candidates.length} candidat(s) · ${view.suggestions.length} suggestion(s)` : 'Aucun candidat chargé';
  const statusMessage = view
    ? `${view.stop.name} · ${view.suggestions.map((suggestion) => suggestion.title).join(' · ') || 'Aucune suggestion pour le moment'}`
    : 'Une Suggestion IA restera liée à un candidat retourné par le Module Lieux.';

  return <SectionRoute title="Lieux et Suggestions IA" subtitle="Des candidats réels, puis des brouillons à confirmer." statusTitle={statusTitle} statusMessage={statusMessage} action={{ label: 'Voir l’Itinéraire', route: '/(app)/itinerary' }} />;
}
