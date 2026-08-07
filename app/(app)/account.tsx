import { useRouter } from 'expo-router'
import { Button, Card, ShellFrame, StatusPanel, useShellSession } from '../../src/ui'

export default function AccountScreen() {
  const router = useRouter()
  const { account, signOut } = useShellSession()

  async function changeAccount() {
    await signOut()
    router.replace('/(auth)/sign-in')
  }

  return (
    <ShellFrame title="Compte" subtitle="Accès privé Naveyo">
      <Card>
        <StatusPanel
          kind="info"
          title="Compte connecté"
          message={account?.email || 'Adresse e-mail indisponible'}
        />
        <Button fullWidth onPress={() => void changeAccount()}>
          Changer de compte
        </Button>
      </Card>
      <Button variant="secondary" fullWidth onPress={() => router.back()}>
        Retour
      </Button>
    </ShellFrame>
  )
}
