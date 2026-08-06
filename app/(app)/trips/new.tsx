import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Button, Input, ShellFrame, StatusPanel } from '../../../src/ui'
import { useTripsModule } from '../../../src/modules/trips'
import type { Trip } from '../../../src/modules/_shared/model'

export default function NewTripScreen() {
  const router = useRouter(); const trips = useTripsModule(); const [name, setName] = useState(''); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false)
  const submit = async () => { if (!trips) return; setSaving(true); setError(null); try { const trip = await trips.create({ name, referenceCurrency: 'EUR' as Trip['referenceCurrency'] }); router.replace(`/(app)/trips/${trip.id}`) } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Impossible de créer le Voyage') } finally { setSaving(false) } }
  return <ShellFrame title="Nouveau Voyage" subtitle="Les mutations ordinaires sont désactivées hors ligne"><Input label="Nom du Voyage" value={name} onChangeText={setName} placeholder="Portugal 2026" /><StatusPanel kind="info" title="Devise de référence" message="EUR est la devise V0. Elle pourra être modifiée dans les réglages." />{error ? <StatusPanel kind="error" title="Création impossible" message={error} /> : null}<Button fullWidth loading={saving} disabled={!trips || !name.trim()} onPress={() => void submit()}>Créer le Voyage</Button><Button fullWidth variant="secondary" onPress={() => router.back()}>Annuler</Button></ShellFrame>
}
