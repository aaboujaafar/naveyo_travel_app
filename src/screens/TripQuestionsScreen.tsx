import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, radius, spacing } from "../theme";
import { AppText, Chip, Icon, IconButton, InlineMessage, Input } from "../ui";
import { SUGGESTED_QUESTIONS, type TripAnswer } from "./trip-questions-model";

export interface TripQuestionsScreenProps {
  tripName: string;
  /** True when the answers come from the last offline download. */
  offline: boolean;
  ready: boolean;
  error: string | null;
  onAsk: (question: string) => TripAnswer;
  onBack: () => void;
}

interface Exchange {
  id: number;
  question: string;
  answer: TripAnswer;
}

export function TripQuestionsScreen(props: TripQuestionsScreenProps) {
  const insets = useSafeAreaInsets();
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const scroll = useRef<ScrollView>(null);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !props.ready) return;
    setExchanges((current) => [...current, { id: current.length + 1, question: trimmed, answer: props.onAsk(trimmed) }]);
    setQuestion("");
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <IconButton icon={<Icon name="arrow-left" size={20} />} onPress={props.onBack} accessibilityLabel="Retour" />
        <View style={styles.flexOne}>
          <AppText variant="h2">Une question ?</AppText>
          <AppText variant="caption" color="muted">
            {props.offline ? `${props.tripName} · réponses du dernier téléchargement` : `${props.tripName} · programme, réservations, budget, bagages`}
          </AppText>
        </View>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {props.error ? <InlineMessage variant="error" title="Voyage indisponible" message={props.error} /> : null}
        {exchanges.length === 0 ? (
          <View style={styles.intro}>
            <View style={styles.introIcon}><Icon name="message-circle" size={24} color={colors.tealStrong} /></View>
            <AppText variant="label" align="center">Les réponses viennent du Voyage lui-même</AppText>
            <AppText variant="bodySmall" color="muted" align="center">Rien n’est inventé et tout marche sans réseau une fois le Voyage téléchargé.</AppText>
          </View>
        ) : null}
        {exchanges.map((exchange) => (
          <View key={exchange.id} style={styles.exchange}>
            <View style={styles.question}><AppText variant="bodySmall" color="onAccent">{exchange.question}</AppText></View>
            <View style={[styles.answer, exchange.answer.empty && styles.answerEmpty]}>
              <AppText variant="bodySmall">{exchange.answer.text}</AppText>
              {exchange.answer.details.map((line) => (
                exchange.answer.empty
                  ? <Pressable key={line} accessibilityRole="button" onPress={() => ask(line)}><AppText variant="caption" color="teal">{`› ${line}`}</AppText></Pressable>
                  : <AppText key={line} variant="caption" color="muted">{`• ${line}`}</AppText>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions} keyboardShouldPersistTaps="handled">
          {SUGGESTED_QUESTIONS.map((suggestion) => <Chip key={suggestion} label={suggestion} onPress={() => ask(suggestion)} />)}
        </ScrollView>
        <View style={styles.inputRow}>
          <Input
            value={question}
            onChangeText={setQuestion}
            placeholder="À quelle heure part le ferry ?"
            returnKeyType="send"
            onSubmitEditing={() => ask(question)}
            containerStyle={styles.flexOne}
          />
          <IconButton
            icon={<Icon name="arrow-right" size={20} color={colors.white} />}
            onPress={() => ask(question)}
            disabled={!question.trim() || !props.ready}
            accessibilityLabel="Envoyer la question"
            style={styles.send}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  content: { width: "100%", maxWidth: layout.maxMobileWidth, alignSelf: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  intro: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  introIcon: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  exchange: { gap: spacing.sm },
  question: { alignSelf: "flex-end", maxWidth: "85%", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.accentStrong },
  answer: { alignSelf: "flex-start", maxWidth: "92%", gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  answerEmpty: { backgroundColor: colors.tealSoft, borderColor: colors.tealSoft },
  composer: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg },
  suggestions: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  send: { backgroundColor: colors.accentStrong },
  flexOne: { flex: 1 },
});
