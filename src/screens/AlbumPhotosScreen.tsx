import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, radius, spacing } from "../theme";
import { AppText, Button, Chip, Icon, IconButton, InlineMessage, Skeleton } from "../ui";
import { SET_ASIDE_LABELS, type AlbumDay, type AlbumSelection } from "./album-photos-model";
import type { PhotoAccess } from "./TripStoriesScreen";

export interface AlbumPhotosScreenProps {
  tripName: string;
  access: PhotoAccess;
  /** Null while the library is being read. */
  selection: AlbumSelection | null;
  /** Photos read so far, to show progress on large libraries. */
  readCount: number;
  perDay: number;
  error: string | null;
  onAskAccess: () => void;
  onChangePerDay: (perDay: number) => void;
  onRemove: (photoId: string) => void;
  onAdd: (photoId: string) => void;
  onBack: () => void;
}

const PER_DAY_CHOICES = [4, 6, 8, 12];

export function AlbumPhotosScreen(props: AlbumPhotosScreenProps) {
  const insets = useSafeAreaInsets();
  const selected = props.selection?.days.reduce((sum, day) => sum + day.selected.length, 0) ?? 0;
  const read = props.selection?.days.reduce((sum, day) => sum + day.selected.length + day.setAside.length, 0) ?? 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon={<Icon name="arrow-left" size={20} />} onPress={props.onBack} accessibilityLabel="Retour" />
        <View style={styles.flexOne}>
          <AppText variant="h2">Album photo</AppText>
          <AppText variant="caption" color="muted">{`${props.tripName} · choix des photos`}</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {props.error ? <InlineMessage variant="error" title="Photos indisponibles" message={props.error} /> : null}

        {props.access === "unknown" ? (
          <View style={styles.card}>
            <AppText variant="label">Vos photos du voyage, déjà triées</AppText>
            <AppText variant="bodySmall" color="muted">
              Naveyo lit la pellicule sur l’iPhone, garde les photos prises pendant le Voyage, écarte captures d’écran et rafales, et en propose quelques-unes par jour. Rien n’est envoyé.
            </AppText>
            <Button fullWidth onPress={props.onAskAccess} icon={<Icon name="image" size={20} color={colors.white} />}>Autoriser l’accès aux photos</Button>
          </View>
        ) : null}
        {props.access === "denied" ? (
          <View style={styles.card}>
            <AppText variant="bodySmall" color="muted">L’accès aux photos est refusé. Autorisez-le dans Réglages › Naveyo › Photos.</AppText>
            <Button variant="secondary" fullWidth onPress={() => void Linking.openSettings()}>Ouvrir les Réglages</Button>
          </View>
        ) : null}
        {props.access === "limited" ? (
          <InlineMessage title="Accès limité" message="Seules les photos que vous avez partagées avec Naveyo sont triées. Choisissez « Accès complet » dans Réglages pour toute la pellicule." />
        ) : null}

        {(props.access === "granted" || props.access === "limited") && props.selection === null ? (
          <View style={styles.card}>
            <AppText variant="label">{props.readCount > 0 ? `Lecture de la pellicule… ${props.readCount} photos` : "Lecture de la pellicule…"}</AppText>
            <View style={styles.grid}>{[0, 1, 2].map((key) => <Skeleton key={key} height={96} width="31%" />)}</View>
          </View>
        ) : null}

        {props.selection ? (
          <>
            <View style={styles.summary}>
              <AppText variant="h3">{`${selected} photo${selected > 1 ? "s" : ""} retenue${selected > 1 ? "s" : ""}`}</AppText>
              <AppText variant="caption" color="muted">
                {`Parmi ${read} prise${read > 1 ? "s" : ""} pendant le Voyage. Touchez une photo pour la retirer, ou remettez une photo écartée.`}
              </AppText>
              <AppText variant="caption" color="muted">Photos par jour</AppText>
              <View style={styles.chips}>
                {PER_DAY_CHOICES.map((value) => <Chip key={value} label={`${value}`} active={props.perDay === value} onPress={() => props.onChangePerDay(value)} />)}
              </View>
            </View>
            {props.selection.days.length === 0 ? (
              <View style={styles.card}>
                <AppText variant="bodySmall" color="muted">Aucune photo prise pendant les dates du Voyage n’a été trouvée sur cet iPhone.</AppText>
              </View>
            ) : null}
            {props.selection.days.map((day) => <DaySection key={day.date} day={day} onRemove={props.onRemove} onAdd={props.onAdd} />)}
            <AppText variant="caption" color="muted" style={styles.footnote}>La mise en page de l’album arrive à l’étape suivante.</AppText>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DaySection({ day, onRemove, onAdd }: { day: AlbumDay; onRemove: (id: string) => void; onAdd: (id: string) => void }) {
  const [showSetAside, setShowSetAside] = useState(false);
  return (
    <View style={styles.day}>
      <View style={styles.dayHeader}>
        <View style={styles.flexOne}>
          <AppText variant="label">{`Jour ${day.dayNumber} · ${formatDay(day.date)}`}</AppText>
          <AppText variant="caption" color="muted">{day.stopName}</AppText>
        </View>
        <AppText variant="caption" color="teal">{`${day.selected.length} retenue${day.selected.length > 1 ? "s" : ""}`}</AppText>
      </View>
      <View style={styles.grid}>
        {day.selected.map((photo) => (
          <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel="Retirer cette photo de l’album" onPress={() => onRemove(photo.id)} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <Image source={{ uri: photo.uri }} style={styles.image} />
            <View style={styles.badge}><Icon name="check" size={14} color={colors.white} /></View>
          </Pressable>
        ))}
      </View>
      {day.setAside.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => setShowSetAside((current) => !current)} style={styles.toggle}>
          <AppText variant="caption" color="teal">{showSetAside ? "Masquer les photos écartées" : `Voir les ${day.setAside.length} photo${day.setAside.length > 1 ? "s" : ""} écartée${day.setAside.length > 1 ? "s" : ""}`}</AppText>
        </Pressable>
      ) : null}
      {showSetAside ? (
        <View style={styles.grid}>
          {day.setAside.map(({ photo, reason }) => (
            <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={`Remettre cette photo (${SET_ASIDE_LABELS[reason]})`} onPress={() => onAdd(photo.id)} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <Image source={{ uri: photo.uri }} style={[styles.image, styles.dimmed]} />
              <View style={styles.reason}><AppText variant="caption" color="onAccent" numberOfLines={2}>{SET_ASIDE_LABELS[reason]}</AppText></View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function formatDay(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(parsed);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingHorizontal: spacing.lg, gap: spacing.lg },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  summary: { gap: spacing.xs },
  chips: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  day: { gap: spacing.sm },
  dayHeader: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tile: { width: "32.4%", aspectRatio: 1, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.border },
  image: { width: "100%", height: "100%" },
  dimmed: { opacity: 0.55 },
  badge: { position: "absolute", top: spacing.xs, right: spacing.xs, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealStrong },
  reason: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xs, paddingVertical: 2, backgroundColor: "rgba(0,0,0,0.55)" },
  toggle: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  footnote: { textAlign: "center" },
  pressed: { opacity: 0.7 },
  flexOne: { flex: 1 },
});
