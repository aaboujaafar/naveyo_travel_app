import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { ItineraryItem, PlaceCandidate, Stop, UUID } from '../../../../../src/modules/_shared/model'
import { buildItineraryDays } from '../../../../../src/modules/itinerary'
import { InMemoryItineraryModule } from '../../../../../src/modules/itinerary/in-memory'
import { UnavailableMapAdapter, type MapModel } from '../../../../../src/adapters/map'
import { Badge, Button, Card, EmptyState, ShellFrame, StatusPanel } from '../../../../../src/ui'
import { colors } from '../../../../../src/theme/colors'
import { spacing } from '../../../../../src/theme/spacing'
import { typography } from '../../../../../src/theme/typography'

const demoStop: Stop = {
  id: '00000000-0000-4000-8000-000000000101' as UUID,
  tripId: '00000000-0000-4000-8000-000000000001' as UUID,
  name: 'Lisbonne',
  countryCode: 'PT',
  timeZone: 'Europe/Lisbon' as Stop['timeZone'],
  startDate: '2026-09-01',
  endDate: '2026-09-03',
}

const confirmedPlace: PlaceCandidate = {
  id: '00000000-0000-4000-8000-000000000201' as UUID,
  provider: 'manual',
  name: 'Torre de Belém',
  category: 'landmark',
  address: 'Av. Brasília, Lisboa',
  countryCode: 'PT',
  coordinates: { latitude: 38.6916, longitude: -9.216 },
}

const module = new InMemoryItineraryModule()
const mapAdapter = new UnavailableMapAdapter()

export default function ItineraryScreen() {
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>()
  const tripId = (rawTripId ?? demoStop.tripId) as UUID
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const days = useMemo(() => buildItineraryDays(items, [demoStop]), [items])
  const mapModel = useMemo<MapModel>(() => ({
    points: items.flatMap((item) => item.place?.coordinates ? [{
      id: item.id,
      label: item.place.label,
      coordinates: item.place.coordinates,
    }] : []),
  }), [items])
  const mapStatus = mapAdapter.status(mapModel)

  async function addPlace() {
    if (isAdding) return
    setIsAdding(true)
    try {
      const item = await module.addConfirmedPlace({
        tripId,
        stopId: demoStop.id,
        date: '2026-09-01',
        title: confirmedPlace.name,
        place: confirmedPlace,
        time: { local: '10:00', timeZone: demoStop.timeZone },
      })
      setItems((current) => [...current, item])
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <ShellFrame title="Itinéraire" subtitle={`${demoStop.name} · ${demoStop.timeZone}`}>
      <Card style={styles.mapCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Carte</Text>
          <Badge label={mapStatus === 'empty' ? 'Vide' : 'Fond indisponible'} variant="gold" />
        </View>
        <View style={styles.mapPlaceholder} accessibilityLabel={mapStatus === 'empty' ? 'Carte vide' : 'Carte sans tuiles disponibles'}>
          <Text style={styles.mapIcon}>⌖</Text>
          <Text style={styles.mapTitle}>
            {mapStatus === 'empty' ? 'Aucun lieu dans l’itinéraire' : 'Fond cartographique indisponible'}
          </Text>
          <Text style={styles.mapMessage}>
            {mapStatus === 'empty'
              ? 'Les lieux confirmés apparaîtront ici.'
              : `${mapModel.points.length} lieu${mapModel.points.length > 1 ? 'x' : ''} confirmé${mapModel.points.length > 1 ? 's' : ''} reste${mapModel.points.length > 1 ? 'nt' : ''} consultable${mapModel.points.length > 1 ? 's' : ''} sans fond de carte.`}
          </Text>
        </View>
      </Card>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Jours</Text>
        <Button size="sm" onPress={addPlace} loading={isAdding}>
          Ajouter un lieu
        </Button>
      </View>

      {days.map((day) => (
        <Card key={`${day.stop.id}-${day.date}`} style={styles.dayCard}>
          <Text style={styles.dayTitle}>{formatDate(day.date)}</Text>
          <Text style={styles.daySubtitle}>{day.stop.name} · {day.stop.timeZone}</Text>
          {day.items.length === 0 ? (
            <Text style={styles.emptyDay}>Aucun élément prévu</Text>
          ) : day.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.timelineDot} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>{item.time?.local ?? 'Sans heure'} · {item.place?.label ?? 'Lieu non précisé'}</Text>
              </View>
            </View>
          ))}
        </Card>
      ))}

      {items.length === 0 ? (
        <EmptyState title="Itinéraire vide" message="Ajoutez un lieu confirmé pour commencer votre journée." />
      ) : null}

      <StatusPanel
        kind="info"
        title="Modifications hors ligne désactivées"
        message="L’ajout d’un lieu nécessite une connexion et une confirmation humaine."
      />
    </ShellFrame>
  )
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`))
}

const styles = StyleSheet.create({
  mapCard: { padding: spacing.md, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.h3, color: colors.fg },
  mapPlaceholder: { minHeight: 180, borderRadius: 12, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.xs },
  mapIcon: { fontSize: 42, color: colors.teal },
  mapTitle: { ...typography.label, color: colors.fg, textAlign: 'center' },
  mapMessage: { ...typography.bodySmall, color: colors.muted, textAlign: 'center' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayCard: { padding: spacing.md, gap: spacing.sm },
  dayTitle: { ...typography.h3, color: colors.fg, textTransform: 'capitalize' },
  daySubtitle: { ...typography.caption, color: colors.muted },
  emptyDay: { ...typography.bodySmall, color: colors.muted, paddingVertical: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 5 },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { ...typography.label, color: colors.fg },
  itemMeta: { ...typography.caption, color: colors.muted },
})
