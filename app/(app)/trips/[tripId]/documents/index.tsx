import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useDocuments } from '../../../../../src/modules/documents'
import { useTripsModule } from '../../../../../src/modules/trips'
import type { TravelDocument, UUID } from '../../../../../src/modules/_shared/model'
import { Button, Card, EmptyState, ScreenNote, ShellFrame, StatusPanel } from '../../../../../src/ui'
import { colors } from '../../../../../src/theme/colors'
import { spacing } from '../../../../../src/theme/spacing'
import { typography } from '../../../../../src/theme/typography'

const fallbackTripId = '00000000-0000-4000-8000-000000000001' as UUID

export default function DocumentsScreen() {
  const params = useLocalSearchParams<{ tripId?: string; stopId?: string }>()
  const tripId = (typeof params.tripId === 'string' ? params.tripId : fallbackTripId) as UUID
  const initialStopId = typeof params.stopId === 'string' ? params.stopId as UUID : undefined
  const documents = useDocuments()
  const trips = useTripsModule()
  const [items, setItems] = useState<TravelDocument[]>([])
  const [stopId, setStopId] = useState<UUID | 'unclassified' | undefined>(initialStopId)
  const [stops, setStops] = useState<{ id: UUID; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadedId, setDownloadedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!documents) return
    setLoading(true)
    setError(null)
    try {
      setItems(stopId === 'unclassified' && documents.listUnclassified ? await documents.listUnclassified(tripId) : await documents.list(tripId, stopId === 'unclassified' ? undefined : stopId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les documents')
    } finally {
      setLoading(false)
    }
  }, [documents, stopId, tripId])

  useEffect(() => {
    if (!trips) return
    void trips.listStops(tripId).then((result) => setStops(result.map((item) => ({ id: item.id, name: item.name })))).catch(() => setStops([]))
  }, [trips, tripId])

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])

  const download = async (document: TravelDocument) => {
    if (!documents) return
    setError(null)
    try {
      await documents.download(tripId, document.id)
      setDownloadedId(document.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de télécharger le document')
    }
  }

  const assign = async (document: TravelDocument, nextStopId?: UUID) => {
    if (!documents?.assign) return
    setError(null)
    try {
      await documents.assign(tripId, document.id, nextStopId)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de déplacer le document')
    }
  }

  return (
    <ShellFrame title="Documents du Voyage" subtitle="Fichiers privés disponibles pour les membres autorisés.">
      {!documents ? <StatusPanel kind="error" title="Documents indisponibles" message="Le module Documents doit être composé avec l’adaptateur Supabase privé." /> : null}
      {loading ? <StatusPanel kind="loading" title="Chargement des documents" message="Lecture du catalogue privé en cours." /> : null}
      {error ? <StatusPanel kind="error" title="Action impossible" message={error} actionLabel="Réessayer" onAction={() => void refresh()} /> : null}
      {downloadedId ? <StatusPanel kind="info" title="Document téléchargé" message="Une copie persistante a été préparée sur l’appareil. Aucune URL publique n’est créée." /> : null}
      {documents && !loading && items.length === 0 && !error ? <EmptyState title="Aucun document" message="Les Documents de voyage importés apparaîtront ici." /> : null}
      {stops.length > 0 ? <View style={styles.filters}>
        <Button variant={stopId === undefined ? 'primary' : 'secondary'} onPress={() => setStopId(undefined)}>Toutes les Étapes</Button>
        <Button variant={stopId === 'unclassified' ? 'primary' : 'secondary'} onPress={() => setStopId('unclassified')}>Non classés</Button>
        {stops.map((stop) => <Button key={stop.id} variant={stopId === stop.id ? 'primary' : 'secondary'} onPress={() => setStopId(stop.id)}>{stop.name}</Button>)}
      </View> : null}
      <View style={styles.list}>
        {items.map((document) => (
          <Card key={document.id} style={styles.card}>
            <View style={styles.header}>
              <View style={styles.titleGroup}>
                <Text style={styles.title}>{document.fileName ?? 'Document sans nom'}</Text>
                <Text style={styles.meta}>{document.kind.toUpperCase()} · {formatSize(document.byteSize)}</Text>
              </View>
              <Text style={styles.privateLabel}>PRIVÉ</Text>
            </View>
            <Text style={styles.meta}>Ajouté le {formatDate(document.createdAt)}</Text>
            <Text style={styles.meta}>{document.stopId ? `Étape : ${stops.find((stop) => stop.id === document.stopId)?.name ?? 'inconnue'}` : 'Non classé'}</Text>
            {stops.length > 0 ? <View style={styles.moveActions}>
              <Button variant="secondary" onPress={() => void assign(document, undefined)}>Non classé</Button>
              {stops.map((stop) => <Button key={stop.id} variant="secondary" onPress={() => void assign(document, stop.id)}>{`→ ${stop.name}`}</Button>)}
            </View> : null}
            <Button variant="secondary" fullWidth onPress={() => void download(document)}>Télécharger sur l’iPhone</Button>
          </Card>
        ))}
      </View>
      <ScreenNote>Les documents sont filtrés par Voyage côté Supabase et servis depuis un bucket privé. Les membres extérieurs ne peuvent ni voir les métadonnées ni récupérer les fichiers.</ScreenNote>
    </ShellFrame>
  )
}

const formatSize = (bytes?: number): string => {
  if (bytes === undefined) return 'taille inconnue'
  if (bytes < 1024) return `${bytes} o`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

const formatDate = (value: string): string => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  moveActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  card: { gap: spacing.md, padding: spacing.lg },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  titleGroup: { flex: 1, gap: spacing.xs },
  title: { ...typography.h3, color: colors.fg },
  meta: { ...typography.bodySmall, color: colors.muted },
  privateLabel: { ...typography.caption, color: colors.teal },
})
