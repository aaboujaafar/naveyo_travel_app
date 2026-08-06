import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Text } from 'react-native'
import type { TrackingStatus, UUID } from '../../../../../src/modules/_shared/model'
import { createExpoLocationTrackingModule } from '../../../../../src/adapters/expo-location'
import { Button, Card, ShellFrame, StatusPanel } from '../../../../../src/ui'

const tracking = createExpoLocationTrackingModule()

export default function TrackingScreen() {
  const { tripId: rawTripId } = useLocalSearchParams<{ tripId: string }>()
  const tripId = rawTripId as UUID
  const [status, setStatus] = useState<TrackingStatus>({ state: 'stopped' })
  const [pointCount, setPointCount] = useState(0)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!tripId) return
    setStatus(await tracking.tracker.getStatus())
    setPointCount((await tracking.list(tripId)).length)
  }, [tripId])

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), 0)
    return () => clearTimeout(timeout)
  }, [refresh])

  const message = useMemo(() => {
    if (status.state === 'recording') return 'Les points sont enregistrés localement sur cet iPhone.'
    if (status.state === 'error') return status.message ?? 'Le suivi n’a pas pu démarrer.'
    return 'Le suivi est arrêté. Le démarrage demande les autorisations de localisation iOS.'
  }, [status])

  async function toggleTracking() {
    if (!tripId || busy) return
    setBusy(true)
    try {
      setStatus(status.state === 'recording' ? await tracking.tracker.stop() : await tracking.tracker.start(tripId))
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ShellFrame title="Trace de trajet" subtitle="Un seul appareil enregistreur">
      <Card>
        <StatusPanel
          kind={status.state === 'error' ? 'error' : 'info'}
          title={status.state === 'recording' ? 'Enregistrement actif' : status.state === 'starting' ? 'Démarrage…' : 'Enregistrement arrêté'}
          message={message}
        />
        <Text accessibilityLabel={`${pointCount} points enregistrés`}>{pointCount} point(s) enregistré(s) sur cet appareil</Text>
        <Button fullWidth loading={busy} onPress={toggleTracking}>
          {status.state === 'recording' ? 'Arrêter la trace' : 'Démarrer la trace'}
        </Button>
      </Card>
      <StatusPanel kind="info" title="Limite de cette version" message="Les points restent locaux et seront synchronisés par l’intégration GPS. Un force-quit iOS peut interrompre le suivi en arrière-plan." />
    </ShellFrame>
  )
}
