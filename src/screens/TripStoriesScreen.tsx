import { forwardRef, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop as GradientStop } from "react-native-svg";
import { colors, layout, radius, spacing } from "../theme";
import { AppText, Button, Icon, InlineMessage, Skeleton } from "../ui";
import { projectTrace, type StoryPhoto, type StorySlide, type TracePoint } from "./trip-stories-model";

export type PhotoAccess = "unknown" | "granted" | "limited" | "denied";

export interface TripStoriesScreenProps {
  tripName: string;
  access: PhotoAccess;
  photos: StoryPhoto[];
  selectedIds: string[];
  slides: StorySlide[];
  trace: TracePoint[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  message: string | null;
  onBack: () => void;
  onRequestAccess: () => void;
  onToggle: (photoId: string) => void;
  /** Receives the mounted slide views, captured at 1080 × 1920. */
  onSave: (views: (View | null)[]) => Promise<void>;
  onShare: (view: View | null) => Promise<void>;
}

const MAX_PHOTOS = 10;

export function TripStoriesScreen(props: TripStoriesScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<"choose" | "preview">("choose");
  const [page, setPage] = useState(0);
  const slideRefs = useRef<(View | null)[]>([]);
  const previewWidth = Math.min(width - spacing.lg * 2, layout.maxMobileWidth - spacing.lg * 2) * 0.82;
  const thumb = (Math.min(width, layout.maxMobileWidth) - spacing.lg * 2 - spacing.sm * 2) / 3;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={step === "preview" ? () => setStep("choose") : props.onBack} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Icon name="arrow-left" size={20} />
        </Pressable>
        <View style={styles.flexOne}>
          <AppText variant="h2">Stories du Voyage</AppText>
          <AppText variant="caption" color="muted">{step === "choose" ? "1. Choisissez les photos" : "2. Enregistrez ou partagez"}</AppText>
        </View>
      </View>

      {props.error ? <View style={styles.message}><InlineMessage variant="error" title="Action impossible" message={props.error} /></View> : null}
      {props.message ? <View style={styles.message}><InlineMessage variant="success" title="C’est prêt" message={props.message} /></View> : null}

      {step === "choose" ? (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {props.access === "denied" || props.access === "unknown" ? (
              <View style={styles.permission}>
                <Icon name="image" size={32} color={colors.tealStrong} />
                <AppText variant="h3" align="center">Retrouver les photos du Voyage</AppText>
                <AppText variant="bodySmall" color="muted" align="center">
                  {props.access === "denied"
                    ? "L’accès aux photos est refusé. Autorisez-le dans Réglages › Naveyo › Photos."
                    : "Naveyo cherche les photos prises pendant le Voyage, près de votre tracé. Elles ne quittent pas l’iPhone."}
                </AppText>
                {props.access === "unknown" ? <Button onPress={props.onRequestAccess}>Autoriser l’accès aux photos</Button> : null}
              </View>
            ) : props.loading ? (
              <View style={styles.grid}>{Array.from({ length: 9 }, (_, index) => <Skeleton key={index} width={thumb} height={thumb} />)}</View>
            ) : props.photos.length === 0 ? (
              <InlineMessage
                title="Aucune photo trouvée"
                message={props.access === "limited"
                  ? "Seules les photos que vous avez partagées avec Naveyo sont visibles. Ajoutez celles du Voyage dans Réglages › Naveyo › Photos."
                  : "Aucune photo de la pellicule ne correspond aux dates et aux lieux du Voyage."}
              />
            ) : (
              <>
                <AppText variant="bodySmall" color="muted">
                  {`${props.photos.length} photo${props.photos.length > 1 ? "s" : ""} du Voyage. Les mieux réparties sont présélectionnées (${MAX_PHOTOS} au plus).`}
                </AppText>
                <View style={styles.grid}>
                  {props.photos.map((photo) => {
                    const index = props.selectedIds.indexOf(photo.id);
                    const selected = index >= 0;
                    const full = !selected && props.selectedIds.length >= MAX_PHOTOS;
                    return (
                      <Pressable
                        key={photo.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected, disabled: full }}
                        accessibilityLabel={`Photo du ${new Date(photo.takenAt).toLocaleDateString("fr-FR")}`}
                        disabled={full}
                        onPress={() => props.onToggle(photo.id)}
                        style={[styles.thumbWrap, { width: thumb, height: thumb }, full && styles.thumbDisabled]}
                      >
                        <Image source={{ uri: photo.uri }} style={styles.thumb} resizeMode="cover" />
                        <View style={[styles.check, selected && styles.checkOn]}>
                          {selected ? <AppText variant="badge" color="onAccent">{index + 1}</AppText> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <Button fullWidth disabled={props.selectedIds.length === 0} onPress={() => { setPage(0); setStep("preview"); }}>
              {props.selectedIds.length === 0 ? "Choisissez au moins une photo" : `Créer ${props.slides.length} stories`}
            </Button>
          </View>
        </>
      ) : (
        <>
          <ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={previewWidth + spacing.md}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewStrip}
            onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / (previewWidth + spacing.md)))}
          >
            {props.slides.map((slide, index) => (
              <StoryCanvas
                key={slide.kind === "photo" ? slide.photo.id : slide.kind}
                ref={(view) => { slideRefs.current[index] = view; }}
                slide={slide}
                trace={props.trace}
                width={previewWidth}
              />
            ))}
          </ScrollView>
          <AppText variant="caption" color="muted" align="center">{`${Math.min(page + 1, props.slides.length)} / ${props.slides.length}`}</AppText>
          <View style={[styles.footer, styles.footerRow, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <Button variant="secondary" style={styles.flexOne} disabled={props.busy} onPress={() => void props.onShare(slideRefs.current[page] ?? null)}>
              Partager
            </Button>
            <Button style={styles.flexOne} loading={props.busy} onPress={() => void props.onSave(slideRefs.current.slice(0, props.slides.length))}>
              Tout enregistrer
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

/** One story at any width, always 9:16; sizes scale with the width so the 1080 × 1920 capture looks the same. */
export const StoryCanvas = forwardRef<View, { slide: StorySlide; trace: TracePoint[]; width: number }>(function StoryCanvas({ slide, trace, width }, ref) {
  const height = (width * 16) / 9;
  const unit = width / 360;
  const traceBox = useMemo(() => {
    const size = slide.kind === "photo" ? { width: 120 * unit, height: 120 * unit, padding: 12 * unit } : { width, height: width * 1.1, padding: 36 * unit };
    return { ...size, ...projectTrace(trace, size) };
  }, [slide.kind, trace, unit, width]);
  const progressPoint = slide.kind === "photo" && trace.length > 0
    ? trace[Math.max(0, Math.min(trace.length - 1, Math.round(slide.traceProgress * (trace.length - 1))))]
    : undefined;
  const travelled = slide.kind === "photo" && trace.length > 1
    ? projectTrace(trace.slice(0, Math.max(2, Math.round(slide.traceProgress * trace.length))), traceBox).path
    : "";

  return (
    // The rounded corners belong to the preview frame only: the captured story stays a full rectangle.
    <View style={{ width, height, borderRadius: 16 * unit, overflow: "hidden" }}>
    <View ref={ref} collapsable={false} style={[styles.canvas, { width, height }]}>
      {slide.kind === "photo" ? (
        <>
          <Image source={{ uri: slide.photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
            <Defs>
              <LinearGradient id="photo-shade" x1="0" y1="0" x2="0" y2="1">
                <GradientStop offset="0.55" stopColor="#000" stopOpacity={0} />
                <GradientStop offset="1" stopColor="#000" stopOpacity={0.65} />
              </LinearGradient>
            </Defs>
            <Rect width={width} height={height} fill="url(#photo-shade)" />
          </Svg>
          {traceBox.path ? (
            <View style={[styles.miniTrace, { top: 20 * unit, right: 20 * unit, width: traceBox.width, height: traceBox.height, borderRadius: 14 * unit }]}>
              <Svg width={traceBox.width} height={traceBox.height}>
                <Path d={traceBox.path} stroke="rgba(255,255,255,0.45)" strokeWidth={3 * unit} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {travelled ? <Path d={travelled} stroke={colors.white} strokeWidth={3.5 * unit} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
                {progressPoint ? <Circle {...asCircle(traceBox.project(progressPoint))} r={5 * unit} fill={colors.accent} stroke={colors.white} strokeWidth={2 * unit} /> : null}
              </Svg>
            </View>
          ) : null}
          <View style={[styles.caption, { padding: 24 * unit }]}>
            <AppText variant="h2" color="onAccent" style={{ fontSize: 26 * unit, lineHeight: 32 * unit }}>{slide.caption}</AppText>
          </View>
        </>
      ) : (
        <>
          <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
            <Defs>
              <LinearGradient id="story-bg" x1="0" y1="0" x2="0" y2="1">
                <GradientStop offset="0" stopColor={colors.tealStrong} />
                <GradientStop offset="1" stopColor={colors.fg} />
              </LinearGradient>
            </Defs>
            <Rect width={width} height={height} fill="url(#story-bg)" />
          </Svg>
          {traceBox.path ? (
            <Svg width={traceBox.width} height={traceBox.height} style={{ marginTop: height * 0.12 }}>
              <Path d={traceBox.path} stroke={colors.white} strokeWidth={4 * unit} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {trace[0] ? <Circle {...asCircle(traceBox.project(trace[0]))} r={7 * unit} fill={colors.accent} stroke={colors.white} strokeWidth={2.5 * unit} /> : null}
              {trace.length > 1 ? <Circle {...asCircle(traceBox.project(trace[trace.length - 1]!))} r={7 * unit} fill={colors.white} /> : null}
            </Svg>
          ) : null}
          <View style={[styles.storyText, { padding: 28 * unit, gap: 8 * unit }]}>
            {slide.kind === "cover" ? (
              <>
                <AppText variant="badge" color="onAccent" style={{ fontSize: 12 * unit }}>CARNET DE VOYAGE</AppText>
                <AppText variant="h1" color="onAccent" style={{ fontSize: 40 * unit, lineHeight: 46 * unit }}>{slide.title}</AppText>
                <AppText variant="body" color="onAccent" style={{ fontSize: 16 * unit }}>{slide.subtitle}</AppText>
              </>
            ) : (
              <>
                <AppText variant="h1" color="onAccent" style={{ fontSize: 32 * unit, lineHeight: 38 * unit }}>{slide.title}</AppText>
                {slide.lines.map((line) => <AppText key={line} variant="body" color="onAccent" style={{ fontSize: 18 * unit, lineHeight: 26 * unit }}>{line}</AppText>)}
              </>
            )}
            <AppText variant="caption" color="onAccent" style={{ fontSize: 11 * unit, opacity: 0.7 }}>Naveyo</AppText>
          </View>
        </>
      )}
    </View>
    </View>
  );
});

function asCircle(point: { x: number; y: number }) {
  return { cx: point.x, cy: point.y };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  iconButton: { width: spacing["2xl"] - spacing.xs, height: spacing["2xl"] - spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  message: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing["2xl"] * 2, gap: spacing.md },
  permission: { alignItems: "center", gap: spacing.md, padding: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.tealSoft },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumbWrap: { borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.border },
  thumbDisabled: { opacity: 0.4 },
  thumb: { width: "100%", height: "100%" },
  check: { position: "absolute", top: spacing.xs, right: spacing.xs, width: 24, height: 24, borderRadius: radius.full, borderWidth: 2, borderColor: colors.white, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.accentStrong },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg },
  footerRow: { flexDirection: "row", gap: spacing.md },
  previewStrip: { paddingHorizontal: spacing.lg, gap: spacing.md, alignItems: "center", paddingVertical: spacing.md },
  canvas: { overflow: "hidden", backgroundColor: colors.fg, alignItems: "center" },
  miniTrace: { position: "absolute", backgroundColor: "rgba(0,0,0,0.35)" },
  caption: { position: "absolute", left: 0, right: 0, bottom: 0 },
  storyText: { position: "absolute", left: 0, right: 0, bottom: 0 },
  flexOne: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
});
