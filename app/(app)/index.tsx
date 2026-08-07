import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, CardHorizontal, Chip, EmptyState, ScreenNote, ShellFrame, ShellListPlaceholder, StatusPanel, useShellSession } from '../../src/ui';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function AppHomeScreen() {
  const router = useRouter();
  const { signOut } = useShellSession();

  return (
    <ShellFrame
      title="Tableau de bord"
      subtitle="Shell authentifié prêt à accueillir les modules métier."
      headerAction={<Badge label="Privé" variant="accent" />}
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Bienvenue dans Naveyo</Text>
        <Text style={styles.message}>
          Votre espace privé est connecté à Supabase.
        </Text>
      </View>

      <Button fullWidth onPress={() => router.push('/(app)/trips')}>Mes Voyages</Button>

      <StatusPanel
        kind="loading"
        title="Données privées"
        message="Les Voyages sont chargés depuis Supabase selon les politiques RLS."
      />

      <StatusPanel
        kind="error"
        title="État de synchronisation"
        message="Les modifications ordinaires nécessitent une connexion réseau."
        actionLabel="Réessayer"
        onAction={() => router.replace('/(app)')}
      />

      <StatusPanel
        kind="empty"
        title="Prêt pour votre premier Voyage"
        message="Créez un Voyage privé ou ouvrez-en un auquel vous appartenez."
        actionLabel="Mes Voyages"
        onAction={() => router.push('/(app)/trips')}
      />

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Composants partagés</Text>
          <Chip label="Accessible" active />
        </View>
        <CardHorizontal
          title="Formulaires"
          subtitle="Inputs, boutons et retours d’état cohérents."
          trailing={<Text style={styles.cardTrailing}>OK</Text>}
        />
      </Card>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={styles.metric}>0</Text>
          <Text style={styles.metricLabel}>Dépenses en attente</Text>
        </Card>
        <Card style={styles.gridCard}>
          <Text style={styles.metric}>2</Text>
          <Text style={styles.metricLabel}>Membres du voyage</Text>
        </Card>
      </View>

      <ShellListPlaceholder />

      <EmptyState
        title="Shell vide"
        message="L’espace est prêt pour les modules futurs."
        actionLabel="Se déconnecter"
        onAction={signOut}
      />

      <Button variant="secondary" onPress={signOut} fullWidth>
        Se déconnecter
      </Button>

      <ScreenNote>
        La vraie logique métier arrivera ensuite dans les modules dédiés, pas dans les routes.
      </ScreenNote>
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.fg,
  },
  message: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.label,
    color: colors.fg,
  },
  cardTrailing: {
    ...typography.label,
    color: colors.accent,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridCard: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  metric: {
    ...typography.h2,
    color: colors.fg,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.muted,
  },
});
