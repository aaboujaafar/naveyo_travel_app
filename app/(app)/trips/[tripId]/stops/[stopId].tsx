import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useDocuments } from '../../../../../src/modules/documents'
import { useTripsModule } from '../../../../../src/modules/trips'
import type { Stop, TravelDocument, UUID } from '../../../../../src/modules/_shared/model'
import { Button, Card, EmptyState, ScreenNote, ShellFrame, StatusPanel } from '../../../../../src/ui'
import { colors } from '../../../../../src/theme/colors'
import { spacing } from '../../../../../src/theme/spacing'
import { typography } from '../../../../../src/theme/typography'

export default function StopDetailScreen() {
  const { tripId, stopId } = useLocalSearchParams<{ tripId: string; stopId: string }>()
  const trips = useTripsModule()
  const documents = useDocuments()
  const [stop, setStop] = useState<Stop | null>(null)
  const [items, setItems] = useState<TravelDocument[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!trips || !documents || !tripId || !stopId) return
    try {
      const [stops, documentsForStop] = await Promise.all([
        trips.listStops(tripId as UUID),
        documents.list(tripId as UUID, stopId as UUID),
      ])
      setStop(stops.find((candidate) => candidate.id === stopId) ?? null)
      setItems(documentsForStop)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger l’Étape')
    }
  }, [documents, stopId, tripId, trips])

  useEffect(() => { void Promise.resolve().then(refresh) }, [refresh])

  return (
    <ShellFrame title={stop?.name ?? 'Étape'} subtitle="Documents associés à cette Étape">
      {error ? <StatusPanel kind="error" title="Étape indisponible" message={error} actionLabel="Réessayer" onAction={() => void refresh()} /> : null}
      {!error && !stop ? <StatusPanel kind="loading" title="Chargement de l’Étape" message="Lecture du Voyage et de ses Documents." /> : null}
      {stop && items.length === 0 ? <EmptyState title="Aucun document associé" message="Les Documents peuvent rester Non classés ou être associés depuis le Module Documents." /> : null}
      <View style={styles.list}>
        {items.map((document) => <Card key={document.id} style={styles.card}>
          <Text style={styles.title}>{document.fileName ?? 'Document sans nom'}</Text>
          <Text style={styles.meta}>{document.kind.toUpperCase()} · {formatSize(document.byteSize)}</Text>
          <Text style={styles.meta}>Document privé disponible après téléchargement.</Text>
        </Card>)}
      </View>
      <ScreenNote>Supprimer l’Étape rend ses Documents Non classés sans supprimer leurs fichiers privés.</ScreenNote>
      <Button variant="secondary" fullWidth onPress={() => void refresh()}>Actualiser</Button>
    </ShellFrame>
  )
}

const formatSize = (bytes?: number): string => bytes === undefined ? 'taille inconnue' : bytes < 1024 ? `${bytes} o` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { gap: spacing.xs, padding: spacing.lg },
  title: { ...typography.h3, color: colors.fg },
  meta: { ...typography.bodySmall, color: colors.muted },
})
