import { useMemo, useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native'
import { Button, CardHorizontal, Input, ScreenNote, ShellFrame, StatusPanel } from '../../../src/ui'
import { colors } from '../../../src/theme/colors'
import { spacing } from '../../../src/theme/spacing'
import { typography } from '../../../src/theme/typography'
import { Places } from '../../../src/modules/places/module'
import type { PlaceCandidate, UUID } from '../../../src/modules/_shared/model'
import { assertStableId } from '../../../src/modules/_shared/validation'
import { createGeoapifyPlacesProvider } from '../../../src/adapters/geoapify'

const endpoint = process.env.EXPO_PUBLIC_SUPABASE_URL ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/places-search` : ''

export default function PlacesScreen() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceCandidate[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const module = useMemo(() => new Places(createGeoapifyPlacesProvider(endpoint, async () => null)), [])

  async function search() {
    if (query.trim().length < 2) return
    setState('loading')
    setMessage('')
    try {
      const tripId: UUID = assertStableId('10000000-0000-0000-0000-000000000001')
      setResults(await module.search({ query, countryCode: 'PT', type: 'venue', tripId }))
      setState('idle')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Recherche indisponible')
    }
  }

  function addManual() {
    Alert.prompt('Ajouter un lieu manuel', 'Saisissez son nom.', (name) => {
      if (!name?.trim()) return
      const place = module.createManual({ name, coordinates: { latitude: 38.7223, longitude: -9.1393 }, countryCode: 'PT' })
      setResults((current) => [place, ...current])
    })
  }

  return (
    <ShellFrame title="Lieux" subtitle="Rechercher un lieu autour d’une Étape et conserver sa source.">
      <View style={styles.search}>
        <Input label="Recherche" value={query} onChangeText={setQuery} placeholder="Café, aéroport, musée…" onSubmitEditing={search} />
        <Button onPress={search} loading={state === 'loading'} fullWidth>Rechercher</Button>
        <Button variant="secondary" onPress={addManual} fullWidth>Ajouter un lieu manuel</Button>
      </View>
      {state === 'error' ? <StatusPanel kind="error" title="Recherche indisponible" message={message} actionLabel="Réessayer" onAction={search} /> : null}
      {results.length === 0 && state === 'idle' ? <StatusPanel kind="empty" title="Aucun lieu" message="Les résultats confirmés pourront être ajoutés à l’itinéraire." /> : null}
      <FlatList
        data={results}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CardHorizontal title={item.name} subtitle={`${item.address ?? 'Adresse inconnue'}${item.category ? ` · ${item.category}` : ''}`} trailing={<Text style={styles.source}>{item.provider === 'manual' ? 'Manuel' : 'Geoapify'}</Text>} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <ScreenNote>Les résultats Geoapify sont interrogés par la fonction serveur. La clé fournisseur ne quitte jamais le serveur.</ScreenNote>
    </ShellFrame>
  )
}

const styles = StyleSheet.create({
  search: { gap: spacing.md },
  separator: { height: spacing.sm },
  source: { ...typography.caption, color: colors.muted },
})
