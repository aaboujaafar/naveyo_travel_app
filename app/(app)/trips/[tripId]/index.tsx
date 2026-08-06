import { useRouter, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Button, Card, EmptyState, ShellFrame, StatusPanel } from '../../../../src/ui'
import { useTripsModule } from '../../../../src/modules/trips'
import type { Stop, Trip } from '../../../../src/modules/_shared/model'

export default function TripDetailScreen() {
  const router = useRouter(); const { tripId } = useLocalSearchParams<{ tripId: string }>(); const trips = useTripsModule(); const [trip, setTrip] = useState<Trip | null>(null); const [stops, setStops] = useState<Stop[]>([]); const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!trips || !tripId) return; Promise.all([trips.get(tripId as Trip['id']), trips.listStops(tripId as Trip['id'])]).then(([nextTrip, nextStops]) => { setTrip(nextTrip); setStops(nextStops) }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Impossible de charger le Voyage')) }, [trips, tripId])
  return <ShellFrame title={trip?.name ?? 'Voyage'} subtitle="Étapes et membres" headerAction={<Button size="sm" onPress={() => router.push(`/(app)/trips/${tripId}/settings`)}>Réglages</Button>}>
    {!trips ? <StatusPanel kind="error" title="Module Trips absent" message="La composition Supabase doit être fournie au shell." /> : null}{error ? <StatusPanel kind="error" title="Chargement impossible" message={error} /> : null}
    {trip ? <StatusPanel kind="info" title={`${trip.members.length} membre(s)`} message={trip.members.map((member) => `${member.accountId} · ${member.role}`).join('\n')} /> : null}
    {stops.length === 0 ? <EmptyState title="Aucune Étape" message="Ajoutez les dates locales, le pays et le fuseau IANA de la prochaine Étape." actionLabel="Ajouter une Étape" onAction={() => router.push(`/(app)/trips/${tripId}/stops/new`)} /> : null}
    <View style={{ gap: 12 }}>{stops.map((stop) => <Card key={stop.id}><Text>{stop.name}</Text><Text>{stop.countryCode} · {stop.timeZone}</Text><Text>{stop.startDate} → {stop.endDate}</Text></Card>)}</View>
    {stops.length > 0 ? <Button fullWidth onPress={() => router.push(`/(app)/trips/${tripId}/stops/new`)}>Ajouter une Étape</Button> : null}
    {trip ? <Button fullWidth variant="secondary" onPress={() => router.push(`/(app)/trips/${tripId}/tracking`)}>Trace de trajet</Button> : null}
  </ShellFrame>
}
