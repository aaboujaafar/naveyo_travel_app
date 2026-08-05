import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Button, Input, ShellFrame, StatusPanel } from '../../../../../src/ui'
import { useTripsModule } from '../../../../../src/modules/trips'

export default function TripSettingsScreen() {
  const router = useRouter(); const { tripId } = useLocalSearchParams<{ tripId: string }>(); const trips = useTripsModule(); const [accountId, setAccountId] = useState(''); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null)
  const addMember = async () => { if (!trips || !tripId) return; setError(null); setMessage(null); try { await trips.addMember(tripId as never, { accountId: accountId as never, role: 'editor' }); setMessage('Le compte a été ajouté comme éditeur.'); setAccountId('') } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Ajout impossible. Seul le propriétaire peut ajouter un membre.') } }
  return <ShellFrame title="Réglages du Voyage" subtitle="Le propriétaire peut ajouter le second Compte comme éditeur"><Input label="UUID du Compte à ajouter" value={accountId} onChangeText={setAccountId} autoCapitalize="none" placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" />{message ? <StatusPanel kind="info" title="Membre ajouté" message={message} /> : null}{error ? <StatusPanel kind="error" title="Ajout refusé" message={error} /> : null}<Button fullWidth disabled={!trips || accountId.length < 36} onPress={() => void addMember()}>Ajouter comme éditeur</Button><Button fullWidth variant="secondary" onPress={() => router.back()}>Retour au Voyage</Button></ShellFrame>
}
